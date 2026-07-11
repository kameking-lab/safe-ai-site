import { NextResponse } from 'next/server';
import { computeSitemapFreshness } from '@/lib/sitemap/freshness';
import { SITE_URL } from '@/lib/seo-metadata';

// 柱C-3 / S DRY: 絶対URLのオリジンは seo-metadata.ts の SITE_URL 単一ソース（末尾スラッシュ無し）。
const BASE = SITE_URL;

export async function GET() {
  // 柱C-3-4 / A-3: 各子サイトマップの lastmod を「その子が列挙する URL の実データ最新日」に
  // 揃える。従来は全子サイトマップに当日（new Date()）を打っており、中身が変わらなくても
  // lastmod が毎日動く＝lastmod スパムだった（Google に無視され再クロールが遅延する）。
  const buildToday = new Date().toISOString().slice(0, 10);
  const {
    siteFreshest,
    freshestArticle,
    freshestNotice,
    accidentsDataUpdated,
    equipmentDataUpdated,
    chemicalsDataUpdated,
  } = computeSitemapFreshness(buildToday);

  const children: { loc: string; lastmod: string }[] = [
    // 本体（静的＋カテゴリ＋判例個別ページ等）。最新日はサイト全体の最新データ日に追従。
    { loc: `${BASE}/sitemap.xml`, lastmod: siteFreshest },
    // 記事個別ページ。公開記事の publishedAt / lastReviewedAt の最大値。
    { loc: `${BASE}/sitemap-articles.xml`, lastmod: freshestArticle },
    // 事故事例 個別ページ。事故DBスナップショットの生成日。
    { loc: `${BASE}/sitemap-accidents.xml`, lastmod: accidentsDataUpdated },
    // 通達個別ページ。通達の最新発出日。
    { loc: `${BASE}/sitemap-circulars.xml`, lastmod: freshestNotice },
    // 保護具個別ページ。保護具DBの生成日。
    { loc: `${BASE}/sitemap-equipment.xml`, lastmod: equipmentDataUpdated },
    // 化学物質 個別ページ（約3,515物質）。濃度基準DBスナップショットの生成日。
    { loc: `${BASE}/sitemap-chemicals.xml`, lastmod: chemicalsDataUpdated },
    // 法令ナビ 条文パーマリンク（約480条）。コーパスの e-Gov 突合日ベースの固定日
    //（sitemap-laws.xml/route.ts の CORPUS_LASTMOD と同値。条文データ更新PRで更新）。
    { loc: `${BASE}/sitemap-laws.xml`, lastmod: '2026-07-11' },
  ];

  const entries = children
    .map(
      (c) => `  <sitemap>
    <loc>${c.loc}</loc>
    <lastmod>${c.lastmod}</lastmod>
  </sitemap>`,
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
