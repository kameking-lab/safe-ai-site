import { describe, expect, it } from "vitest";
import type { ConcentrationLimitEntry } from "@/lib/mhlw-chemicals";
import type { AccidentCase } from "@/lib/types/domain";
import {
  isIndexableAccident,
  isIndexableChemical,
  isValidCasNumber,
} from "./index-quality";

const chemical: ConcentrationLimitEntry = {
  name: "アセトン",
  twa: { value: "200", unit: "ppm", source: "mhlw" },
  mhlwSdsUrl: "https://anzeninfo.mhlw.go.jp/example.pdf",
};

const accident: AccidentCase = {
  id: "mhlw-123",
  title: "足場からの墜落による死亡災害",
  occurredOn: "2025-01-01",
  type: "墜落",
  workCategory: "建設業",
  severity: "死亡",
  summary:
    "外部足場上で資材の受け渡し中に手すりのない開口部から墜落し、死亡した公表事例です。作業手順にも不備がありました。",
  mainCauses: ["手すりの未設置"],
  preventionPoints: ["手すりと墜落制止用器具を確認する"],
  provenance: "mhlw",
  source: {
    site: "職場のあんぜんサイト",
    caseId: "123",
    url: "https://anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=123",
  },
};

describe("chemical index quality", () => {
  it.each([
    ["67-64-1", true],
    ["50-00-0", true],
    ["67-64-2", false],
    ["1234", false],
  ])("CAS %s のチェック桁を検証する", (cas, expected) => {
    expect(isValidCasNumber(cas)).toBe(expected);
  });

  it("CAS・名称・公式参照・実質情報がそろう場合だけ indexable", () => {
    expect(isIndexableChemical("67-64-1", chemical)).toBe(true);
    expect(isIndexableChemical("67-64-2", chemical)).toBe(false);
    expect(isIndexableChemical("67-64-1", { ...chemical, name: "" })).toBe(false);
    expect(
      isIndexableChemical("67-64-1", {
        name: "アセトン",
        mhlwSdsUrl: "https://example.com/unverified",
      }),
    ).toBe(false);
  });
});

describe("accident index quality", () => {
  it("一次個票との本文一致を再検証するまで全出典区分をnoindex", () => {
    for (const provenance of [
      "mhlw",
      "curated",
      "synthetic",
      "preliminary",
    ] as const) {
      expect(isIndexableAccident({ ...accident, provenance })).toBe(false);
    }
    expect(isIndexableAccident({ ...accident, source: undefined })).toBe(false);
  });
});
