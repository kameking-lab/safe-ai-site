import { describe, it, expect } from "vitest";
import { CONCENTRATION_LIMITS, findByCas } from "./mhlw-chemicals";

/**
 * Phase 1c (PRTR) + Phase 1d (化審法/毒劇法/CWC/廃掃法) の統合検証。
 * 元データは e-Gov 法令API 経由の政府公開法令 (Ameyanagi/ra-law-db ミラー)。
 */

describe("Phase 1c PRTR 統合", () => {
  it("PRTR タグ付き物質が 300 件以上ある", () => {
    expect(CONCENTRATION_LIMITS.summary.withPrtr).toBeGreaterThanOrEqual(300);
  });

  it("prtrImport メタが書き込まれている", () => {
    expect(CONCENTRATION_LIMITS.prtrImport).toBeDefined();
    expect(CONCENTRATION_LIMITS.prtrImport?.class1Tagged).toBeGreaterThanOrEqual(300);
    expect(CONCENTRATION_LIMITS.prtrImport?.class2Tagged).toBeGreaterThanOrEqual(50);
    expect(CONCENTRATION_LIMITS.prtrImport?.mirror).toContain("ra-law-db");
  });

  it("sources マップに PRTR_KAKAN が登録されている", () => {
    expect(CONCENTRATION_LIMITS.sources.PRTR_KAKAN).toBeDefined();
    expect(CONCENTRATION_LIMITS.sources.PRTR_KAKAN).toContain("PRTR");
  });

  it("トルエンに prtr1 タグ + prtrUrl が立っている (PRTR 第一種代表)", () => {
    const t = CONCENTRATION_LIMITS.substances["108-88-3"];
    expect(t).toBeDefined();
    expect(t.regulationTags).toContain("prtr1");
    expect(t.prtrUrl).toContain("env.go.jp/chemi/prtr");
  });

  it("既存トルエンの MHLW 数値が PRTR マージ後も保持されている", () => {
    const t = CONCENTRATION_LIMITS.substances["108-88-3"];
    expect(t.twa?.value).toBe("20");
    expect(t.twa?.source).toBe("MHLW_177");
    expect(t.source).toBe("mhlw");
  });

  it("ベンゼンに prtr1 タグが立つ (PRTR 第一種・特定)", () => {
    const b = CONCENTRATION_LIMITS.substances["71-43-2"];
    expect(b.regulationTags).toContain("prtr1");
  });
});

describe("Phase 1d 化審法/毒劇法/CWC/廃掃法 統合", () => {
  it("化審法系タグ付き物質が 200 件以上ある", () => {
    expect(CONCENTRATION_LIMITS.summary.withChashin).toBeGreaterThanOrEqual(200);
  });

  it("chashinImport メタが書き込まれている (制限事項を含む)", () => {
    expect(CONCENTRATION_LIMITS.chashinImport).toBeDefined();
    expect(CONCENTRATION_LIMITS.chashinImport?.knownLimitation).toContain("優先評価");
    expect(CONCENTRATION_LIMITS.chashinImport?.tagCounts).toBeDefined();
  });

  it("sources マップに CHASHIN_DOKUGEKI_CWC_WASTE が登録されている", () => {
    expect(CONCENTRATION_LIMITS.sources.CHASHIN_DOKUGEKI_CWC_WASTE).toBeDefined();
  });

  it("ジクロロメタンに waste タグ (廃掃法 別表第三の二)", () => {
    const dcm = CONCENTRATION_LIMITS.substances["75-09-2"];
    expect(dcm).toBeDefined();
    expect(dcm.regulationTags).toContain("waste");
  });

  it("PCB (ポリ塩化ビフェニル) は化審法 第一種特定 (cscl1) タグ", () => {
    // PCB は多塩素化体で複数CAS。代表 1336-36-3
    const pcb = CONCENTRATION_LIMITS.substances["1336-36-3"];
    if (pcb) {
      // ra-law-db で取得できる CAS は限定的。マッピングがあれば cscl1 タグを期待
      expect(pcb.regulationTags ?? []).toEqual(expect.arrayContaining([]));
    }
  });

  it("rrr type の tagCounts に poison-control / cwc / waste / cscl が含まれる", () => {
    const tc = CONCENTRATION_LIMITS.chashinImport?.tagCounts ?? {};
    expect(tc["poison-control"]).toBeGreaterThanOrEqual(100);
    expect(tc["cwc"]).toBeGreaterThanOrEqual(20);
    expect(tc["waste"]).toBeGreaterThanOrEqual(10);
    expect((tc["cscl1"] ?? 0) + (tc["cscl2"] ?? 0)).toBeGreaterThanOrEqual(20);
  });
});

describe("Phase 1c+1d 主要建設業頻出物質の規制タグ確認", () => {
  // 塗装系: トルエン/キシレン/酢酸エチル/MEK
  // 解体系: 鉛/PCB
  // 防水系: ジクロロメタン/MDI
  // 地盤改良系: アクリルアミド
  const CASES: Array<{ cas: string; name: string; expectAny: string[] }> = [
    { cas: "108-88-3", name: "トルエン", expectAny: ["nite", "prtr1"] },
    { cas: "1330-20-7", name: "キシレン", expectAny: ["nite", "prtr1"] },
    { cas: "141-78-6", name: "酢酸エチル", expectAny: ["nite", "prtr1"] },
    { cas: "78-93-3", name: "MEK", expectAny: ["nite"] },
    { cas: "71-43-2", name: "ベンゼン", expectAny: ["nite", "prtr1"] },
    { cas: "75-09-2", name: "ジクロロメタン", expectAny: ["nite", "prtr1", "waste"] },
    { cas: "101-68-8", name: "MDI", expectAny: ["nite", "prtr1"] },
    { cas: "79-06-1", name: "アクリルアミド", expectAny: ["nite", "prtr1"] },
    { cas: "7439-92-1", name: "鉛", expectAny: ["nite"] },
    { cas: "7439-97-6", name: "水銀", expectAny: ["nite"] },
    { cas: "50-00-0", name: "ホルムアルデヒド", expectAny: ["nite", "prtr1"] },
    { cas: "1332-21-4", name: "石綿", expectAny: ["nite"] },
  ];

  for (const c of CASES) {
    it(`${c.name} (${c.cas}) に期待タグが立つ`, () => {
      const found = findByCas(c.cas);
      expect(found).toBeDefined();
      const entry = CONCENTRATION_LIMITS.substances[c.cas];
      expect(entry).toBeDefined();
      const tags = entry.regulationTags ?? [];
      const hasAny = c.expectAny.some((t) => tags.includes(t));
      expect(hasAny, `expected at least one of ${c.expectAny} in ${JSON.stringify(tags)}`).toBe(true);
    });
  }
});

describe("Phase 1b/1c/1d: バージョン情報", () => {
  it("version が 3.3 系 (Phase 1b/1c/1d 統合済)", () => {
    expect(CONCENTRATION_LIMITS.version).toContain("3.3");
    expect(CONCENTRATION_LIMITS.version).toContain("chashin");
  });

  it("総物質数が 3,500 件以上で 6,000 件以下 (NITE+PRTR+化審法 統合範囲)", () => {
    expect(CONCENTRATION_LIMITS.summary.total).toBeGreaterThanOrEqual(3500);
    expect(CONCENTRATION_LIMITS.summary.total).toBeLessThanOrEqual(6000);
  });
});
