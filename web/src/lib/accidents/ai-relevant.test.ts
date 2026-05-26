import { describe, expect, it } from "vitest";
import { findRelevantAccidents, tokenize } from "@/lib/accidents/ai-relevant";
import type { AccidentCase } from "@/lib/types/domain";

const mk = (o: Partial<AccidentCase>): AccidentCase => ({
  id: o.id ?? "x",
  title: o.title ?? "",
  occurredOn: o.occurredOn ?? "2025-01-01",
  type: o.type ?? ("墜落・転落" as AccidentCase["type"]),
  workCategory: o.workCategory ?? ("建設業" as AccidentCase["workCategory"]),
  severity: o.severity ?? "重傷",
  summary: o.summary ?? "",
  mainCauses: o.mainCauses ?? [],
  preventionPoints: o.preventionPoints ?? [],
});

const CASES: AccidentCase[] = [
  mk({ id: "a", title: "足場からの墜落", summary: "外壁塗装中に足場から墜落", workCategory: "建設業" as AccidentCase["workCategory"] }),
  mk({ id: "b", title: "プレス機にはさまれ", summary: "金属プレス作業で手をはさまれ", workCategory: "製造業" as AccidentCase["workCategory"] }),
  mk({ id: "c", title: "フォークリフト接触", summary: "倉庫で歩行者と接触", workCategory: "運輸交通業" as AccidentCase["workCategory"], mainCauses: ["塗装区画の死角"] }),
];

describe("tokenize", () => {
  it("2文字以上のトークンに分割", () => {
    expect(tokenize("外壁 塗装、足場")).toEqual(["外壁", "塗装", "足場"]);
    expect(tokenize("")).toEqual([]);
  });
});

describe("findRelevantAccidents", () => {
  it("作業キーワードでスコアリング抽出", () => {
    const r = findRelevantAccidents({ workContent: "外壁塗装 足場" }, CASES);
    expect(r[0].case.id).toBe("a"); // 足場・塗装で最高スコア
  });

  it("業種カテゴリ一致は加点", () => {
    const r = findRelevantAccidents({ workContent: "プレス", category: "製造業" as AccidentCase["workCategory"] }, CASES);
    expect(r[0].case.id).toBe("b");
  });

  it("mainCausesのキーワードもヒット", () => {
    const r = findRelevantAccidents({ workContent: "塗装" }, CASES);
    expect(r.map((h) => h.case.id)).toContain("c"); // mainCausesに"塗装区画"
  });

  it("スコア0（無関係）は除外", () => {
    const r = findRelevantAccidents({ workContent: "アンモニア漏洩" }, CASES);
    expect(r).toEqual([]);
  });

  it("limitで件数制限・スコア降順", () => {
    const r = findRelevantAccidents({ workContent: "塗装 足場 はさまれ 接触", category: "建設業" as AccidentCase["workCategory"] }, CASES, 2);
    expect(r.length).toBeLessThanOrEqual(2);
    expect(r[0].score).toBeGreaterThanOrEqual(r[r.length - 1].score);
  });
});
