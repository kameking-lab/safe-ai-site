import { describe, expect, it } from "vitest";
import { GET } from "./route";
import {
  HUMAN_VERIFIED_NOTICE_IDS,
  INDIVIDUALLY_VERIFIED_NOTICE_IDS,
  publicMhlwNotices,
  verifiedMhlwNotices,
} from "@/data/public-mhlw-notices";

async function getResponseAndXml() {
  const response = await GET();
  return { response, xml: await response.text() };
}

describe("GET /sitemap-circulars.xml individual primary-source boundary", () => {
  it("returns an application/xml urlset", async () => {
    const { response, xml } = await getResponseAndXml();
    expect(response.headers.get("Content-Type")).toContain("application/xml");
    expect(xml).toContain("<urlset");
    expect(xml).toContain(
      'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    );
  });

  it("keeps the secondary index separate and exposes one individually verified notice", () => {
    expect(publicMhlwNotices.length).toBeGreaterThan(0);
    expect(INDIVIDUALLY_VERIFIED_NOTICE_IDS.size).toBe(1);
    expect(HUMAN_VERIFIED_NOTICE_IDS).toBe(
      INDIVIDUALLY_VERIFIED_NOTICE_IDS,
    );
    expect(verifiedMhlwNotices.map((notice) => notice.id)).toEqual([
      "mhlw-notice-0014",
    ]);
  });

  it("emits only the individually verified circular detail URL", async () => {
    const { xml } = await getResponseAndXml();
    expect(xml.match(/<url(?:\s|>)/g)).toHaveLength(1);
    expect(xml).toContain(
      "https://www.anzen-ai-portal.jp/circulars/mhlw-notice-0014",
    );
    expect(xml).toContain("<lastmod>2026-08-02</lastmod>");
  });

  it("does not emit legacy nt-* IDs", async () => {
    const { xml } = await getResponseAndXml();
    expect(xml).not.toMatch(/\/circulars\/nt-/);
  });

  it("does not emit quarantined or public-but-unverified sequential IDs", async () => {
    const { xml } = await getResponseAndXml();
    const ids = [...xml.matchAll(/mhlw-notice-\d{4}/g)].map(
      (match) => match[0],
    );
    expect(ids).toEqual(["mhlw-notice-0014"]);
    expect(xml).not.toContain("mhlw-notice-0001");
    expect(xml).not.toContain("mhlw-notice-0870");
  });

  it("identifies the individually verified projection and is cacheable", async () => {
    const { response } = await getResponseAndXml();
    expect(response.headers.get("X-Data-Status")).toBe(
      "individually-verified",
    );
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=86400");
  });
});
