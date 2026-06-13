import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";
import { COURT_CASES } from "@/data/court-cases";

/**
 * 柱C-3-3 回帰テスト: どの sitemap にも収載されていなかった実在 indexable ページの
 * 追加（/court-cases・/whats-new・/site-records 系）を固定し、欠落の再発を防ぐ。
 *
 * 旧状態: これらのページは page.tsx として実在し indexable だが、sitemap.ts にも
 * 子 sitemap(-articles/-circulars/-equipment) にも一切含まれず、検索エンジンに
 * 発見されにくい孤立ページだった。
 */
const BASE = "https://www.anzen-ai-portal.jp";

describe("sitemap.xml（柱C-3-3 欠落ページ追加）", () => {
  const entries = sitemap();
  const urls = entries.map((e) => e.url);
  const urlSet = new Set(urls);

  const has = (path: string) => urlSet.has(`${BASE}${path}`);

  it("新着ハブ /whats-new を収載する", () => {
    expect(has("/whats-new")).toBe(true);
  });

  it("労災裁判例の一覧・責任解説ページを収載する", () => {
    expect(has("/court-cases")).toBe(true);
    expect(has("/court-cases/employer-liability")).toBe(true);
  });

  it("印刷専用ページ /court-cases/print は robots noindex のため収載しない", () => {
    expect(has("/court-cases/print")).toBe(false);
  });

  it("個別判例ページ（/court-cases/[id]）を全件収載する", () => {
    for (const c of COURT_CASES) {
      expect(has(`/court-cases/${c.id}`)).toBe(true);
    }
    const courtCaseDetailUrls = urls.filter((u) =>
      /\/court-cases\/[^/]+$/.test(u.replace(`${BASE}`, "")),
    );
    // 一覧・解説・印刷を除いた個別判例URLが COURT_CASES と1対1
    const detailIds = courtCaseDetailUrls
      .map((u) => u.replace(`${BASE}/court-cases/`, ""))
      .filter((id) => id !== "employer-liability" && id !== "print");
    expect(new Set(detailIds).size).toBe(COURT_CASES.length);
  });

  it("記録キット（/site-records ハブ＋全サブページ）を収載する", () => {
    const expected = [
      "/site-records",
      "/site-records/patrol",
      "/site-records/near-miss",
      "/site-records/inspection",
      "/site-records/committee",
      "/site-records/induction",
      "/site-records/monthly",
      "/site-records/procedure",
      "/site-records/incident-report",
      "/site-records/qualifications",
      "/site-records/calendar",
    ];
    for (const path of expected) {
      expect(has(path)).toBe(true);
    }
  });

  it("URL の重複がない（二重掲載ゼロ）", () => {
    expect(urlSet.size).toBe(urls.length);
  });
});
