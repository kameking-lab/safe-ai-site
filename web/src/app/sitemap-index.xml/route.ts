import { NextResponse } from 'next/server';

const BASE = 'https://safe-ai-site.vercel.app';

export async function GET() {
  const today = new Date().toISOString().split('T')[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE}/sitemap.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE}/sitemap-articles.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE}/sitemap-circulars.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE}/sitemap-equipment.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
