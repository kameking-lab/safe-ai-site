import { describe, expect, it } from "vitest";
import compact from "@/data/deaths-mhlw/compact.json";
import { VERIFIED_FATAL_RECORDS, getVerifiedFatalRecord, fatalRecordSource } from "./fatal-records";
import { GET as fatalSitemap } from "@/app/sitemap-fatal-accidents.xml/route";
import { generateMetadata as fatalMetadata } from "@/app/(main)/fatal-accidents/[id]/page";
import { generateStaticParams as archiveParams } from "@/app/(main)/fatal-accidents/archive/[year]/page";
import { SITE_URL } from "@/lib/seo-metadata";

describe("source-verified detail discovery", () => {
  it("gives same-narrative official records distinct metadata and a year archive", async () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const record of VERIFIED_FATAL_RECORDS) {
      const meta = await fatalMetadata({ params: Promise.resolve({ id: record.id }) });
      expect(meta.alternates?.canonical).toBe(`${SITE_URL}/fatal-accidents/${record.id}`);
      expect(titles.has(String(meta.title))).toBe(false);
      expect(descriptions.has(String(meta.description))).toBe(false);
      titles.add(String(meta.title)); descriptions.add(String(meta.description));
    }
    const years = archiveParams().map(({ year }) => Number(year));
    expect(years.sort()).toEqual([2019, 2020, 2021, 2022, 2023]);
  });
  it("matches the source evidence and keeps ambiguous/unmatched records unpublished", () => {
    expect(VERIFIED_FATAL_RECORDS.length).toBeGreaterThan(2000);
    expect(VERIFIED_FATAL_RECORDS.length).toBeLessThan(2888);
    expect(VERIFIED_FATAL_RECORDS.length).toBeLessThan(compact.entries.length);
    expect(new Set(VERIFIED_FATAL_RECORDS.map(({ id }) => id)).size).toBe(VERIFIED_FATAL_RECORDS.length);
    expect(getVerifiedFatalRecord("2019-D-000038")).toBeUndefined();
    expect(getVerifiedFatalRecord("2024-D-000001")).toBeUndefined();
    expect(getVerifiedFatalRecord("unknown")).toBeUndefined();
    for (const record of VERIFIED_FATAL_RECORDS) {
      const source = fatalRecordSource(record);
      expect(record.description.trim().length).toBeGreaterThanOrEqual(80);
      expect(source.row).toBeGreaterThan(2);
      expect(source.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(source.url).toMatch(/^https:\/\/anzeninfo\.mhlw\.go\.jp\/anzen\/sib_xls\/sibou_db_r\d{2}\.xlsx$/);
    }
  });
  it("lists exactly the verified fatal records in a cacheable child sitemap", async () => {
    const response = fatalSitemap();
    const xml = await response.text();
    const expected = [
      ...VERIFIED_FATAL_RECORDS.map(({ id }) => `${SITE_URL}/fatal-accidents/${id}`),
      ...archiveParams().map(({ year }) => `${SITE_URL}/fatal-accidents/archive/${year}`),
    ];
    const actual = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => loc);
    expect(actual.sort()).toEqual(expected.sort());
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=86400");
  });

  it("applies the search view's emergency-number policy to public metadata", async () => {
    const meta = await fatalMetadata({ params: Promise.resolve({ id: "2022-D-000354" }) });
    const emergencyNumber = /(?:119|110|１１９|１１０)\s*番/u;
    expect(meta.description).not.toMatch(emergencyNumber);
    expect(meta.openGraph?.description).not.toMatch(emergencyNumber);
  });
});
