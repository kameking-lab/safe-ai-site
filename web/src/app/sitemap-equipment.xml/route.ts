import { NextResponse } from "next/server";

/**
 * 互換URLは残すが、未検証の商品レコードは1件も列挙しない。
 * sitemap-index.xml からもこの子サイトマップを除外する。
 */
export async function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Data-Status": "quarantined",
    },
  });
}
