import { NextResponse } from 'next/server';
import { INDEXABLE_LAW_NAVI_ENTRIES } from '@/lib/law-navi/seo-gate';
import { SITE_URL } from '@/lib/seo-metadata';

// 柱C-3 / S DRY: 絶対URLのオリジンは seo-metadata.ts の SITE_URL 単一ソース（末尾スラッシュ無し）。
const BASE = SITE_URL;

/**
 * 法令ナビ 条文パーマリンク（/law-navi/[lawId]/[artSlug]）の個別 sitemap。
 *
 * 正本 = INDEXABLE_LAW_NAVI_ENTRIES（seo-gate.ts）＝生成集合 LAW_NAVI_ENTRIES のうち
 * 付加価値条件（現場ことば版・分野・用語/号注釈）を満たす、または curated 由来の条のみ。
 * FT-D3（SEO ゲート・設計書 §5-3）: 全文取込で条文ページが数千規模へ広がったとき、
 * e-Gov 原文の単純ミラー（thin/duplicate）を index/sitemap から締め出す防波堤。
 * 生成集合⊇収載集合の関係で幽霊URL 0 を維持する（載る URL は全て解決する）。
 * 既収載の curated 条は grandfather で収載を維持（後退させない・§5-3 末尾）。
 * lastmod はコーパスの e-Gov 突合日ベースの固定日（条文データ更新PRで更新する）。
 */
const CORPUS_LASTMOD = '2026-07-11';

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function GET() {
  const urls = INDEXABLE_LAW_NAVI_ENTRIES.map(
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
