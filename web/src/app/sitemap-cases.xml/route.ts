import { NextResponse } from "next/server";
import casesData from "@/data/cases.json";
import { getAccidentCasesDataset } from "@/data/mock/accident-cases";

const BASE = "https://safe-ai-site.vercel.app";
const TODAY = "2026-05-01";

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET() {
  const personaCaseUrls = (casesData as Array<{ slug: string }>).map(
    (c) => `  <url>
    <loc>${escapeXml(`${BASE}/cases/${c.slug}`)}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`,
  );

  // 事故DBは個別ページを持たないが、業種別フィルタを補助エントリとして公開
  const cases = getAccidentCasesDataset();
  const industryCounts = new Map<string, number>();
  for (const c of cases) {
    if (!c.workCategory) continue;
    industryCounts.set(c.workCategory, (industryCounts.get(c.workCategory) ?? 0) + 1);
  }
  const topIndustries = Array.from(industryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name]) => name);

  const accidentLandingUrl = `  <url>
    <loc>${escapeXml(`${BASE}/accidents`)}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;

  const accidentFilterUrls = topIndustries.map(
    (industry) => `  <url>
    <loc>${escapeXml(`${BASE}/accidents?industry=${encodeURIComponent(industry)}`)}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`,
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[accidentLandingUrl, ...personaCaseUrls, ...accidentFilterUrls].join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
