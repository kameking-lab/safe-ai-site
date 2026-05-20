import { describe, expect, it } from "vitest";
import { cdnCacheHeaders, noStoreHeaders } from "./api-cache";

describe("cdnCacheHeaders", () => {
  it("returns all three headers for STATIC profile", () => {
    const h = cdnCacheHeaders("STATIC");
    expect(h["Cache-Control"]).toContain("s-maxage=86400");
    expect(h["Cache-Control"]).toContain("stale-while-revalidate=604800");
    expect(h["CDN-Cache-Control"]).toBe(
      "public, s-maxage=86400, stale-while-revalidate=604800",
    );
    expect(h["Vercel-CDN-Cache-Control"]).toBe(
      "public, s-maxage=86400, stale-while-revalidate=604800",
    );
  });

  it("returns DAILY profile values (3600/86400)", () => {
    const h = cdnCacheHeaders("DAILY");
    expect(h["Vercel-CDN-Cache-Control"]).toBe(
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
  });

  it("returns INDUSTRY profile values (14400/86400)", () => {
    const h = cdnCacheHeaders("INDUSTRY");
    expect(h["Vercel-CDN-Cache-Control"]).toBe(
      "public, s-maxage=14400, stale-while-revalidate=86400",
    );
  });

  it("returns REALTIME profile values (300/3600)", () => {
    const h = cdnCacheHeaders("REALTIME");
    expect(h["Vercel-CDN-Cache-Control"]).toBe(
      "public, s-maxage=300, stale-while-revalidate=3600",
    );
  });

  it("includes max-age=0 in Cache-Control so browsers always revalidate", () => {
    const h = cdnCacheHeaders("DAILY");
    expect(h["Cache-Control"]).toContain("max-age=0");
    expect(h["Cache-Control"]).toContain("must-revalidate");
  });
});

describe("noStoreHeaders", () => {
  it("disables caching across all three layers", () => {
    const h = noStoreHeaders();
    expect(h["Cache-Control"]).toBe("no-store, must-revalidate");
    expect(h["CDN-Cache-Control"]).toBe("no-store, must-revalidate");
    expect(h["Vercel-CDN-Cache-Control"]).toBe("no-store, must-revalidate");
  });
});
