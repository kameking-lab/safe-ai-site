import { NextResponse } from 'next/server';
import { computeSitemapFreshness } from '@/lib/sitemap/freshness';

const BASE = 'https://www.anzen-ai-portal.jp';

export async function GET() {
  // 柱C-3-4 / A-3: 各子サイトマップの lastmod を「その子が列挙する URL の実データ最新日」に
  // 揃える。従来は全子サイトマップに当日（new Date()）を打っており、中身が変わらなくても
  // lastmod が毎日動く＝lastmod スパムだった（Google に無視され再クロールが遅延する）。
  const buildToday = new Date().toISOString().slice(0, 10);
  const { siteFreshest, freshestArticle, freshestNotice, equipmentDataUpdated } =
    computeSitemapFreshness(buildToday);

  const children: { loc: string; lastmod: string }[] = [
    // 本体（静的＋カテゴリ＋判例個別ページ等）。最新日はサイト全体の最新データ日に追従。
    { loc: `${BASE}/sitemap.xml`, lastmod: siteFreshest },
    // 記事個別ページ。公開記事の publishedAt / lastReviewedAt の最大値。
    { loc: `${BASE}/sitemap-articles.xml`, lastmod: freshestArticle },
    // 通達個別ページ。通達の最新発出日。
    { loc: `${BASE}/sitemap-circulars.xml`, lastmod: freshestNotice },
    // 保護具個別ページ。保護具DBの生成日。
    { loc: `${BASE}/sitemap-equipment.xml`, lastmod: equipmentDataUpdated },
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
