"""Offline acceptance checks against the five downloaded official documents."""
import argparse
import collections
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

import egov_xml_lab as lab


def require(condition, message):
    if not condition:
        raise ValueError(message)


def verify_units(root, units, revision):
    unit_tags = {"Article", "Paragraph", "Item"}
    expected = {id(node) for node in root.iter() if node.tag in unit_tags or
                (isinstance(node.tag, str) and re.fullmatch(r"Subitem\d+", node.tag))}
    require(len(units) == len(expected), "unit index count mismatch")
    resolved_nodes = set()
    for unit in units:
        parts = unit["path"].split("/")[1:]
        require(parts[0] == "Law[1]", "unit path must start at Law")
        node, scope = root, "metadata"
        for part in parts[1:]:
            match = re.fullmatch(r"([A-Za-z0-9]+)\[([1-9][0-9]*)\]", part)
            require(match is not None, "invalid unit path segment")
            tag, position = match.group(1), int(match.group(2))
            children = [child for child in node if child.tag == tag]
            require(position <= len(children), "unit path does not exist")
            node = children[position - 1]
            if tag == "MainProvision":
                scope = "main"
            elif tag == "SupplProvision":
                scope = "supplementary"
            elif tag.startswith(("Appdx", "SupplProvisionAppdx")):
                scope = "appendix"
        require(id(node) in expected, "unit points to a non-unit node")
        require(id(node) not in resolved_nodes, "duplicate resolved unit")
        resolved_nodes.add(id(node))
        require(unit["id"] == revision + ":" + unit["path"], "unit identity mismatch")
        require(unit["tag"] == node.tag and unit["num"] == node.get("Num") and
                unit["attributes"] == dict(node.attrib) and unit["scope"] == scope, "unit locator metadata mismatch")


def verify(folder):
    results, roots = [], {}
    for law_id, revision in lab.REVISIONS.items():
        target = lab.experiment_target(folder, law_id)
        payload, retrieval = lab.verify_retrieval(target, law_id)
        xml, root = lab.decode_xml(payload)
        encoded = (target / "structure.json").read_bytes()
        saved = json.loads(encoded)
        manifest = json.loads((target / "manifest.json").read_bytes())
        require((target / "source.xml").read_bytes() == xml, "raw XML differs from decoded response")
        require(manifest["xml_sha256"] == lab.digest(xml), "XML hash mismatch")
        require(manifest["structured_sha256"] == lab.digest(encoded), "structured hash mismatch")
        require(manifest["response_sha256"] == retrieval["response_sha256"], "response hash mismatch")
        require(saved["revision_id"] == revision, "structure revision mismatch")
        require(saved["applicability"] == "not-evaluated", "unexpected legal applicability claim")
        require(ET.tostring(lab.rebuild(saved["tree"])) == ET.tostring(root), "saved tree lost XML structure/text")
        counts = collections.Counter(lab.node_tag(node) for node in root.iter())
        require(dict(counts) == saved["tag_counts"], "tag count mismatch")
        ids = [unit["id"] for unit in saved["unit_index"]]
        require(len(ids) == len(set(ids)), "duplicate unit identity")
        require(all(identity.startswith(revision + ":") for identity in ids), "unit without revision identity")
        verify_units(root, saved["unit_index"], revision)
        require(len(saved["table_index"]) == counts["Table"], "missing indexed table")
        require(sum(len(table["rows"]) for table in saved["table_index"]) == counts["TableRow"] + counts["TableHeaderRow"], "missing table row")
        require(sum(len(row["cells"]) for table in saved["table_index"] for row in table["rows"]) == counts["TableColumn"] + counts["TableHeaderColumn"], "missing table cell")
        require(sum(section["tag"] == "SupplProvision" for section in saved["section_index"]) == counts["SupplProvision"], "missing supplementary section")
        require(sum(section["tag"] == "AppdxTable" for section in saved["section_index"]) == counts["AppdxTable"], "missing appendix table")
        roots[law_id] = root
        results.append({"law_id": law_id, "title": manifest["law_title"], "revision_id": revision,
                        "retrieved_at": retrieval["retrieved_at"], "source_url": retrieval["requested_url"],
                        "response_sha256": retrieval["response_sha256"], "xml_sha256": manifest["xml_sha256"],
                        "structured_sha256": manifest["structured_sha256"], "xml_bytes": len(xml),
                        "supplementary_sections": counts["SupplProvision"], "appendix_tables": counts["AppdxTable"],
                        "tables": counts["Table"], "table_rows": counts["TableRow"] + counts["TableHeaderRow"],
                        "figures_referenced_not_downloaded": counts["Fig"], "round_trip_passed": True})

    proofs = []

    def proof(law_id, selector, tokens, purpose):
        node = roots[law_id].find(selector)
        require(node is not None, f"missing acceptance provision {law_id}:{selector}")
        text = "".join(node.itertext())
        require(all(token in text for token in tokens), f"missing literal source text in {purpose}")
        path = next(path for candidate, path, _ in lab.indexed_nodes(roots[law_id]) if candidate is node)
        proofs.append({"purpose": purpose, "law_id": law_id, "revision_id": lab.REVISIONS[law_id],
                       "path": path, "xml_subtree_sha256": lab.digest(ET.tostring(node)),
                       "literal_checks": tokens, "status": "source-preservation-only"})

    act, order, crane, oxygen = "347AC0000000057", "347CO0000000318", "347M50002000034", "347M50002000042"
    proof(act, ".//MainProvision//Article[@Num='61']", ["就業制限"], "slinging-act")
    proof(order, ".//MainProvision//Article[@Num='20']//Item[@Num='16']", ["一トン以上", "つり上げ荷重", "玉掛け"], "slinging-order-item16")
    proof(crane, ".//MainProvision//Article[@Num='221']", ["令第二十条第十六号", "技能講習"], "slinging-qualified-work")
    proof(crane, ".//MainProvision//Article[@Num='222']", ["つり上げ荷重が一トン未満", "特別の教育"], "slinging-special-education")
    proof(crane, ".//MainProvision//Article[@Num='2']//Item[@Num='1']", ["つり上げ荷重が〇・五トン未満"], "capacity-boundary-not-actual-load")
    proof(act, ".//MainProvision//Article[@Num='14']", ["作業主任者"], "oxygen-act")
    proof(order, ".//MainProvision//Article[@Num='6']//Item[@Num='21']", ["別表第六", "酸素欠乏危険場所"], "oxygen-order-item21")
    proof(oxygen, ".//MainProvision//Article[@Num='2']", ["十八パーセント未満"], "oxygen-definition")
    proof(oxygen, ".//MainProvision//Article[@Num='11']", ["第一種", "第二種", "作業主任者"], "oxygen-supervisor")
    proof(crane, ".//MainProvision//Article[@Num='91']", ["第五十六条", "準用", "所轄都道府県労働局長", "所轄労働基準監督署長", "読み替える"], "mutatis-mutandis-substitution-preserved")
    annexes = {node.findtext("AppdxTableTitle"): node for node in roots[order].findall("./LawBody/AppdxTable")}
    require("別表第六" in annexes and "別表第六の二" in annexes, "annex 6 and 6-2 must be distinct")
    require("酸素欠乏危険場所" in "".join(annexes["別表第六"].itertext()), "wrong annex 6")
    require("有機溶剤" in "".join(annexes["別表第六の二"].itertext()), "wrong annex 6-2")
    require(annexes["別表第六"] is not annexes["別表第六の二"], "annex identity conflation")
    proofs.append({"purpose": "oxygen-annex6-distinct-from-solvents-annex6-2", "law_id": order,
                   "status": "source-preservation-only", "title_based_lookup": True,
                   "note": "Actual API AppdxTable nodes have no Num attribute; titles and structural paths are retained."})
    return {"requested_asof": lab.ASOF, "law_count": len(results), "laws": results,
            "acceptance_proofs": proofs, "network_during_verification": False,
            "legal_applicability_evaluated": False, "production_data_changed": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("folder", type=Path)
    parser.add_argument("--report", type=Path, help="write UTF-8 bytes without shell pipe recoding")
    args = parser.parse_args()
    result = lab.json_bytes(verify(args.folder))
    if args.report:
        lab.save_once(args.report, result)
    else:
        print(result.decode("utf-8"))
