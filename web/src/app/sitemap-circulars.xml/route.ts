import { NextResponse } from 'next/server';
import { mhlwNotices } from '@/data/mhlw-notices';
import { latestIsoDate } from '@/lib/sitemap/lastmod';
import { SITE_URL } from '@/lib/seo-metadata';

// 柱C-3 / S DRY: 絶対URLのオリジンは seo-metadata.ts の SITE_URL 単一ソース（末尾スラッシュ無し）。
const BASE = SITE_URL;

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function GET() {
  const today = new Date().toISOString().split('T')[0];

  // 正本=mhlwNotices(/circulars/[id] が generateStaticParams で実生成する mhlw-notice-NNNN ID)。
  // 旧実装は officialNotices(notices-and-precedents・nt-* の別系統ID)を /circulars/<id> として
  // 出力していたが、/circulars/[id] は mhlwNotices しか解決せず全URLが notFound()=幽霊URL(soft404)
  // だった（柱C-3-2 で sitemap-equipment.xml に施した是正と同型）。
  // lastmod は各通達の発出日(issuedDate)に追従し、null/不正値は fallback、未来日は today で cap（柱C-3-4）。
  const urls = mhlwNotices
    .map(
      (n) => `  <url>
    <loc>${escapeXml(`${BASE}/circulars/${n.id}`)}</loc>
    <lastmod>${latestIsoDate([n.issuedDate], '2026-04-28', today)}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.6</priority>
  </url>`
    )
    .join('\n');

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
