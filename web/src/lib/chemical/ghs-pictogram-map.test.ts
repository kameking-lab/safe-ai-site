import { describe, expect, it } from "vitest";
import {
  collectGhsSymbols,
  GHS_SYMBOL_LABEL,
  GHS_SYMBOL_ORDER,
  resolveGhsSymbol,
} from "./ghs-pictogram-map";

// GHSハザードクラス名 → 絵表示の対応（柱0）の回帰ガード。
// 対応はGHS（JIS Z 7253 / 国連GHS文書）の標準割当に基づく。判定はしない（表示変換のみ）。

describe("resolveGhsSymbol", () => {
  it("物理化学的危険性の標準割当", () => {
    expect(resolveGhsSymbol("爆発物")).toBe("explosive");
    expect(resolveGhsSymbol("自己反応性化学品")).toBe("explosive");
    expect(resolveGhsSymbol("引火性液体")).toBe("flame");
    expect(resolveGhsSymbol("可燃性固体")).toBe("flame");
    expect(resolveGhsSymbol("自然発火性液体")).toBe("flame");
    expect(resolveGhsSymbol("酸化性液体")).toBe("oxidizer");
    expect(resolveGhsSymbol("高圧ガス")).toBe("gas-cylinder");
  });

  it("急性毒性は区分1〜3=どくろ、区分4・不明=感嘆符（GHS06/07の分岐）", () => {
    expect(resolveGhsSymbol("急性毒性（経口）", "区分2")).toBe("skull");
    expect(resolveGhsSymbol("急性毒性（吸入）", "区分3")).toBe("skull");
    expect(resolveGhsSymbol("急性毒性（経口）", "区分4")).toBe("exclamation");
    expect(resolveGhsSymbol("急性毒性（経皮）")).toBe("exclamation");
  });

  it("健康有害性（GHS08）の標準割当", () => {
    expect(resolveGhsSymbol("発がん性")).toBe("health-hazard");
    expect(resolveGhsSymbol("生殖細胞変異原性")).toBe("health-hazard");
    expect(resolveGhsSymbol("特定標的臓器毒性（反復ばく露）", "区分1")).toBe("health-hazard");
    expect(resolveGhsSymbol("誤えん有害性")).toBe("health-hazard");
  });

  it("特定標的臓器毒性（単回）の区分3（気道刺激・麻酔）はGHS07感嘆符", () => {
    expect(resolveGhsSymbol("特定標的臓器毒性（単回ばく露）", "区分3（気道刺激性）")).toBe("exclamation");
    expect(resolveGhsSymbol("特定標的臓器毒性（単回ばく露：眠気またはめまい）")).toBe("exclamation");
    expect(resolveGhsSymbol("特定標的臓器毒性（単回ばく露）", "区分1（中枢神経系）")).toBe("health-hazard");
  });

  it("腐食・刺激（GHS05/07）の分岐", () => {
    expect(resolveGhsSymbol("皮膚腐食性")).toBe("corrosion");
    expect(resolveGhsSymbol("眼に対する重篤な損傷性")).toBe("corrosion");
    expect(resolveGhsSymbol("皮膚刺激性")).toBe("exclamation");
    expect(resolveGhsSymbol("眼刺激性")).toBe("exclamation");
  });

  it("結合カテゴリ（NITE形式）は区分1=腐食、区分2以下=感嘆符", () => {
    expect(resolveGhsSymbol("皮膚腐食性・刺激性", "区分1")).toBe("corrosion");
    expect(resolveGhsSymbol("皮膚腐食性・刺激性", "区分2")).toBe("exclamation");
    expect(resolveGhsSymbol("眼に対する重篤な損傷性・眼刺激性", "区分1")).toBe("corrosion");
    expect(resolveGhsSymbol("眼に対する重篤な損傷性・眼刺激性", "区分2B")).toBe("exclamation");
  });

  it("環境有害性（GHS09）と絵を持たない項目", () => {
    expect(resolveGhsSymbol("水生環境有害性（急性）")).toBe("environment");
    expect(resolveGhsSymbol("物理化学的性質")).toBeUndefined();
    expect(resolveGhsSymbol("")).toBeUndefined();
  });
});

describe("collectGhsSymbols", () => {
  it("重複を除き、重大順（どくろ・健康有害性が先頭側）で返す", () => {
    const symbols = collectGhsSymbols([
      { category: "引火性液体", classification: "区分2" },
      { category: "眼刺激性", classification: "区分2" },
      { category: "発がん性", classification: "区分1A" },
      { category: "引火性液体", classification: "区分2" },
    ]);
    expect(symbols).toEqual(["health-hazard", "flame", "exclamation"]);
  });

  it("絵を持たない項目だけなら空配列", () => {
    expect(collectGhsSymbols([{ category: "物理化学的性質" }])).toEqual([]);
  });

  it("全シンボルにラベルがあり、表示順は9種を網羅する", () => {
    expect(GHS_SYMBOL_ORDER).toHaveLength(9);
    for (const s of GHS_SYMBOL_ORDER) {
      expect(GHS_SYMBOL_LABEL[s], s).toBeTruthy();
    }
  });
});
