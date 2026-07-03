import { NextResponse } from 'next/server';
import { getAccidentCasesDataset } from '@/data/mock/accident-cases';
import { computeSitemapFreshness } from '@/lib/sitemap/freshness';
import { SITE_URL } from '@/lib/seo-metadata';

// 柱C-3 / S DRY: 絶対URLのオリジンは seo-metadata.ts の SITE_URL 単一ソース（末尾スラッシュ無し）。
const BASE = SITE_URL;

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function GET() {
  // 柱C-3-3 / A-3: 事故事例の個別詳細 /accidents/[id] をサイトマップに収載する。
  // 事故DB（約290件）はサイト最大級の独自コンテンツだが、本体 sitemap.xml には一覧 /accidents
  // しか載っておらず、個別ページの発見を Google の内部リンク巡回任せにしていた（判例 /court-cases/[id]
  // は収載済みなのに事故だけ漏れていた発見性の穴）。横断検索(#561)も /accidents/<id> へ深リンク済み。
  // 正本 getAccidentCasesDataset() を単一ソースに使う＝/accidents/[id] が findAccident() で解決する
  // 集合そのものなので、全URLが実在の詳細ページに解決し（幽霊URL 0）、データ追加にも自動追従する。
  const dataset = getAccidentCasesDataset();

  // lastmod は当日（new Date()）ではなく事故DBスナップショットの実生成日に追従させる。
  // 当日打ちは中身不変でも毎日 lastmod が動く lastmod スパムで、Google に無視される。
  // 事故の occurredOn は「災害が起きた日」であってページ更新日ではないため、保護具(#556)と同様に
  // データセット単位の更新日（accidentsDataUpdated）を全URL共通の lastmod に用いる。
  const buildToday = new Date().toISOString().slice(0, 10);
  const { accidentsDataUpdated } = computeSitemapFreshness(buildToday);

  // 同名IDの重複を避けつつ正本の全件を列挙する（横断検索の収載ロジックと同形）。
  const seen = new Set<string>();
  const urls = dataset
    .filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    })
    .map(
      (c) => `  <url>
    <loc>${escapeXml(`${BASE}/accidents/${c.id}`)}</loc>
    <lastmod>${accidentsDataUpdated}</lastmod>
    <changefreq>monthly</changefreq>
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
