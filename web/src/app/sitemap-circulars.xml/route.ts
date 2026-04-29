import { NextResponse } from 'next/server';
import { officialNotices } from '@/data/mock/notices-and-precedents';

const BASE = 'https://safe-ai-site.vercel.app';

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function GET() {
  const urls = officialNotices
    .map(
      (n) => `  <url>
    <loc>${escapeXml(`${BASE}/circulars/${n.id}`)}</loc>
    <lastmod>${n.publishedAt}</lastmod>
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
