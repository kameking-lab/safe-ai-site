import { NextResponse } from 'next/server';
import { getAllEquipment } from '@/lib/equipment-recommendation';

const BASE = 'https://www.anzen-ai-portal.jp';

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function GET() {
  const today = new Date().toISOString().split('T')[0];

  // 正本=getAllEquipment()(eq-NNNN・/equipment/[id] が generateStaticParams で実生成する正規ID)。
  // 旧実装は safetyGoodsItems(/goods 用・ee-/fg-/hc- 等の別系統ID)を /equipment/<id> として
  // 出力していたが、/equipment/[id] は eq-NNNN しか解決せず全URLが notFound()=幽霊URL(soft404)だった。
  const urls = getAllEquipment()
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
