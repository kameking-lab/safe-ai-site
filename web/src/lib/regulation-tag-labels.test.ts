import { describe, it, expect } from "vitest";
import {
  REGULATION_TAGS,
  ALL_REGULATION_TAGS,
  isKnownRegulationTag,
  normalizeTags,
  TAG_CATEGORY_ORDER,
  TAG_CATEGORY_LABELS,
  CONSTRUCTION_PRIORITY_CAS,
  CONSTRUCTION_PRIORITY_CAS_SET,
} from "./regulation-tag-labels";

describe("Phase 1e: 規制タグラベル定義", () => {
  it("9 種類のタグが全て定義されている", () => {
    expect(ALL_REGULATION_TAGS).toHaveLength(9);
    for (const t of ALL_REGULATION_TAGS) {
      expect(REGULATION_TAGS[t]).toBeDefined();
      expect(REGULATION_TAGS[t].shortLabel).toBeTruthy();
      expect(REGULATION_TAGS[t].fullLabel).toBeTruthy();
      expect(REGULATION_TAGS[t].summary.length).toBeGreaterThan(20);
      expect(REGULATION_TAGS[t].officialUrl).toMatch(/^https:\/\//);
      expect(REGULATION_TAGS[t].badgeClass).toContain("bg-");
    }
  });

  it("各タグのカテゴリが TAG_CATEGORY_ORDER に含まれる", () => {
    for (const t of ALL_REGULATION_TAGS) {
      expect(TAG_CATEGORY_ORDER).toContain(REGULATION_TAGS[t].category);
    }
  });

  it("TAG_CATEGORY_LABELS が全カテゴリ網羅", () => {
    for (const cat of TAG_CATEGORY_ORDER) {
      expect(TAG_CATEGORY_LABELS[cat]).toBeTruthy();
    }
  });

  it("isKnownRegulationTag が型ガードとして機能", () => {
    expect(isKnownRegulationTag("prtr1")).toBe(true);
    expect(isKnownRegulationTag("nite")).toBe(true);
    expect(isKnownRegulationTag("waste")).toBe(true);
    expect(isKnownRegulationTag("unknown")).toBe(false);
    expect(isKnownRegulationTag("")).toBe(false);
  });

  it("normalizeTags が未知タグを除外し既知タグだけ返す", () => {
    expect(normalizeTags(["nite", "prtr1", "unknown", "waste"])).toEqual([
      "nite",
      "prtr1",
      "waste",
    ]);
    expect(normalizeTags([])).toEqual([]);
    expect(normalizeTags(undefined)).toEqual([]);
  });
});

describe("Phase 1e: 建設業頻出物質プリセット", () => {
  it("20 物質以上定義されている", () => {
    expect(CONSTRUCTION_PRIORITY_CAS.length).toBeGreaterThanOrEqual(20);
  });

  it("各物質に CAS, name, category が定義されている", () => {
    for (const s of CONSTRUCTION_PRIORITY_CAS) {
      expect(s.cas).toMatch(/^\d+-\d+-\d+$/);
      expect(s.name).toBeTruthy();
      expect(s.category).toBeTruthy();
    }
  });

  it("主要 12 物質 (Phase 1c/1d で確認済) が含まれる", () => {
    const required = [
      "108-88-3", "1330-20-7", "141-78-6", "78-93-3", "71-43-2",
      "75-09-2", "101-68-8", "79-06-1", "7439-92-1", "7439-97-6",
      "50-00-0", "1332-21-4",
    ];
    for (const cas of required) {
      expect(CONSTRUCTION_PRIORITY_CAS_SET.has(cas)).toBe(true);
    }
  });

  it("Set と配列の件数が一致 (CAS 重複なし)", () => {
    expect(CONSTRUCTION_PRIORITY_CAS_SET.size).toBe(CONSTRUCTION_PRIORITY_CAS.length);
  });
});

describe("Phase 1e: タグカテゴリの正確性", () => {
  it("PRTR 系 (prtr1/prtr2) がカテゴリ 'prtr'", () => {
    expect(REGULATION_TAGS.prtr1.category).toBe("prtr");
    expect(REGULATION_TAGS.prtr2.category).toBe("prtr");
  });
  it("化審法系 3 種が 'chashin'", () => {
    expect(REGULATION_TAGS.cscl1.category).toBe("chashin");
    expect(REGULATION_TAGS.cscl2.category).toBe("chashin");
    expect(REGULATION_TAGS["cscl-other"].category).toBe("chashin");
  });
  it("毒劇法・廃掃法が 'poison-waste'", () => {
    expect(REGULATION_TAGS["poison-control"].category).toBe("poison-waste");
    expect(REGULATION_TAGS.waste.category).toBe("poison-waste");
  });
  it("化学兵器禁止法が 'cwc'", () => {
    expect(REGULATION_TAGS.cwc.category).toBe("cwc");
  });
  it("NITE が 'nite'", () => {
    expect(REGULATION_TAGS.nite.category).toBe("nite");
  });
});
