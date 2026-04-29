import { NextResponse } from 'next/server';
import { safetyGoodsItems } from '@/data/mock/safety-goods';

const BASE = 'https://safe-ai-site.vercel.app';

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function GET() {
  const today = new Date().toISOString().split('T')[0];

  const urls = safetyGoodsItems
    .map(
      (item) => `  <url>
    <loc>${escapeXml(`${BASE}/equipment/${item.id}`)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
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
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
