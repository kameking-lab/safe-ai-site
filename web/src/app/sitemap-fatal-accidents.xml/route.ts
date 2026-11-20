import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/seo-metadata";
import {
  FATAL_RECORDS_VERIFIED_ON,
  VERIFIED_FATAL_RECORDS,
  VERIFIED_FATAL_RECORD_YEARS,
} from "@/lib/seo/fatal-records";

export const dynamic = "force-static";
export function GET() {
  const paths = [
    ...VERIFIED_FATAL_RECORDS.map(({ id }) => `/fatal-accidents/${id}`),
    ...VERIFIED_FATAL_RECORD_YEARS.map((year) => `/fatal-accidents/archive/${year}`),
  ];
  const entries = paths.map((path) =>
    `<url><loc>${SITE_URL}${path}</loc><lastmod>${FATAL_RECORDS_VERIFIED_ON}</lastmod></url>`,
  ).join("\n");
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=86400, s-maxage=86400" } });
}
