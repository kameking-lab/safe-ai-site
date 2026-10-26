import base64
import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import MagicMock, patch
import xml.etree.ElementTree as ET

import egov_xml_lab as lab
from verify_experiment import verify_units


# Synthetic syntax fixtures only; these are not representations of actual law.
XML = '''<?xml version="1.0" encoding="UTF-8"?>
<Law Era="Showa" Year="47"><LawNum>検証用</LawNum><LawBody><LawTitle>構造試験</LawTitle>
<MainProvision><Article Num="1"><ArticleTitle>第一条</ArticleTitle><Paragraph Num="1">
<ParagraphSentence><Sentence Num="1">前文<Ruby>漢<Rt>かん</Rt></Ruby>の続き。ただし、例外。</Sentence></ParagraphSentence>
<Item Num="1"><ItemTitle>一</ItemTitle><ItemSentence><Sentence>定義</Sentence></ItemSentence>
<Subitem1 Num="イ"><Subitem1Sentence><Sentence>細目</Sentence></Subitem1Sentence>
<Subitem2 Num="1"><Subitem2Sentence><Sentence>細々目</Sentence></Subitem2Sentence></Subitem2>
</Subitem1></Item></Paragraph></Article></MainProvision>
<SupplProvision Type="New"><SupplProvisionLabel>附則</SupplProvisionLabel>
<Article Num="1"><ArticleTitle>第一条</ArticleTitle><Paragraph Num="1"><ParagraphSentence><Sentence>施行期日</Sentence></ParagraphSentence></Paragraph></Article>
</SupplProvision>
<SupplProvision Type="Amend" AmendLawNum="検証用改正法" Extract="true"><SupplProvisionLabel>附則</SupplProvisionLabel>
<Article Num="1"><Paragraph Num="1"><ParagraphSentence><Sentence>経過措置</Sentence></ParagraphSentence></Paragraph></Article>
<SupplProvisionAppdxTable Num="1"><SupplProvisionAppdxTableTitle>附則別表</SupplProvisionAppdxTableTitle></SupplProvisionAppdxTable>
</SupplProvision>
<AppdxTable Num="6"><AppdxTableTitle>別表第六</AppdxTableTitle><RelatedArticleNum>第六条関係</RelatedArticleNum>
<TableStruct><Table><TableHeaderRow><TableHeaderColumn>区分</TableHeaderColumn><TableHeaderColumn>条件</TableHeaderColumn></TableHeaderRow>
<TableRow><TableColumn rowspan="2"><Sentence>区分A</Sentence></TableColumn><TableColumn colspan="2"><Sentence>条件A</Sentence><Sentence>ただし書</Sentence></TableColumn></TableRow>
<TableRow><TableColumn><Sentence>条件B</Sentence></TableColumn></TableRow></Table></TableStruct>
</AppdxTable><AppdxTable Num="6_2"><AppdxTableTitle>別表第六の二</AppdxTableTitle><FigStruct><Fig src="fixture.png"/></FigStruct></AppdxTable>
<!-- preserve comment --><?fixture keep?>
</LawBody></Law>'''.encode("utf-8")
LAW_ID = next(iter(lab.REVISIONS))


def payload(xml=XML):
    return {"law_info": {"law_id": LAW_ID, "law_num": "検証用"},
            "revision_info": {"law_revision_id": lab.REVISIONS[LAW_ID], "law_title": "構造試験"},
            "law_full_text": base64.b64encode(xml).decode("ascii")}


class StructureTests(unittest.TestCase):
    def test_exact_original_bytes_and_tree_round_trip(self):
        raw, root = lab.decode_xml(payload())
        self.assertEqual(raw, XML)
        result = lab.structure(root, lab.REVISIONS[LAW_ID])
        self.assertTrue(result["round_trip_structure_text"])
        self.assertEqual(ET.tostring(root), ET.tostring(lab.rebuild(result["tree"])))
        self.assertIn("#comment", result["tag_counts"])
        self.assertIn("#processing-instruction", result["tag_counts"])

    def test_main_and_repeated_supplementary_article_numbers_are_distinct(self):
        _, root = lab.decode_xml(payload())
        result = lab.structure(root, lab.REVISIONS[LAW_ID])
        articles = [unit for unit in result["unit_index"] if unit["tag"] == "Article"]
        self.assertEqual([unit["num"] for unit in articles], ["1", "1", "1"])
        self.assertEqual(len(set(unit["id"] for unit in articles)), 3)
        self.assertEqual([unit["scope"] for unit in articles], ["main", "supplementary", "supplementary"])
        amended = [section for section in result["section_index"] if section["attributes"].get("Type") == "Amend"]
        self.assertEqual(amended[0]["attributes"]["AmendLawNum"], "検証用改正法")
        self.assertEqual(result["applicability"], "not-evaluated")

    def test_items_ruby_provisos_appendix_numbers_and_figure_are_not_flattened(self):
        _, root = lab.decode_xml(payload())
        result = lab.structure(root, lab.REVISIONS[LAW_ID])
        self.assertEqual(result["tag_counts"]["Subitem2"], 1)
        self.assertEqual(result["tag_counts"]["Rt"], 1)
        self.assertIn("ただし、例外。", json.dumps(result["tree"], ensure_ascii=False))
        appendices = [s for s in result["section_index"] if s["tag"] == "AppdxTable"]
        self.assertEqual([a["attributes"]["Num"] for a in appendices], ["6", "6_2"])
        self.assertIn('"src": "fixture.png"', json.dumps(result["tree"]))

    def test_table_rows_headers_and_spans_are_preserved(self):
        _, root = lab.decode_xml(payload())
        rows = lab.structure(root, lab.REVISIONS[LAW_ID])["table_index"][0]["rows"]
        self.assertEqual(len(rows), 3)
        self.assertEqual(rows[0]["tag"], "TableHeaderRow")
        self.assertEqual(rows[1]["cells"][0]["attributes"], {"rowspan": "2"})
        self.assertEqual(rows[1]["cells"][1]["attributes"], {"colspan": "2"})
        self.assertNotEqual(rows[1]["cells"][0]["path"], rows[2]["cells"][0]["path"])

    def test_bad_base64_wrong_root_and_entities_fail_closed(self):
        for value in ["%%%", base64.b64encode(b"<NotLaw/>").decode(),
                      base64.b64encode(b'<!DOCTYPE Law [<!ENTITY x "expanded">]><Law>&x;</Law>').decode()]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                lab.decode_xml({"law_full_text": value})

    def test_wrong_identity_or_revision_is_rejected(self):
        for field in ["law_info", "revision_info"]:
            bad = copy.deepcopy(payload())
            key = "law_id" if field == "law_info" else "law_revision_id"
            bad[field][key] = "wrong"
            with self.subTest(field=field), self.assertRaises(ValueError):
                lab.checked_payload(lab.json_bytes(bad), LAW_ID)
        with self.assertRaises(ValueError):
            lab.endpoint("not-an-authorized-law")

    def test_no_overwrite_and_retrieval_hash_validation(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp)
            source = lab.json_bytes(payload())
            metadata = {"law_id": LAW_ID, "requested_asof": lab.ASOF,
                        "requested_url": lab.endpoint(LAW_ID), "retrieved_at": "2026-10-26T00:00:00+00:00",
                        "response_sha256": lab.digest(source), "response_bytes": len(source),
                        "law_info": payload()["law_info"],
                        "revision_info": payload()["revision_info"]}
            lab.save_once(target / "response.json", source)
            lab.save_once(target / "response.json", source)
            lab.save_once(target / "retrieval.json", lab.json_bytes(metadata))
            lab.verify_retrieval(target, LAW_ID)
            with self.assertRaises(ValueError):
                lab.save_once(target / "response.json", b"different")
            (target / "response.json").write_bytes(source + b" ")
            with self.assertRaises(ValueError):
                lab.verify_retrieval(target, LAW_ID)

    def test_full_offline_generation_hashes_and_idempotence(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(lab, "EXPERIMENT_ROOT", Path(tmp)):
            folder = Path(tmp)
            response = MagicMock()
            response.__enter__.return_value = response
            response.geturl.return_value = lab.endpoint(LAW_ID)
            response.read.return_value = lab.json_bytes(payload())
            response.headers.get.return_value = "application/json"
            with patch.object(lab, "open_response", return_value=response) as get:
                lab.fetch_one(folder, LAW_ID)
                self.assertEqual(get.call_count, 1)
                lab.fetch_one(folder, LAW_ID)
                self.assertEqual(get.call_count, 1)
            manifest = lab.process_one(folder, LAW_ID)
            self.assertEqual(lab.process_one(folder, LAW_ID), manifest)
            target = folder / LAW_ID
            for filename, key in [("response.json", "response_sha256"), ("source.xml", "xml_sha256"), ("structure.json", "structured_sha256")]:
                self.assertEqual(lab.digest((target / filename).read_bytes()), manifest[key])
            saved = json.loads((target / "structure.json").read_bytes())
            _, original = lab.decode_xml(payload())
            self.assertEqual(ET.tostring(original), ET.tostring(lab.rebuild(saved["tree"])))
            (target / "structure.json").write_bytes(b"changed")
            with self.assertRaises(ValueError):
                lab.process_one(folder, LAW_ID)
            metadata = json.loads((target / "retrieval.json").read_bytes())
            metadata["law_info"]["law_num"] = "different"
            (target / "retrieval.json").write_bytes(lab.json_bytes(metadata))
            with self.assertRaises(ValueError):
                lab.verify_retrieval(target, LAW_ID)

    def test_partial_retrieval_does_not_make_another_request(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(lab, "EXPERIMENT_ROOT", Path(tmp)):
            target = Path(tmp) / LAW_ID
            target.mkdir()
            (target / "response.json").write_bytes(lab.json_bytes(payload()))
            with patch.object(lab, "open_response") as get, self.assertRaises(FileNotFoundError):
                lab.fetch_one(Path(tmp), LAW_ID)
            get.assert_not_called()

    def test_redirect_and_oversized_response_are_rejected(self):
        with self.assertRaises(ValueError):
            lab.NoRedirect().redirect_request(None, None, 302, "Found", {}, "https://example.invalid/")
        for redirect in [True, False]:
            with self.subTest(redirect=redirect), tempfile.TemporaryDirectory() as tmp, patch.object(lab, "EXPERIMENT_ROOT", Path(tmp)), patch.object(lab, "MAX_RESPONSE", 32):
                response = MagicMock()
                response.__enter__.return_value = response
                response.geturl.return_value = "https://example.invalid/" if redirect else lab.endpoint(LAW_ID)
                response.read.return_value = b"x" * 33
                with patch.object(lab, "open_response", return_value=response), self.assertRaises(ValueError):
                    lab.fetch_one(Path(tmp), LAW_ID)
                self.assertFalse((Path(tmp) / LAW_ID / "response.json").exists())

    def test_redirected_output_paths_and_wrong_root_are_rejected(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(lab, "EXPERIMENT_ROOT", Path(tmp)):
            folder = Path(tmp)
            with self.assertRaises(ValueError):
                lab.experiment_target(folder / "other")
            target = folder / LAW_ID
            original_resolve = Path.resolve
            def redirected(path, *args, **kwargs):
                return folder / "escape" if path == target else original_resolve(path, *args, **kwargs)
            with patch.object(Path, "resolve", redirected), self.assertRaises(ValueError):
                lab.experiment_target(folder, LAW_ID)
            destination = folder / "manifest.json"
            def redirected_file(path, *args, **kwargs):
                return folder / "escape.json" if path == destination else original_resolve(path, *args, **kwargs)
            with patch.object(Path, "resolve", redirected_file), self.assertRaises(ValueError):
                lab.save_once(destination, b"blocked")

    def test_unit_index_missing_entries_or_wrong_locators_fail(self):
        _, root = lab.decode_xml(payload())
        revision = lab.REVISIONS[LAW_ID]
        units = lab.structure(root, revision)["unit_index"]
        verify_units(root, units, revision)
        with self.assertRaises(ValueError):
            verify_units(root, [], revision)
        for field, value in [("num", "999"), ("scope", "appendix"), ("path", "/Law[1]/Missing[1]")]:
            bad = copy.deepcopy(units)
            bad[0][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                verify_units(root, bad, revision)


if __name__ == "__main__":
    unittest.main()
