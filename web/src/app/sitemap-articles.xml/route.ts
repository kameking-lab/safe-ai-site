import { NextResponse } from 'next/server';
import { realLawRevisions } from '@/data/mock/real-law-revisions';

const BASE = 'https://safe-ai-site.vercel.app';
const TODAY = new Date().toISOString().split('T')[0];

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function GET() {
  const articles = realLawRevisions.filter(
    (a) => a.publishedAt <= TODAY
  );

  const urls = articles
    .map(
      (a) => `  <url>
    <loc>${escapeXml(`${BASE}/articles/${a.id}`)}</loc>
    <lastmod>${a.publishedAt}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
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
