import { describe, expect, it } from "vitest";
import { findAccidentsBySubstance } from "@/lib/chemical/accident-cross-search";
import type { AccidentCase } from "@/lib/types/domain";

const mk = (over: Partial<AccidentCase>): AccidentCase => ({
  id: over.id ?? "x",
  title: over.title ?? "",
  occurredOn: over.occurredOn ?? "2025-01-01",
  type: over.type ?? ("有害物等との接触" as AccidentCase["type"]),
  workCategory: over.workCategory ?? ("製造業" as AccidentCase["workCategory"]),
  severity: over.severity ?? "中等傷",
  summary: over.summary ?? "",
  mainCauses: over.mainCauses ?? [],
  preventionPoints: over.preventionPoints ?? [],
});

const CASES: AccidentCase[] = [
  mk({ id: "a1", title: "ジクロロメタン槽の急性中毒", summary: "換気不良でジクロロメタン蒸気" }),
  mk({ id: "a2", title: "墜落事故", summary: "足場からの墜落", mainCauses: ["手すり未設置"] }),
  mk({ id: "a3", title: "塗装作業の事故", summary: "有機溶剤の使用", mainCauses: ["トルエン中毒の疑い"] }),
];

describe("findAccidentsBySubstance", () => {
  it("summaryに物質名を含む事例を抽出", () => {
    const r = findAccidentsBySubstance("ジクロロメタン", CASES);
    expect(r.map((m) => m.id)).toContain("a1");
    expect(r.map((m) => m.id)).not.toContain("a2");
  });

  it("mainCausesの物質名でもマッチ", () => {
    const r = findAccidentsBySubstance("トルエン", CASES);
    expect(r.map((m) => m.id)).toEqual(["a3"]);
  });

  it("2文字未満の名前は無視（誤マッチ防止）", () => {
    expect(findAccidentsBySubstance("水", CASES)).toEqual([]);
    expect(findAccidentsBySubstance("", CASES)).toEqual([]);
    expect(findAccidentsBySubstance(null, CASES)).toEqual([]);
  });

  it("別名(aliases)でも照合できる", () => {
    const r = findAccidentsBySubstance("塩化メチレン", CASES, { aliases: ["ジクロロメタン"] });
    expect(r.map((m) => m.id)).toContain("a1");
  });

  it("limitで件数制限", () => {
    const many = Array.from({ length: 10 }, (_, i) => mk({ id: `m${i}`, summary: "トルエン" }));
    expect(findAccidentsBySubstance("トルエン", many, { limit: 3 })).toHaveLength(3);
  });

  it("該当なしは空配列", () => {
    expect(findAccidentsBySubstance("アンモニア", CASES)).toEqual([]);
  });
});
