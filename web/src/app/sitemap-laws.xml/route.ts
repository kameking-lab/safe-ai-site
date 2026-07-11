import { NextResponse } from 'next/server';
import { LAW_NAVI_ENTRIES } from '@/lib/law-navi/permalink';
import { SITE_URL } from '@/lib/seo-metadata';

// 柱C-3 / S DRY: 絶対URLのオリジンは seo-metadata.ts の SITE_URL 単一ソース（末尾スラッシュ無し）。
const BASE = SITE_URL;

/**
 * 法令ナビ 条文パーマリンク（/law-navi/[lawId]/[artSlug]）の個別 sitemap。
 * 正本 = LAW_NAVI_ENTRIES（/law-navi/[lawId]/[artSlug] の generateStaticParams が
 * 実生成する集合そのもの）＝収載集合と解決集合が定義上一致し幽霊URL 0
 * （sitemap-circulars.xml が mhlwNotices を正本にするのと同型）。
 * lastmod はコーパスの e-Gov 突合日ベースの固定日（条文データ更新PRで更新する）。
 */
const CORPUS_LASTMOD = '2026-07-11';

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function GET() {
  const urls = LAW_NAVI_ENTRIES.map(
    (e) => `  <url>
    <loc>${escapeXml(`${BASE}${e.path}`)}</loc>
    <lastmod>${CORPUS_LASTMOD}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`
  ).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
