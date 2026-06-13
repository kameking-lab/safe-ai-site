import { NextResponse } from 'next/server';
import { getPublishedArticleIndex } from '@/lib/articles';

const BASE = 'https://www.anzen-ai-portal.jp';

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function GET() {
  // 実在する公開済み記事（src/data/articles/*.json）のみを動的に列挙する。
  // 旧実装は realLawRevisions の lr-real-* ID から /articles/<id> を生成していたが、
  // それらは記事ルート（/articles/[slug]）に存在せず notFound() = 404 になる
  // 幽霊URL（soft404群）だった。記事の正本データは lib/articles に一本化する。
  // getPublishedArticleIndex は publishedAt > now() の時限記事を自動除外する。
  const articles = getPublishedArticleIndex();

  const urls = articles
    .map(
      (a) => `  <url>
    <loc>${escapeXml(`${BASE}/articles/${a.slug}`)}</loc>
    <lastmod>${a.lastReviewedAt}</lastmod>
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
