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
  it("一次個票との本文一致を再検証中は、作業キーワード一致でも返さない", () => {
    const r = findRelevantAccidents({ workContent: "外壁塗装 足場" }, CASES);
    expect(r).toEqual([]);
  });

  it("業種カテゴリ一致だけで未検証事故を運用根拠へ昇格させない", () => {
    const r = findRelevantAccidents({ workContent: "プレス", category: "製造業" as AccidentCase["workCategory"] }, CASES);
    expect(r).toEqual([]);
  });

  it("未検証の原因欄が一致しても返さない", () => {
    const r = findRelevantAccidents({ workContent: "塗装" }, CASES);
    expect(r).toEqual([]);
  });

  it("スコア0（無関係）は除外", () => {
    const r = findRelevantAccidents({ workContent: "アンモニア漏洩" }, CASES);
    expect(r).toEqual([]);
  });

  it("limitを指定しても隔離レコードを漏らさない", () => {
    const r = findRelevantAccidents({ workContent: "塗装 足場 はさまれ 接触", category: "建設業" as AccidentCase["workCategory"] }, CASES, 2);
    expect(r).toEqual([]);
  });

  it("curated・synthetic・preliminaryをすべて再検証済みallowlist外として除外する", () => {
    const mixed = [
      mk({ id: "curated-1", title: "足場から墜落", provenance: "curated" }),
      mk({ id: "synthetic-1", title: "足場から墜落", provenance: "synthetic" }),
      mk({ id: "preliminary-1", title: "足場から墜落", provenance: "preliminary" }),
    ];

    expect(
      findRelevantAccidents({ workContent: "足場 墜落" }, mixed).map(
        (hit) => hit.case.id,
      ),
    ).toEqual([]);
  });
});
