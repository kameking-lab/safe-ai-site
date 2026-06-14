/**
 * サイトマップ各セクションの「実データ最新日」を一括導出する純粋ヘルパー（柱C-3-4 / A-3）。
 *
 * 背景:
 *  - `sitemap.ts`（本体 sitemap.xml）は各データ源の最新日を lastmod に追従させているが、
 *    `sitemap-index.xml` は全ての子サイトマップに `new Date()`（＝当日）を打っていた。
 *    毎日中身が変わらなくても lastmod が当日に動く＝lastmod スパムであり、Google に
 *    「このサイトマップの lastmod は信用できない」と学習され、再クロールが遅れる。
 *  - そこで子サイトマップの lastmod も「子が列挙する URL の実データ最新日」に揃える。
 *
 * 方針は {@link latestIsoDate} に準拠:
 *  - 現在時刻そのものを lastmod にしない（データに実在する日付の最大値のみ採用）。
 *  - 将来日（将来施行の法改正 enforcement_date 等）はビルド日 cap で除外する。
 *  - 有効な日付が無ければ著者指定の fallback（手書き日付）を返す。
 *
 * fallback 値は `sitemap.ts` の各 lastmod と一致させており、出力が乖離しないようにしている。
 */
import { mhlwNotices } from "@/data/mhlw-notices";
import { COURT_CASES } from "@/data/court-cases";
import { lawRevisionCores } from "@/data/mock/law-revisions";
import { SERIOUS_CASES_META } from "@/lib/accident-news/serious-cases";
import { buildNewsHubItems } from "@/lib/news-hub";
import equipmentDb from "@/data/safety-equipment-db.json";
import { getPublishedArticleIndex } from "@/lib/articles";
import { latestIsoDate } from "@/lib/sitemap/lastmod";

/** 各サイトマップセクションの実データ最新日（YYYY-MM-DD）。 */
export interface SitemapFreshness {
  /** /whats-new・トップが集約する新着（法改正＋通達＋メディア＋速報＋重大災害）の最新日。 */
  freshestNews: string;
  /** /laws が扱う法改正の最新公表日。 */
  freshestLawRevision: string;
  /** /circulars が扱う通達の最新発出日（sitemap-circulars.xml の正本）。 */
  freshestNotice: string;
  /** /court-cases が扱う判例の最新判決日。 */
  freshestCourtCase: string;
  /** 死亡災害DBスナップショットの生成日（/accidents 系のデータ実更新日）。 */
  accidentsDataUpdated: string;
  /** 保護具DBの生成日（sitemap-equipment.xml が列挙する /equipment 個別ページの実更新日）。 */
  equipmentDataUpdated: string;
  /** /articles 一覧の最新更新日（sitemap-articles.xml の正本）。 */
  freshestArticle: string;
  /** サイト全体（本体 sitemap.xml＝トップ）の最新日＝主要データ源の最大値。 */
  siteFreshest: string;
}

/**
 * サイトマップ各セクションの実データ最新日を計算する。
 *
 * @param buildToday 未来日を除外する上限（ビルド日 YYYY-MM-DD）。呼び出し側で
 *   `new Date().toISOString().slice(0, 10)` を渡す（純粋関数に保つため引数化）。
 */
export function computeSitemapFreshness(buildToday: string): SitemapFreshness {
  const freshestNews = latestIsoDate(
    buildNewsHubItems({ lawLimit: 200, noticeLimit: 200, mediaLimit: 200, seriousCaseLimit: 200 }).map(
      (i) => i.date,
    ),
    "2026-06-11",
    buildToday,
  );
  const freshestLawRevision = latestIsoDate(
    lawRevisionCores.map((r) => r.publishedAt),
    "2026-04-19",
    buildToday,
  );
  const freshestNotice = latestIsoDate(
    mhlwNotices.map((n) => n.issuedDate),
    "2026-04-28",
    buildToday,
  );
  const freshestCourtCase = latestIsoDate(
    COURT_CASES.map((c) => c.date),
    "2026-06-06",
    buildToday,
  );
  const accidentsDataUpdated = latestIsoDate(
    [SERIOUS_CASES_META.generatedAt?.slice(0, 10)],
    "2026-04-19",
    buildToday,
  );
  const equipmentDataUpdated = latestIsoDate([equipmentDb.generatedAt], "2026-04-29", buildToday);
  const freshestArticle = latestIsoDate(
    getPublishedArticleIndex().flatMap((a) => [a.publishedAt, a.lastReviewedAt]),
    "2026-04-28",
    buildToday,
  );
  const siteFreshest = latestIsoDate(
    [freshestNews, freshestLawRevision, freshestNotice, freshestCourtCase, accidentsDataUpdated],
    "2026-04-19",
    buildToday,
  );

  return {
    freshestNews,
    freshestLawRevision,
    freshestNotice,
    freshestCourtCase,
    accidentsDataUpdated,
    equipmentDataUpdated,
    freshestArticle,
    siteFreshest,
  };
}
