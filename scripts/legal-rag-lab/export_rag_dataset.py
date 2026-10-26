"""Export verified local XML evidence into a separate, immutable RAG dataset.

No network, corpus update, or applicability decision. The complete AST node is
the evidence; text and articleNums are search projections only.
"""
import argparse
import json
import re
from pathlib import Path

import egov_xml_lab as lab
import verify_experiment as verification


SCHEMA = "safe-ai-supplement-rag/v1"
OUTPUT_NAME = "rag-dataset-v1.json"
LAW_SHORTS = {
    "347AC0000000057": "安衛法",
    "347CO0000000318": "安衛令",
    "347M50002000032": "安衛則",
    "347M50002000034": "クレーン則",
    "347M50002000042": "酸欠則",
}
REFERENCE_SIGNALS = ("定義", "ただし", "準用", "読み替", "別表", "政令", "省令")
NUMBER = re.compile(r"[1-9][0-9]*(?:_[1-9][0-9]*)*")


def require(condition, message):
    if not condition:
        raise ValueError(message)


def search_text(node):
    """Ignore Ruby readings/comments only in the projection, never in the AST."""
    if lab.node_tag(node) in {"Rt", "#comment", "#processing-instruction"}:
        return ""
    parts = [node.text or ""]
    for child in node:
        parts.extend((search_text(child), child.tail or ""))
    return "".join(parts)


def compact_text(node):
    return re.sub(r"\s+", " ", search_text(node)).strip()


def article_numbers(raw):
    """A deleted range remains one source node, with several search locators."""
    require(isinstance(raw, str) and raw, "Article is missing Num")
    ends = raw.split(":")
    require(len(ends) <= 2 and all(NUMBER.fullmatch(end) for end in ends),
            f"unsupported Article Num: {raw}")
    start = [int(part) for part in ends[0].split("_")]
    values = [start]
    if len(ends) == 2:
        finish = [int(part) for part in ends[1].split("_")]
        require(len(start) == len(finish) and start[:-1] == finish[:-1]
                and start[-1] <= finish[-1] and finish[-1] - start[-1] < 10000,
                f"unsupported Article range: {raw}")
        values = [start[:-1] + [number] for number in range(start[-1], finish[-1] + 1)]
    return [f"第{parts[0]}条" + "".join(f"の{part}" for part in parts[1:]) for parts in values]


def required_title(node, tag):
    titles = node.findall(tag)
    require(len(titles) == 1 and compact_text(titles[0]), f"missing or ambiguous {tag}")
    return compact_text(titles[0])


def documents_for_law(root, law_id, revision):
    require(law_id in LAW_SHORTS and lab.REVISIONS.get(law_id) == revision,
            "law/revision outside the reviewed experiment")
    require(root.tag == "Law", "missing Law root")
    bodies = root.findall("LawBody")
    require(len(bodies) == 1, "missing or ambiguous LawBody")
    body = bodies[0]
    require(len(body.findall("MainProvision")) == 1, "missing or ambiguous MainProvision")
    indexed = lab.indexed_nodes(root)
    paths = {id(node): path for node, path, _ in indexed}
    documents, covered_articles = [], set()
    supplement_number = 0

    def append(node, kind, label):
        path = paths[id(node)]
        text = compact_text(node)
        require(text, f"empty search projection: {path}")
        numbers = []
        for article in node.iter("Article"):
            require(id(article) not in covered_articles, f"Article occurs in overlapping documents: {path}")
            covered_articles.add(id(article))
            numbers.extend(article_numbers(article.get("Num")))
        tags = {lab.node_tag(child) for child in node.iter()}
        documents.append({
            "id": f"{revision}:{path}", "lawId": law_id, "kind": kind,
            "path": path, "label": label, "text": text,
            "articleNums": list(dict.fromkeys(numbers)),
            "hasFigures": "Fig" in tags, "hasTables": "Table" in tags,
            "referenceSignals": [signal for signal in REFERENCE_SIGNALS if signal in text],
            "node": lab.node_tree(node),
        })

    for section in body:
        tag = lab.node_tag(section)
        if tag == "MainProvision":
            articles = list(section.iter("Article"))
            require(articles, "MainProvision contains no Articles")
            for article in articles:
                append(article, "main", required_title(article, "ArticleTitle"))
        elif tag == "SupplProvision":
            supplement_number += 1
            label = required_title(section, "SupplProvisionLabel")
            amendment = section.get("AmendLawNum")
            require(amendment is None or amendment.strip(), "empty AmendLawNum")
            label += f"（ブロック{supplement_number}"
            if amendment is not None:
                label += f"・{amendment}"
            append(section, "supplementary", label + "）")
        elif isinstance(tag, str) and tag.startswith("Appdx") and not tag.endswith(("Title", "Label")):
            title_tag = "ArithFormulaNum" if tag == "Appdx" else f"{tag}Title"
            label = required_title(section, title_tag)
            for related in section.findall("RelatedArticleNum"):
                require(compact_text(related), "empty RelatedArticleNum")
                label += " " + compact_text(related)
            append(section, "appendix", label)
        elif tag not in {"LawTitle", "TOC", "EnactStatement", "#comment", "#processing-instruction"}:
            raise ValueError(f"unclassified LawBody child: {tag}")

    all_articles = {id(node) for node in body.iter("Article")}
    require(covered_articles == all_articles, "some Article nodes are outside the exported documents")
    require(len({document["id"] for document in documents}) == len(documents), "duplicate document identity")
    return documents


def export_dataset(folder):
    target = lab.experiment_target(folder)
    # This checks the downloaded bytes, raw XML, per-law manifests, complete
    # saved trees/indexes, and the existing five-law preservation acceptance set.
    report = verification.verify(target)
    require(report["requested_asof"] == lab.ASOF and report["law_count"] == len(LAW_SHORTS),
            "verification report scope mismatch")
    verified = report["laws"]
    require(len(verified) == len(LAW_SHORTS) and
            {entry["law_id"] for entry in verified} == set(LAW_SHORTS), "verification law set mismatch")
    aggregate = json.loads((target / "manifest.json").read_bytes())
    require(aggregate["asof"] == lab.ASOF, "aggregate manifest asof mismatch")
    manifests, laws, documents = [], [], []

    for entry in verified:
        law_id = entry["law_id"]
        law_folder = lab.experiment_target(target, law_id)
        manifest = json.loads((law_folder / "manifest.json").read_bytes())
        manifests.append(manifest)
        encoded = (law_folder / "structure.json").read_bytes()
        require(lab.digest(encoded) == entry["structured_sha256"], "structure changed after verification")
        saved = json.loads(encoded)
        require(saved["schema"] == "egov-xml-lab/v1" and saved["applicability"] == "not-evaluated",
                "unsupported structure contract")
        revision = entry["revision_id"]
        require(saved["revision_id"] == revision == lab.REVISIONS[law_id], "structure revision mismatch")
        root = lab.rebuild(saved["tree"])
        title = required_title(root.find("LawBody"), "LawTitle") if root.find("LawBody") is not None else None
        require(title and entry["title"] == title == manifest["law_title"], "law title mismatch")
        require(manifest["law_id"] == law_id and manifest["revision_id"] == revision
                and manifest["requested_asof"] == lab.ASOF, "manifest identity mismatch")
        for key in ("retrieved_at", "source_url", "response_sha256", "xml_sha256", "structured_sha256"):
            require(manifest[key] == entry[key], f"manifest {key} mismatch")
        require(entry["source_url"] == lab.endpoint(law_id), "source URL outside the retrieval contract")
        laws.append({
            "lawId": law_id, "lawShort": LAW_SHORTS[law_id], "title": title,
            "revisionId": revision, "retrievedAt": entry["retrieved_at"],
            "sourceUrl": entry["source_url"], "xmlSha256": entry["xml_sha256"],
        })
        documents.extend(documents_for_law(root, law_id, revision))

    require(aggregate["laws"] == manifests, "aggregate/per-law manifest mismatch")
    dataset = {"schema": SCHEMA, "asOf": lab.ASOF, "laws": laws, "documents": documents}
    output = target / OUTPUT_NAME
    lab.save_once(output, lab.json_bytes(dataset))
    return {"output": str(output), "laws": len(laws), "documents": len(documents),
            "network": False, "applicability": "not-evaluated"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("folder", type=Path)
    args = parser.parse_args()
    print(json.dumps(export_dataset(args.folder), ensure_ascii=False))
