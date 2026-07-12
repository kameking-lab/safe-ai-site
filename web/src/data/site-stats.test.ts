import { describe, expect, it } from "vitest";
import { SITE_STATS } from "@/data/site-stats";
import { allLawArticles, LAW_SOURCE_COUNT } from "@/data/laws";
import { mhlwNotices } from "@/data/mhlw-notices";
import { MHLW_MERGED_CHEMICAL_COUNT } from "@/lib/mhlw-chemicals";
import { LAW_NAVI_ENTRIES } from "@/lib/law-navi/permalink";
import { getAllFulltextNaviEntries } from "@/lib/law-navi/fulltext-navi";
import { mhlwLeaflets } from "@/data/mhlw-leaflets";
import { courtPrecedents } from "@/data/mock/notices-and-precedents";
import equipmentDb from "@/data/safety-equipment-db.json";
import { realAccidentCases } from "@/data/mock/real-accident-cases";
import { realAccidentCasesExtra } from "@/data/mock/real-accident-cases-extra";
import { realAccidentCasesExtra2 } from "@/data/mock/real-accident-cases-extra2";
import { realAccidentCasesExtra3 } from "@/data/mock/real-accident-cases-extra3";
import { realAccidentCasesDiverseIndustries } from "@/data/mock/real-accident-cases-diverse-industries";
import { realAccidentCases20242026 } from "@/data/mock/real-accident-cases-2024-2026";
import { realAccidentCases2025Preliminary } from "@/data/mock/real-accident-cases-2025-preliminary";

/**
 * C-1（モバイル実速度の構造是正）: SITE_STATS はバンドル軽量化のため静的リテラル。
 * 本テストが実データから件数を再計算して突合し、データ更新でズレたら落ちる
 * （落ちたら site-stats.ts のリテラルを実値へ更新する）。
 * 表示値の捏造・陳腐化をビルドゲートで防ぐための機械検証。
 */
describe("SITE_STATS リテラルと実データの整合", () => {
  it("siteCuratedCaseCount = real-accident-cases* の合算", () => {
    const curated =
      realAccidentCases.length +
      realAccidentCasesExtra.length +
      realAccidentCasesExtra2.length +
      realAccidentCasesExtra3.length +
      realAccidentCasesDiverseIndustries.length +
      realAccidentCases20242026.length +
      realAccidentCases2025Preliminary.length;
    expect(SITE_STATS.siteCuratedCaseCount).toBe(curated.toLocaleString("en-US"));
  });

  it("mhlwNoticeCount = mhlw-notices.ts の件数", () => {
    expect(SITE_STATS.mhlwNoticeCount).toBe(mhlwNotices.length.toLocaleString("en-US"));
  });

  it("equipmentItemCount = safety-equipment-db.json の items 数", () => {
    const count = (equipmentDb as { items?: unknown[] }).items?.length ?? 0;
    expect(SITE_STATS.equipmentItemCount).toBe(count.toLocaleString("en-US"));
  });

  it("lawArticleCount / ragArticleCount = allLawArticles の件数", () => {
    expect(SITE_STATS.lawArticleCount).toBe(allLawArticles.length.toLocaleString("en-US"));
    expect(SITE_STATS.ragArticleCount).toBe(allLawArticles.length.toLocaleString("en-US"));
  });

  it("lawSourceCount = data/laws の LAW_SOURCE_COUNT", () => {
    expect(SITE_STATS.lawSourceCount).toBe(LAW_SOURCE_COUNT.toLocaleString("en-US"));
  });

  it("mhlwMergedChemicalCount = lib/mhlw-chemicals の MHLW_MERGED_CHEMICAL_COUNT", () => {
    expect(SITE_STATS.mhlwMergedChemicalCount).toBe(
      MHLW_MERGED_CHEMICAL_COUNT.toLocaleString("en-US"),
    );
  });

  it("lawNaviTotalArticleCount = LAW_NAVI_ENTRIES + 全文由来ギャップ の合算", async () => {
    const fulltext = await getAllFulltextNaviEntries();
    const total = LAW_NAVI_ENTRIES.length + fulltext.length;
    expect(SITE_STATS.lawNaviTotalArticleCount).toBe(total.toLocaleString("en-US"));
  });

  it("mhlwCircularCount / mhlwKokujiCount / mhlwShishinCount = mhlw-notices.ts の docType別件数", () => {
    const byType = { 通達: 0, 告示: 0, 指針: 0 } as Record<string, number>;
    for (const n of mhlwNotices) {
      byType[n.docType] = (byType[n.docType] ?? 0) + 1;
    }
    expect(SITE_STATS.mhlwCircularCount).toBe(byType["通達"].toLocaleString("en-US"));
    expect(SITE_STATS.mhlwKokujiCount).toBe(byType["告示"].toLocaleString("en-US"));
    expect(SITE_STATS.mhlwShishinCount).toBe(byType["指針"].toLocaleString("en-US"));
  });

  it("mhlwLeafletCount = mhlw-leaflets.ts の件数", () => {
    expect(SITE_STATS.mhlwLeafletCount).toBe(mhlwLeaflets.length.toLocaleString("en-US"));
  });

  it("mhlwResourcesTotalCount = mhlwNoticeCount + mhlwLeafletCount", () => {
    const total = mhlwNotices.length + mhlwLeaflets.length;
    expect(SITE_STATS.mhlwResourcesTotalCount).toBe(total.toLocaleString("en-US"));
  });

  it("courtPrecedentCount = data/mock/notices-and-precedents.ts の件数", () => {
    expect(SITE_STATS.courtPrecedentCount).toBe(courtPrecedents.length.toLocaleString("en-US"));
  });
});
