import base64
import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import egov_xml_lab as lab
import export_rag_dataset as export


# Synthetic XML syntax, not an assertion about any actual legal provision.
XML = """<Law><LawNum>検証用</LawNum><LawBody><LawTitle>構造試験</LawTitle>
<MainProvision><Chapter Num="1"><Article Num="34_2"><ArticleTitle>第三十四条の二</ArticleTitle>
<Paragraph Num="1"><ParagraphSentence><Sentence>定義。<Ruby>漢<Rt>かん</Rt></Ruby>字。ただし政令、省令、別表を準用し読み替える。</Sentence></ParagraphSentence>
<Item Num="1"><Subitem1 Num="イ"><Subitem1Sentence><Sentence>細目</Sentence></Subitem1Sentence></Subitem1></Item>
</Paragraph></Article></Chapter></MainProvision>
<SupplProvision><SupplProvisionLabel>附則</SupplProvisionLabel><Article Num="1"><ArticleTitle>第一条</ArticleTitle><Paragraph Num="1"><ParagraphSentence><Sentence>施行</Sentence></ParagraphSentence></Paragraph></Article></SupplProvision>
<SupplProvision AmendLawNum="検証用改正法" Extract="true"><SupplProvisionLabel>附則</SupplProvisionLabel><Article Num="1"><ArticleTitle>第一条</ArticleTitle><Paragraph Num="1"><ParagraphSentence><Sentence>経過</Sentence></ParagraphSentence></Paragraph></Article>
<SupplProvisionAppdxTable><SupplProvisionAppdxTableTitle>附則別表</SupplProvisionAppdxTableTitle></SupplProvisionAppdxTable></SupplProvision>
<AppdxTable><AppdxTableTitle>別表第六</AppdxTableTitle><RelatedArticleNum>第六条関係</RelatedArticleNum>
<TableStruct><Table><TableHeaderRow><TableHeaderColumn>見出し</TableHeaderColumn></TableHeaderRow><TableRow><TableColumn rowspan="2" colspan="3"><Sentence>セル原文</Sentence></TableColumn></TableRow></Table></TableStruct></AppdxTable>
<AppdxTable><AppdxTableTitle>別表第六の二</AppdxTableTitle><FigStruct><Fig src="synthetic.png"/></FigStruct></AppdxTable>
<AppdxStyle><AppdxStyleTitle>様式第一号</AppdxStyleTitle><StyleStruct><Style><Fig src="style.png"/></Style></StyleStruct></AppdxStyle>
</LawBody></Law>""".encode("utf-8")
LAW_ID = next(iter(lab.REVISIONS))
REVISION = lab.REVISIONS[LAW_ID]


def root_fixture():
    return lab.decode_xml({"law_full_text": base64.b64encode(XML).decode("ascii")})[1]


class DocumentTests(unittest.TestCase):
    def test_contract_scope_labels_and_repeated_supplementary_articles(self):
        documents = export.documents_for_law(root_fixture(), LAW_ID, REVISION)
        self.assertEqual([item["kind"] for item in documents],
                         ["main", "supplementary", "supplementary", "appendix", "appendix", "appendix"])
        self.assertEqual(documents[0]["articleNums"], ["第34条の2"])
        self.assertEqual(documents[1]["articleNums"], ["第1条"])
        self.assertEqual(documents[2]["articleNums"], ["第1条"])
        self.assertNotEqual(documents[1]["id"], documents[2]["id"])
        self.assertEqual(documents[1]["label"], "附則（ブロック1）")
        self.assertEqual(documents[2]["label"], "附則（ブロック2・検証用改正法）")
        self.assertEqual(documents[3]["label"], "別表第六 第六条関係")
        self.assertEqual(documents[4]["label"], "別表第六の二")
        self.assertEqual(documents[5]["label"], "様式第一号")
        self.assertEqual(documents[3]["articleNums"], [])
        for item in documents:
            self.assertEqual(item["id"], REVISION + ":" + item["path"])
            self.assertEqual(set(item), {"id", "lawId", "kind", "path", "label", "text",
                                         "articleNums", "hasFigures", "hasTables", "referenceSignals", "node"})

    def test_ast_keeps_ruby_subitems_table_spans_and_supplementary_appendix(self):
        root = root_fixture()
        documents = export.documents_for_law(root, LAW_ID, REVISION)
        by_path = {path: node for node, path, _ in lab.indexed_nodes(root)}
        for item in documents:
            self.assertEqual(item["node"], lab.node_tree(by_path[item["path"]]))
        self.assertIn("漢字", documents[0]["text"])
        self.assertNotIn("かん", documents[0]["text"])
        self.assertIn("かん", json.dumps(documents[0]["node"], ensure_ascii=False))
        self.assertEqual(documents[0]["referenceSignals"], list(export.REFERENCE_SIGNALS))
        self.assertIn("Subitem1", json.dumps(documents[0]["node"]))
        self.assertIn("SupplProvisionAppdxTable", json.dumps(documents[2]["node"]))
        self.assertTrue(documents[3]["hasTables"])
        self.assertFalse(documents[3]["hasFigures"])
        self.assertIn('"rowspan": "2"', json.dumps(documents[3]["node"]))
        self.assertIn('"colspan": "3"', json.dumps(documents[3]["node"]))
        self.assertTrue(documents[4]["hasFigures"])
        self.assertFalse(documents[4]["hasTables"])

    def test_canonical_ranges_do_not_split_the_source_document(self):
        root = root_fixture()
        root.find(".//MainProvision//Article").set("Num", "95_4:95_5")
        documents = export.documents_for_law(root, LAW_ID, REVISION)
        self.assertEqual(documents[0]["articleNums"], ["第95条の4", "第95条の5"])
        self.assertEqual(documents[0]["node"]["attributes"]["Num"], "95_4:95_5")
        self.assertEqual(export.article_numbers("323:324"), ["第323条", "第324条"])
        self.assertEqual(export.article_numbers("1_2_3"), ["第1条の2の3"])

    def test_unknown_or_missing_article_number_raises(self):
        for value in (None, "", "01", "1:2_3", "95_4:96_5", "4:2", "一", "1:10001"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                export.article_numbers(value)

    def test_missing_titles_and_unclassified_sections_fail_closed(self):
        for selector, tag in ((".//MainProvision//Article", "ArticleTitle"),
                              ("./LawBody/SupplProvision", "SupplProvisionLabel"),
                              ("./LawBody/AppdxTable", "AppdxTableTitle")):
            root = root_fixture()
            parent = root.find(selector)
            parent.remove(parent.find(tag))
            with self.subTest(tag=tag), self.assertRaises(ValueError):
                export.documents_for_law(root, LAW_ID, REVISION)
        root = root_fixture()
        root.find("LawBody").append(lab.rebuild({"tag": "UnknownProvision", "attributes": {},
                                               "text": "unknown", "tail": None, "children": []}))
        with self.assertRaisesRegex(ValueError, "unclassified"):
            export.documents_for_law(root, LAW_ID, REVISION)
        with self.assertRaises(ValueError):
            export.documents_for_law(root_fixture(), LAW_ID, "unreviewed-version")


class ExportBoundaryTests(unittest.TestCase):
    def fixture(self, folder):
        """Mock only the existing verifier boundary; use real files/hash/save_once."""
        report = {"requested_asof": lab.ASOF, "law_count": 5, "laws": []}
        manifests = []
        for law_id, revision in lab.REVISIONS.items():
            law_folder = folder / law_id
            law_folder.mkdir()
            encoded = lab.json_bytes(lab.structure(root_fixture(), revision))
            (law_folder / "structure.json").write_bytes(encoded)
            entry = {"law_id": law_id, "title": "構造試験", "revision_id": revision,
                     "retrieved_at": "2026-10-26T00:00:00+00:00", "source_url": lab.endpoint(law_id),
                     "response_sha256": "a" * 64, "xml_sha256": lab.digest(XML),
                     "structured_sha256": lab.digest(encoded)}
            report["laws"].append(entry)
            manifest = {**entry, "law_title": entry["title"], "requested_asof": lab.ASOF}
            manifests.append(manifest)
            (law_folder / "manifest.json").write_bytes(lab.json_bytes(manifest))
        (folder / "manifest.json").write_bytes(lab.json_bytes({"asof": lab.ASOF, "laws": manifests}))
        return report

    def test_verification_precedes_export_and_output_is_idempotent_not_overwritten(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp).resolve()
            report = self.fixture(folder)
            with patch.object(lab, "EXPERIMENT_ROOT", folder), \
                    patch.object(export.verification, "verify", return_value=report) as checked:
                result = export.export_dataset(folder)
                checked.assert_called_once_with(folder)
                output = folder / export.OUTPUT_NAME
                first = output.read_bytes()
                parsed = json.loads(first)
                self.assertEqual(set(parsed), {"schema", "asOf", "laws", "documents"})
                self.assertEqual(parsed["schema"], "safe-ai-supplement-rag/v1")
                self.assertEqual(parsed["asOf"], "2026-10-26")
                self.assertEqual([law["lawShort"] for law in parsed["laws"]], list(export.LAW_SHORTS.values()))
                self.assertEqual(result["documents"], 30)
                self.assertEqual(set(parsed["laws"][0]), {"lawId", "lawShort", "title", "revisionId",
                                                           "retrievedAt", "sourceUrl", "xmlSha256"})
                export.export_dataset(folder)
                self.assertEqual(output.read_bytes(), first)
                output.write_bytes(b"existing different artifact")
                with self.assertRaisesRegex(ValueError, "overwrite"):
                    export.export_dataset(folder)
                self.assertEqual(output.read_bytes(), b"existing different artifact")

    def test_failed_verification_never_writes_an_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp).resolve()
            with patch.object(lab, "EXPERIMENT_ROOT", folder), \
                    patch.object(export.verification, "verify", side_effect=ValueError("raw/hash/tree mismatch")):
                with self.assertRaisesRegex(ValueError, "raw/hash/tree"):
                    export.export_dataset(folder)
                self.assertFalse((folder / export.OUTPUT_NAME).exists())

    def test_changed_structure_or_manifest_never_writes_an_output(self):
        for corruption in ("structure", "aggregate", "per-law"):
            with self.subTest(corruption=corruption), tempfile.TemporaryDirectory() as tmp:
                folder = Path(tmp).resolve()
                report = self.fixture(folder)
                if corruption == "structure":
                    path = folder / LAW_ID / "structure.json"
                    path.write_bytes(path.read_bytes() + b" ")
                elif corruption == "aggregate":
                    path = folder / "manifest.json"
                    data = json.loads(path.read_bytes())
                    data["laws"].pop()
                    path.write_bytes(lab.json_bytes(data))
                else:
                    path = folder / LAW_ID / "manifest.json"
                    data = json.loads(path.read_bytes())
                    data["xml_sha256"] = "b" * 64
                    path.write_bytes(lab.json_bytes(data))
                with patch.object(lab, "EXPERIMENT_ROOT", folder), \
                        patch.object(export.verification, "verify", return_value=copy.deepcopy(report)):
                    with self.assertRaises(ValueError):
                        export.export_dataset(folder)
                    self.assertFalse((folder / export.OUTPUT_NAME).exists())

    def test_output_outside_the_dedicated_lab_is_rejected_before_verification(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(export.verification, "verify") as checked:
            with self.assertRaises(ValueError):
                export.export_dataset(Path(tmp))
            checked.assert_not_called()


if __name__ == "__main__":
    unittest.main()
