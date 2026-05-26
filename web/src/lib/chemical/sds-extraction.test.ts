import { describe, expect, it } from "vitest";
import { parseSdsExtraction } from "@/lib/chemical/sds-extraction";

describe("parseSdsExtraction", () => {
  it("素のJSON文字列を解析", () => {
    const r = parseSdsExtraction(
      '{"productName":"トルエン","cas":"108-88-3","ghs":["引火性液体 区分2"],"physicalChemical":"引火点4℃","handling":"火気厳禁","applicableLaws":["有機則","消防法"],"measures":"局所排気"}'
    );
    expect(r?.productName).toBe("トルエン");
    expect(r?.cas).toBe("108-88-3");
    expect(r?.ghs).toContain("引火性液体 区分2");
    expect(r?.applicableLaws).toEqual(["有機則", "消防法"]);
  });

  it("```json フェンス付きでも解析", () => {
    const r = parseSdsExtraction('```json\n{"productName":"アセトン","cas":"67-64-1"}\n```');
    expect(r?.productName).toBe("アセトン");
  });

  it("オブジェクト直接・日本語キーも許容", () => {
    const r = parseSdsExtraction({ 物質名: "キシレン", CAS: "1330-20-7", 適用法令: "有機則、消防法" });
    expect(r?.productName).toBe("キシレン");
    expect(r?.cas).toBe("1330-20-7");
    expect(r?.applicableLaws).toEqual(["有機則", "消防法"]);
  });

  it("ghsが改行/読点区切り文字列でも配列化", () => {
    const r = parseSdsExtraction({ productName: "X", ghs: "発がん性 区分1A\n生殖毒性 区分2" });
    expect(r?.ghs).toHaveLength(2);
  });

  it("物質名もCASも無ければnull", () => {
    expect(parseSdsExtraction('{"handling":"換気"}')).toBeNull();
    expect(parseSdsExtraction("not json")).toBeNull();
    expect(parseSdsExtraction("")).toBeNull();
    expect(parseSdsExtraction(null)).toBeNull();
  });
});
