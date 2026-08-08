import { NextResponse } from 'next/server';

export async function GET() {
  // 2026-07-24: ローカル事故本文と一次個票の不一致を確認したため全件隔離。
  // 本文hash・属性・死傷・事故型の再照合済みallowlistができるまでURLを出さない。
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Data-Status': 'quarantined',
    },
  });
}
