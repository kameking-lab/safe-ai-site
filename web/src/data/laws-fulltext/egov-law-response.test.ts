import { describe, expect, it } from "vitest";
import { lawResponseXml } from "../../../scripts/etl/egov-law-response";

const lawId = "347AC0000000057";
const fixture = () => ({ revision_info: { law_revision_id: `${lawId}_20261001_507AC0000000033` },
  law_full_text: { tag: "Law", attr: { Num: "57" }, children: [{ tag: "MainProvision", children: [
    { tag: "Article", attr: { Num: "65_3" }, children: ["A & <B>", { tag: "Ruby", children: ["作業", { tag: "Rt", children: ["さぎょう"] }] }] },
  ] }] } });

describe("official e-Gov law response normalization", () => {
  it("preserves XML responses byte-for-byte for the existing parser/gates", () => {
    const xml = "<Law><MainProvision>本文</MainProvision></Law>";
    expect(lawResponseXml(xml, lawId)).toBe(xml);
  });
  it("preserves JSON AST hierarchy, attributes, ruby and escaped text", () => {
    const xml = lawResponseXml(JSON.stringify(fixture()), lawId);
    expect(xml).toContain(`<law_revision_id>${lawId}_20261001_507AC0000000033</law_revision_id>`);
    expect(xml).toContain('<Article Num="65_3">A &amp; &lt;B&gt;<Ruby>作業<Rt>さぎょう</Rt></Ruby></Article>');
  });
  it("fails closed for another law, missing tree and malformed AST", () => {
    const another = fixture(); another.revision_info.law_revision_id = "347M50002000032_20261001_508M60000100116";
    expect(() => lawResponseXml(JSON.stringify(another), lawId)).toThrow("mismatch");
    expect(() => lawResponseXml(JSON.stringify({ revision_info: fixture().revision_info }), lawId)).toThrow();
    expect(() => lawResponseXml(JSON.stringify({ ...fixture(), law_full_text: { tag: "Law", children: "not-array" } }), lawId)).toThrow("children");
  });
});
