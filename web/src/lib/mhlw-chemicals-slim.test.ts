/**
 * スリム索引（chemical-slim-index.json）と全量統合（mhlw-chemicals.ts）の整合 CIゲート
 *
 * スリム索引は scripts/etl/build-chemical-slim-index.py の生成物。
 * 一覧・検索・RA判定が使う射影が getAllMergedChemicals() と全件一致することを検証する。
 * データ更新（compact.json / concentration-limits.json）後に再生成を忘れるとここで落ちる。
 */
import { describe, expect, it } from "vitest";
import {
  getAllMergedChemicals,
  MHLW_MERGED_CHEMICAL_COUNT,
  searchMergedChemicals,
  type MergedChemical,
} from "./mhlw-chemicals";
import {
  getAllMergedChemicalsSlim,
  findByCasSlim,
  searchMergedChemicalsSlim,
  MHLW_MERGED_CHEMICAL_COUNT_SLIM,
} from "./mhlw-chemicals-slim";

/** 一覧・検索・RA判定・物質情報カードが参照する射影 */
function projection(m: MergedChemical) {
  return {
    cas: m.cas,
    primaryName: m.primaryName,
    aliases: [...m.aliases].sort(),
    flags: m.flags,
    tier: m.details?.tier ?? "none",
    limit8h: m.details?.limit8h,
    limitShort: m.details?.limitShort,
    link: m.details?.link,
    uses: m.details?.uses,
    regulationTags: m.details?.limits?.regulationTags ?? [],
    twa: m.details?.limits?.twa,
    stel: m.details?.limits?.stel,
    ceiling: m.details?.limits?.ceiling,
    iarcGroup: m.details?.limits?.iarcGroup ?? undefined,
    mhlwSdsUrl: m.details?.limits?.mhlwSdsUrl,
    niteChripUrl: m.details?.limits?.niteChripUrl,
    prtrUrl: m.details?.limits?.prtrUrl,
    hasAcgihRef: !!m.details?.limits?.externalRefs?.acgih,
    hasJsohRef: !!m.details?.limits?.externalRefs?.jsoh,
    prtrLawReferences: m.details?.limits?.prtrLawReferences,
    chashinLawReferences: m.details?.limits?.chashinLawReferences,
  };
}

function keyOf(m: MergedChemical) {
  return m.cas ?? `name:${m.primaryName}`;
}

describe("スリム索引と全量統合の全件整合", () => {
  it("件数が一致する", () => {
    expect(MHLW_MERGED_CHEMICAL_COUNT_SLIM).toBe(MHLW_MERGED_CHEMICAL_COUNT);
    expect(getAllMergedChemicalsSlim().length).toBe(getAllMergedChemicals().length);
  });

  it("全物質の射影（名称・フラグ・限度値・タグ・URL）が一致する", () => {
    const full = new Map(getAllMergedChemicals().map((m) => [keyOf(m), projection(m)]));
    const slim = new Map(getAllMergedChemicalsSlim().map((m) => [keyOf(m), projection(m)]));
    expect([...slim.keys()].sort()).toEqual([...full.keys()].sort());
    const diffs: string[] = [];
    for (const [k, f] of full) {
      const s = slim.get(k)!;
      if (JSON.stringify(s) !== JSON.stringify(f)) {
        diffs.push(`${k}: slim=${JSON.stringify(s)} full=${JSON.stringify(f)}`);
        if (diffs.length >= 5) break;
      }
    }
    expect(diffs).toEqual([]);
  });

  it("検索結果（代表クエリ）が同一物質集合を返す", () => {
    for (const q of ["トルエン", "7664-93-9", "アンモニア", "108-88", "sulf"]) {
      const full = searchMergedChemicals(q, 10).map(keyOf);
      const slim = searchMergedChemicalsSlim(q, 10).map(keyOf);
      expect(new Set(slim), q).toEqual(new Set(full));
    }
  });

  it("findByCasSlim が正しく引ける", () => {
    expect(findByCasSlim("7664-93-9")?.primaryName).toBe("硫酸");
    expect(findByCasSlim("108-88-3")?.details?.limits?.regulationTags).toContain("poison-control");
  });
});
