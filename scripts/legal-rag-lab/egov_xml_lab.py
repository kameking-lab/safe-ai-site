"""Finite, read-only e-Gov experiment. Never imports or writes the site corpus."""
import argparse
import base64
import collections
import datetime
import hashlib
import json
from pathlib import Path
import urllib.request
import xml.etree.ElementTree as ET

ASOF = "2026-10-26"
REVISIONS = {
    "347AC0000000057": "347AC0000000057_20261001_507AC0000000033",
    "347CO0000000318": "347CO0000000318_20261001_508CO0000000196",
    "347M50002000032": "347M50002000032_20261001_508M60000100116",
    "347M50002000034": "347M50002000034_20260401_508M60000100003",
    "347M50002000042": "347M50002000042_20260401_508M60000100003",
}
MAX_RESPONSE = 32 * 1024 * 1024
EXPERIMENT_ROOT = Path(__file__).resolve().parents[2].parent / f"legal-rag-lab-{ASOF}"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def save_once(path, data):
    if path.resolve() != path.absolute():
        raise ValueError(f"refusing a redirected output path: {path}")
    if path.exists():
        if path.read_bytes() != data:
            raise ValueError(f"refusing to overwrite a different file: {path}")
        return
    with path.open("xb") as stream:
        stream.write(data)


def endpoint(law_id):
    if law_id not in REVISIONS:
        raise ValueError("law outside the five-law experiment")
    return (f"https://laws.e-gov.go.jp/api/2/law_data/{law_id}?asof={ASOF}"
            "&response_format=json&law_full_text_format=xml&omit_amendment_suppl_provision=false")


def experiment_target(folder, law_id=None):
    expected = EXPERIMENT_ROOT
    if folder.resolve() != expected or expected.resolve() != expected:
        raise ValueError("output must be the dedicated sibling experiment folder, without redirection")
    if law_id is not None and law_id not in REVISIONS:
        raise ValueError("law outside the five-law experiment")
    target = expected / law_id if law_id else expected
    if target.resolve() != target:
        raise ValueError("redirected experiment law folder")
    return target


def checked_payload(data, law_id):
    if len(data) > MAX_RESPONSE:
        raise ValueError("response exceeds experiment limit")
    payload = json.loads(data)
    if payload["law_info"]["law_id"] != law_id:
        raise ValueError("response law identity mismatch")
    if payload["revision_info"]["law_revision_id"] != REVISIONS[law_id]:
        raise ValueError("response differs from the reviewed as-of revision")
    return payload


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, newurl):
        raise ValueError("unexpected API redirect")


def open_response(request):
    return urllib.request.build_opener(NoRedirect()).open(request, timeout=60)


def fetch_one(folder, law_id):
    """One bounded GET per missing law; an existing evidence pair is verified/reused."""
    target = experiment_target(folder, law_id)
    target.mkdir(parents=True, exist_ok=True)
    raw_path, meta_path = target / "response.json", target / "retrieval.json"
    if raw_path.exists() or meta_path.exists():
        verify_retrieval(target, law_id)
        return
    url = endpoint(law_id)
    request = urllib.request.Request(url, headers={
        "Accept": "application/json", "User-Agent": "safe-ai-local-evidence-validation/1.0",
    })
    with open_response(request) as response:
        if response.geturl() != url:
            raise ValueError("unexpected API redirect")
        data = response.read(MAX_RESPONSE + 1)
        content_type = response.headers.get("Content-Type")
    payload = checked_payload(data, law_id)
    metadata = {
        "law_id": law_id, "requested_asof": ASOF, "requested_url": url,
        "retrieved_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "response_sha256": digest(data), "response_bytes": len(data),
        "content_type": content_type, "law_info": payload["law_info"],
        "revision_info": payload["revision_info"],
    }
    # A partial write is reported on the next run, never silently re-downloaded.
    save_once(raw_path, data)
    save_once(meta_path, json_bytes(metadata))


def verify_retrieval(target, law_id):
    data = (target / "response.json").read_bytes()
    metadata = json.loads((target / "retrieval.json").read_bytes())
    payload = checked_payload(data, law_id)
    if (metadata["law_id"] != law_id or metadata["requested_asof"] != ASOF
            or metadata["requested_url"] != endpoint(law_id)
            or metadata["response_sha256"] != digest(data)
            or metadata["response_bytes"] != len(data)
            or metadata["law_info"] != payload["law_info"]
            or metadata["revision_info"] != payload["revision_info"]):
        raise ValueError("retrieval metadata or response integrity mismatch")
    acquired = datetime.datetime.fromisoformat(metadata["retrieved_at"])
    if acquired.tzinfo is None:
        raise ValueError("retrieval time must include timezone")
    return payload, metadata


def decode_xml(payload):
    encoded = payload["law_full_text"]
    if not isinstance(encoded, str):
        raise ValueError("expected the official Base64 XML response")
    raw = base64.b64decode(encoded, validate=True)
    text = raw.decode("utf-8-sig")
    if "<!DOCTYPE" in text.upper() or "<!ENTITY" in text.upper():
        raise ValueError("DTD/entities are not accepted by this offline experiment")
    parser = ET.XMLParser(target=ET.TreeBuilder(insert_comments=True, insert_pis=True))
    root = ET.fromstring(raw, parser=parser)
    if root.tag != "Law":
        raise ValueError("missing Law XML root")
    return raw, root


def node_tag(node):
    if node.tag is ET.Comment:
        return "#comment"
    if node.tag is ET.ProcessingInstruction:
        return "#processing-instruction"
    return node.tag


def node_tree(node):
    return {"tag": node_tag(node), "attributes": dict(node.attrib),
            "text": node.text, "tail": node.tail,
            "children": [node_tree(child) for child in node]}


def rebuild(node):
    tag = {"#comment": ET.Comment, "#processing-instruction": ET.ProcessingInstruction}.get(node["tag"], node["tag"])
    result = ET.Element(tag, node["attributes"])
    result.text, result.tail = node["text"], node["tail"]
    result.extend(rebuild(child) for child in node["children"])
    return result


def indexed_nodes(root):
    def walk(node, path, scope, depth):
        if depth > 200:
            raise ValueError("XML nesting exceeds experiment limit")
        tag = node_tag(node)
        if tag == "SupplProvision":
            scope = "supplementary"
        elif isinstance(tag, str) and (tag.startswith("Appdx") or tag.startswith("SupplProvisionAppdx")):
            scope = "appendix"
        elif tag == "MainProvision":
            scope = "main"
        yield node, path, scope
        counts = collections.Counter()
        for child in node:
            child_tag = node_tag(child)
            counts[child_tag] += 1
            yield from walk(child, f"{path}/{child_tag}[{counts[child_tag]}]", scope, depth + 1)
    return list(walk(root, "/Law[1]", "metadata", 0))


def structure(root, revision):
    indexed = indexed_nodes(root)
    if len(indexed) > 200000:
        raise ValueError("XML node count exceeds experiment limit")
    tree = node_tree(root)
    if ET.tostring(root) != ET.tostring(rebuild(tree)):
        raise ValueError("XML structure/text round-trip failed")
    paths = {id(node): path for node, path, _ in indexed}
    units, sections, tables = [], [], []
    counts = collections.Counter(node_tag(node) for node, _, _ in indexed)
    for node, path, scope in indexed:
        tag = node_tag(node)
        if tag == "SupplProvision" or (isinstance(tag, str) and (tag.startswith("Appdx") or tag.startswith("SupplProvisionAppdx"))):
            # Index the actual section roots, not their title/label children.
            if not tag.endswith(("Title", "Label")):
                sections.append({"path": path, "tag": tag, "attributes": dict(node.attrib)})
        if tag in {"Article", "Paragraph", "Item"} or (isinstance(tag, str) and tag.startswith("Subitem") and tag[7:].isdigit()):
            units.append({"id": f"{revision}:{path}", "path": path,
                          "scope": scope, "tag": tag, "num": node.get("Num"),
                          "attributes": dict(node.attrib)})
        if tag == "Table":
            rows = []
            for row in node:
                if row.tag in {"TableRow", "TableHeaderRow"}:
                    rows.append({"path": paths[id(row)], "tag": row.tag,
                                 "cells": [{"path": paths[id(cell)], "tag": cell.tag,
                                            "attributes": dict(cell.attrib)} for cell in row]})
            tables.append({"path": path, "attributes": dict(node.attrib), "rows": rows})
    return {"schema": "egov-xml-lab/v1", "revision_id": revision,
            "applicability": "not-evaluated", "tree": tree,
            "section_index": sections, "unit_index": units, "table_index": tables,
            "tag_counts": dict(sorted(counts.items())), "round_trip_structure_text": True}


def process_one(folder, law_id):
    target = experiment_target(folder, law_id)
    payload, retrieval = verify_retrieval(target, law_id)
    xml, root = decode_xml(payload)
    if root.findtext("LawNum") != payload["law_info"]["law_num"]:
        raise ValueError("XML law number differs from response identity")
    if root.findtext("LawBody/LawTitle") != payload["revision_info"]["law_title"]:
        raise ValueError("XML law title differs from response identity")
    structured = structure(root, REVISIONS[law_id])
    encoded = json_bytes(structured)
    result = {
        "law_id": law_id, "law_title": payload["revision_info"]["law_title"],
        "requested_asof": ASOF, "revision_id": REVISIONS[law_id],
        "retrieved_at": retrieval["retrieved_at"], "source_url": retrieval["requested_url"],
        "response_sha256": retrieval["response_sha256"],
        "xml_sha256": digest(xml), "xml_bytes": len(xml),
        "structured_sha256": digest(encoded), "structured_bytes": len(encoded),
        "tag_counts": structured["tag_counts"],
        "round_trip_structure_text": True,
        "applicability": "not-evaluated",
        "attachments": {"fetched": False, "api_info": payload.get("attached_files_info")},
    }
    save_once(target / "source.xml", xml)
    save_once(target / "structure.json", encoded)
    save_once(target / "manifest.json", json_bytes(result))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["fetch", "structure"])
    parser.add_argument("folder", type=Path)
    args = parser.parse_args()
    experiment_target(args.folder)
    if args.mode == "fetch":
        for law_id in REVISIONS:
            fetch_one(args.folder, law_id)
            print(f"verified retrieval {law_id}", flush=True)
    else:
        results = []
        for law_id in REVISIONS:
            result = process_one(args.folder, law_id)
            results.append(result)
            print(f"structured {law_id}: {result['xml_bytes']} XML bytes", flush=True)
        save_once(args.folder / "manifest.json", json_bytes({"asof": ASOF, "laws": results}))


if __name__ == "__main__":
    main()
