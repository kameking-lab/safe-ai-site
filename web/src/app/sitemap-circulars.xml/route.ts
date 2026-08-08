import { NextResponse } from "next/server";
import { verifiedMhlwNotices } from "@/data/public-mhlw-notices";
import { MHLW_HEAT_NOTICE_0520_6_SNAPSHOT } from "@/data/source-snapshots/mhlw-heat-notice-0520-6";
import { SITE_URL } from "@/lib/seo-metadata";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function GET() {
  const urls = verifiedMhlwNotices
    .map(
      (notice) => `  <url>
    <loc>${escapeXml(`${SITE_URL}/circulars/${notice.id}`)}</loc>
    <lastmod>${MHLW_HEAT_NOTICE_0520_6_SNAPSHOT.independentPrimarySourceReview.reviewedAt}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.6</priority>
  </url>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "X-Data-Status": "individually-verified",
    },
  });
}
