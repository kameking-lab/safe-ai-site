import { describe, expect, it } from "vitest";
import {
  SIGNAGE_LANGS,
  SIGNAGE_LANG_LABELS,
  isSignageLang,
  signageLabels,
  type SignageLabelSet,
} from "@/lib/signage/signage-labels";

const REQUIRED_KEYS: (keyof SignageLabelSet)[] = [
  "signageTitle",
  "backToEdit",
  "mainWork",
  "workPlace",
  "riskTop3",
  "riskScore",
  "countermeasure",
  "notEntered",
  "teamGoal",
  "pointingCall",
  "chantCountdown",
  "chantReady",
  "chantStart",
  "chantStop",
  "chantGo",
  "noData",
  "fullscreen",
  "exitFullscreen",
  "print",
];

describe("signage-labels", () => {
  it("6言語を定義している", () => {
    expect(SIGNAGE_LANGS).toEqual(["ja", "en", "vi", "zh", "tl", "id"]);
  });

  it("全言語が全ラベルキーを過不足なく持ち、空文字が無い", () => {
    for (const lang of SIGNAGE_LANGS) {
      const set = signageLabels(lang);
      for (const key of REQUIRED_KEYS) {
        expect(set[key], `${lang}.${key}`).toBeTruthy();
        expect(typeof set[key]).toBe("string");
      }
      // 余分なキーが無い（キー数一致）
      expect(Object.keys(set).sort()).toEqual([...REQUIRED_KEYS].sort());
    }
  });

  // R2(エスカレ項目4): 多言語が「壊れて見える」最大要因＝日本語の取りこぼし(未翻訳fallback)を防ぐ。
  // ひらがな/カタカナは日本語固有。en/vi/tl/id のラベルに混入していたら未翻訳の疑い。
  // （zh は漢字を正規に使うため対象外。ja は当然対象外。）
  it("非日本語(en/vi/tl/id)のラベルに日本語かな(未翻訳fallback)が混入していない", () => {
    const kana = /[぀-ゟ゠-ヿ]/; // ひらがな + カタカナ
    for (const lang of ["en", "vi", "tl", "id"] as const) {
      const set = signageLabels(lang);
      for (const key of REQUIRED_KEYS) {
        expect(kana.test(set[key]), `${lang}.${key} に日本語かなが混入(未翻訳の疑い): "${set[key]}"`).toBe(false);
      }
    }
  });

  it("各言語にトグル表示名がある", () => {
    for (const lang of SIGNAGE_LANGS) {
      expect(SIGNAGE_LANG_LABELS[lang]).toBeTruthy();
    }
  });

  it("isSignageLang は対応言語のみ true", () => {
    expect(isSignageLang("ja")).toBe(true);
    expect(isSignageLang("vi")).toBe(true);
    expect(isSignageLang("fr")).toBe(false);
    expect(isSignageLang("")).toBe(false);
    expect(isSignageLang(null)).toBe(false);
    expect(isSignageLang(123)).toBe(false);
  });

  it("未対応・未指定は ja にフォールバックする", () => {
    expect(signageLabels("fr")).toEqual(signageLabels("ja"));
    expect(signageLabels(null)).toEqual(signageLabels("ja"));
    expect(signageLabels(undefined)).toEqual(signageLabels("ja"));
  });

  it("既定の日本語ラベルが期待値", () => {
    const ja = signageLabels("ja");
    expect(ja.mainWork).toBe("本日の主な作業");
    expect(ja.riskTop3).toBe("本日のリスク Top3");
  });
});
