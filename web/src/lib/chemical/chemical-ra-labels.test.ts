import { describe, expect, it } from "vitest";
import {
  CHEM_LANGS,
  CHEM_LANG_LABELS,
  isChemLang,
  chemSdsLabels,
  type ChemSdsLabelSet,
} from "@/lib/chemical/chemical-ra-labels";

const KEYS: (keyof ChemSdsLabelSet)[] = [
  "sdsTitle",
  "sdsDesc",
  "dropHint",
  "fileHint",
  "reading",
  "ghs",
  "physical",
  "laws",
  "handling",
  "measures",
  "runRa",
  "seeRegs",
  "aiDisclaimer",
];

describe("chemical-ra-labels", () => {
  it("6言語を定義", () => {
    expect(CHEM_LANGS).toEqual(["ja", "en", "vi", "zh", "tl", "id"]);
  });

  it("全言語が全ラベルを過不足なく持ち空でない", () => {
    for (const lang of CHEM_LANGS) {
      const set = chemSdsLabels(lang);
      for (const k of KEYS) {
        expect(set[k], `${lang}.${k}`).toBeTruthy();
      }
      expect(Object.keys(set).sort()).toEqual([...KEYS].sort());
      expect(CHEM_LANG_LABELS[lang]).toBeTruthy();
    }
  });

  it("isChemLang は対応言語のみ true", () => {
    expect(isChemLang("vi")).toBe(true);
    expect(isChemLang("fr")).toBe(false);
    expect(isChemLang(null)).toBe(false);
  });

  it("未対応・未指定は ja フォールバック", () => {
    expect(chemSdsLabels("fr")).toEqual(chemSdsLabels("ja"));
    expect(chemSdsLabels(undefined)).toEqual(chemSdsLabels("ja"));
  });
});
