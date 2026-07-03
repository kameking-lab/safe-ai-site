import { NextResponse } from 'next/server';
import { CONCENTRATION_LIMITS } from '@/lib/mhlw-chemicals';
import { computeSitemapFreshness } from '@/lib/sitemap/freshness';

const BASE = 'https://www.anzen-ai-portal.jp';

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function GET() {
  // 柱C-3-3 追補5 / A-3: 化学物質の個別詳細 /chemical-database/[cas] をサイトマップに収載する。
  // 濃度基準DB（約3,515物質）はサイト最大級の独自コンテンツ（物質ごとに濃度基準値・GHS区分・
  // 関連法令＝化管法/PRTR・化審法・毒劇法等を出典付きで持つ自己canonicalな実在ページ）だが、
  // 本体 sitemap.xml には一覧 /chemical-database しか載っておらず、3,515本の個別ページの発見を
  // Google の内部リンク巡回任せにしていた（事故 /accidents/[id]・保護具 /equipment/[id] は
  // 子サイトマップ収載済みなのに、より大きい化学物質DBだけ漏れていた発見性の穴）。
  //
  // 正本＝`CONCENTRATION_LIMITS.substances` のキー集合を単一ソースに使う。詳細ページ
  // /chemical-database/[cas] は `CONCENTRATION_LIMITS.substances[normalizeCas(cas)]` が無い CAS を
  // notFound() で弾くため、このキー集合こそが「実在の詳細ページに解決する CAS の全体」＝
  // 全URLが必ず解決し（幽霊URL 0）、データ追加にも自動追従する。キーは既にノーマライズ済み
  // （数字とハイフンのみ・全角/空白なし）で URL 安全なため、詳細ページの canonical
  // `/chemical-database/${cas}`（decodeURIComponent(param)）と 1:1 一致する。
  const casKeys = Object.keys(CONCENTRATION_LIMITS.substances);

  // lastmod は当日（new Date()）ではなく濃度基準DBスナップショットの実生成日（generatedAt）に
  // 追従させる。当日打ちは中身不変でも毎日 lastmod が動く lastmod スパムで Google に無視される。
  // 事故・保護具の子サイトマップと同様にデータセット単位の更新日を全URL共通の lastmod に用いる。
  const buildToday = new Date().toISOString().slice(0, 10);
  const { chemicalsDataUpdated } = computeSitemapFreshness(buildToday);

  const urls = casKeys
    .map(
      (cas) => `  <url>
    <loc>${escapeXml(`${BASE}/chemical-database/${cas}`)}</loc>
    <lastmod>${chemicalsDataUpdated}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`,
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
