import { describe, expect, it } from "vitest";
import { ACC_LANGS, ACC_LANG_LABELS, isAccLang, accLabels, type AccLabelSet } from "@/lib/accidents/accidents-labels";

const KEYS: (keyof AccLabelSet)[] = [
  "aiTitle", "aiDesc", "industry", "workContent", "analyze", "analyzing",
  "dangerPoints", "relatedCases", "noCases", "disclaimer",
];

describe("accidents-labels", () => {
  it("6言語", () => {
    expect(ACC_LANGS).toEqual(["ja", "en", "vi", "zh", "tl", "id"]);
  });
  it("全言語が全ラベルを過不足なく持ち空でない", () => {
    for (const lang of ACC_LANGS) {
      const s = accLabels(lang);
      for (const k of KEYS) expect(s[k], `${lang}.${k}`).toBeTruthy();
      expect(Object.keys(s).sort()).toEqual([...KEYS].sort());
      expect(ACC_LANG_LABELS[lang]).toBeTruthy();
    }
  });
  it("isAccLang/フォールバック", () => {
    expect(isAccLang("vi")).toBe(true);
    expect(isAccLang("fr")).toBe(false);
    expect(accLabels("fr")).toEqual(accLabels("ja"));
    expect(accLabels(null)).toEqual(accLabels("ja"));
  });
});
