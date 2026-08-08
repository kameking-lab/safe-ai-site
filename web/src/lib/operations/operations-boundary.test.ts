import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import {
  isOptionalTrackingPath,
  sanitizedAnalyticsLocation,
} from "@/lib/analytics-privacy";
import { RUM_ROUTE_TEMPLATES, rumPayloadSchema } from "@/lib/rum/schema";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

describe("operations cockpit privacy and indexing boundaries", () => {
  it("performs a server-side authorization check before loading operations data", () => {
    const page = source("src/app/admin/operations/page.tsx");
    const authCheck = page.indexOf("await hasAdminPageAccess()");
    const dataLoad = page.indexOf("getOperationsCockpitData()");

    expect(page).toContain('import { notFound } from "next/navigation"');
    expect(authCheck).toBeGreaterThan(-1);
    expect(dataLoad).toBeGreaterThan(authCheck);
    expect(page.slice(authCheck, dataLoad)).toContain("notFound()");
    expect(page).not.toContain('"use client"');
  });

  it("sets noindex/noarchive and private no-store headers for all admin routes", () => {
    const page = source("src/app/admin/operations/page.tsx");
    const config = source("next.config.ts");

    expect(page).toContain("index: false");
    expect(page).toContain("follow: false");
    expect(page).toContain("noarchive: true");
    expect(page).toContain('export const dynamic = "force-dynamic"');
    expect(page).toContain("export const revalidate = 0");
    expect(config).toContain('source: "/admin/:path*"');
    expect(config).toContain('"private, no-store, max-age=0, must-revalidate"');
    expect(config).toContain('"noindex, nofollow, noarchive"');
  });

  it("excludes operations from analytics, RUM, sitemap, and service-worker cache", () => {
    const serviceWorker = source("public/sw.js");

    expect(isOptionalTrackingPath("/admin/operations")).toBe(false);
    expect(
      sanitizedAnalyticsLocation(
        "https://www.anzen-ai-portal.jp/admin/operations",
      ),
    ).toBeNull();
    expect(RUM_ROUTE_TEMPLATES).not.toContain("/admin/operations");
    expect(
      rumPayloadSchema.safeParse({
        route_template: "/safety-ai",
        metric: "LCP",
        value: 100,
        rating: "good",
        device_class: "desktop",
        connection_class: "fast",
        navigation_type: "navigate",
        build_id: "build",
        anonymous_bucket: "rum_0123456789abcdef01234567",
      }).success,
    ).toBe(true);
    expect(
      rumPayloadSchema.safeParse({
        route_template: "/admin/operations",
        metric: "LCP",
        value: 100,
        rating: "good",
        device_class: "desktop",
        connection_class: "fast",
        navigation_type: "navigate",
        build_id: "build",
        anonymous_bucket: "rum_0123456789abcdef01234567",
      }).success,
    ).toBe(false);
    expect(sitemap().some((entry) => entry.url.includes("/admin/"))).toBe(
      false,
    );
    expect(serviceWorker).toContain('url.pathname.startsWith("/admin")');
  });
});
