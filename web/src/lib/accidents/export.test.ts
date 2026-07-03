import { describe, expect, it } from "vitest";
import { ACCIDENTS_CSV_FILENAME, accidentsSummaryToCsv, accidentsSummaryToText } from "./export";
import type { AccidentsSummary } from "./export";

const FIXTURE: AccidentsSummary = {
  total: 1234,
  mhlw: 900,
  curated: 300,
  preliminary: 20,
  synthetic: 14,
  typeCounts: [
    { type: "墜落", count: 500 },
    { type: "転倒", count: 300 },
    { type: "はさまれ・巻き込まれ", count: 200 },
    { type: "切れ・こすれ", count: 100 },
  ],
};

describe("accidentsSummaryToCsv", () => {
  it("集計値を改変せずそのまま出力する（捏造・水増しなし）", () => {
    const csv = accidentsSummaryToCsv(FIXTURE);
    expect(csv).toContain("総収録件数,1234");
    expect(csv).toContain("厚労省データ（件）,900");
    expect(csv).toContain("curated詳細事例（件）,300");
    expect(csv).toContain("想定例・速報基準（件）,20");
    expect(csv).toContain("合成（件）,14");
    expect(csv).toContain("墜落,500");
  });

  it("セクション見出しを含む", () => {
    const csv = accidentsSummaryToCsv(FIXTURE);
    expect(csv).toContain("事故データベース サマリー");
    expect(csv).toContain("事故の型別 件数ランキング");
  });

  it("ファイル名は .csv 拡張子", () => {
    expect(ACCIDENTS_CSV_FILENAME.endsWith(".csv")).toBe(true);
  });
});

describe("accidentsSummaryToText", () => {
  it("総収録件数・内訳・事故の型TOP3を含む", () => {
    const text = accidentsSummaryToText(FIXTURE);
    expect(text).toContain("総収録件数：1,234件");
    expect(text).toContain("厚労省 900件");
    expect(text).toContain("curated 300件");
    expect(text).toContain("想定例(速報基準) 20件");
    expect(text).toContain("合成 14件");
    expect(text).toContain("1.墜落(500件)");
    expect(text).toContain("2.転倒(300件)");
    expect(text).toContain("3.はさまれ・巻き込まれ(200件)");
  });

  it("TOP3のみ（4件目以降は含まない）", () => {
    const text = accidentsSummaryToText(FIXTURE);
    expect(text).not.toContain("切れ・こすれ");
  });
});
