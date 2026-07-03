import { describe, expect, it } from "vitest";
import { computeSitemapFreshness } from "./freshness";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

describe("computeSitemapFreshness（柱C-3-4 / A-3 サイトマップ lastmod 動的化）", () => {
  const today = "2026-06-14";
  const f = computeSitemapFreshness(today);

  it("全フィールドが YYYY-MM-DD 形式の有効日付", () => {
    for (const [k, v] of Object.entries(f)) {
      expect(v, k).toMatch(ISO);
    }
  });

  it("全フィールドがビルド日 cap 以下＝未来日を lastmod に出さない", () => {
    for (const [k, v] of Object.entries(f)) {
      expect(v <= today, `${k}=${v} は ${today} 以下であるべき`).toBe(true);
    }
  });

  it("同一 buildToday で決定的（純粋関数・副作用なし）", () => {
    expect(computeSitemapFreshness(today)).toEqual(f);
  });

  it("未来の cap を渡しても cap 値そのものは返らない＝当日固定の lastmod スパムでない", () => {
    // データに 2099 年の日付は存在しないため、各 lastmod は実データの最新日になる。
    // もし new Date()/cap をそのまま打っていれば 2099-01-01 が返り、このテストが落ちる。
    const future = "2099-01-01";
    const ff = computeSitemapFreshness(future);
    for (const [k, v] of Object.entries(ff)) {
      expect(v, k).not.toBe(future);
      expect(v < future, `${k}=${v} は ${future} 未満（実データ由来）であるべき`).toBe(true);
    }
  });

  it("chemicalsDataUpdated は濃度基準DBの generatedAt（2026-05-24）に追従する", () => {
    // 追補5: sitemap-chemicals.xml の全URL共通 lastmod。当日固定でなくデータ生成日に一致。
    expect(f.chemicalsDataUpdated).toBe("2026-05-24");
  });

  it("siteFreshest は集約元 5 データ源の最大値以上（本体 sitemap.xml の代表最新日）", () => {
    expect(f.siteFreshest >= f.freshestNews).toBe(true);
    expect(f.siteFreshest >= f.freshestLawRevision).toBe(true);
    expect(f.siteFreshest >= f.freshestNotice).toBe(true);
    expect(f.siteFreshest >= f.freshestCourtCase).toBe(true);
    expect(f.siteFreshest >= f.accidentsDataUpdated).toBe(true);
  });
});
