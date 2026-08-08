import { describe, expect, it } from "vitest";
import {
  isOptionalTrackingPath,
  isOptionalTrackingUrl,
  hasPrivacySignalOptOut,
  sanitizedAnalyticsLocation,
  sanitizeAnalyticsParams,
} from "./analytics-privacy";

describe("analytics privacy", () => {
  it("excludes free-text and private workflows", () => {
    for (const path of [
      "/search",
      "/chatbot/share/private-token",
      "/meeting/contribute/private-id",
      "/auth/callback",
      "/api/auth/callback",
      "/admin",
      "/site-records",
      "/safety-diary",
      "/strategy/plan-generator",
      "/pricing/success",
      "/pricing/success/session-placeholder",
      "/pricing/cancel",
      "/risk",
      "/contact/automation-email",
      "/contact/automation-email/draft",
    ]) {
      expect(isOptionalTrackingPath(path), path).toBe(false);
    }
    expect(isOptionalTrackingPath("/laws")).toBe(true);
    expect(
      isOptionalTrackingUrl(
        "https://www.anzen-ai-portal.jp/risk?area=tokyo-shinjuku",
      ),
    ).toBe(false);
  });

  it("rejects token/search params and returns only a query-free public location", () => {
    expect(isOptionalTrackingUrl("https://example.test/laws?access_token=secret")).toBe(false);
    expect(isOptionalTrackingUrl("https://example.test/laws?q=worker-name")).toBe(false);
    expect(isOptionalTrackingUrl("https://example.test/laws?year=2026")).toBe(true);
    expect(
      isOptionalTrackingUrl(
        "https://example.test/services/automation?consultationType=training",
      ),
    ).toBe(false);
    expect(
      isOptionalTrackingUrl(
        "https://example.test/training/visual-ky/scaffold-fall?result=complete",
      ),
    ).toBe(false);
    expect(
      isOptionalTrackingUrl(
        "https://example.test/training/visual-ky/scaffold-fall/print?format=morning",
      ),
    ).toBe(false);
    expect(
      isOptionalTrackingUrl(
        "https://example.test/training/visual-ky/scaffold-fall",
      ),
    ).toBe(true);
    expect(sanitizedAnalyticsLocation("https://example.test/laws?year=2026#section")).toEqual({
      page_path: "/laws",
      page_location: "https://example.test/laws",
    });
  });

  it("drops query-like and identifying custom event parameters", () => {
    const marker = "privacy-audit-marker@example.test";
    const safe = sanitizeAnalyticsParams({
      query: marker,
      email: marker,
      page_location: `/search?q=${marker}`,
      result_count: 3,
      category: "laws",
    });
    expect(JSON.stringify(safe)).not.toContain(marker);
    expect(safe).toEqual({ result_count: 3, category: "laws" });
  });

  it("honors DNT and GPC before optional analytics", () => {
    Object.defineProperty(navigator, "doNotTrack", {
      configurable: true,
      value: "1",
    });
    expect(hasPrivacySignalOptOut()).toBe(true);

    Object.defineProperty(navigator, "doNotTrack", {
      configurable: true,
      value: "0",
    });
    Object.defineProperty(navigator, "globalPrivacyControl", {
      configurable: true,
      value: true,
    });
    expect(hasPrivacySignalOptOut()).toBe(true);

    Object.defineProperty(navigator, "globalPrivacyControl", {
      configurable: true,
      value: false,
    });
    expect(hasPrivacySignalOptOut()).toBe(false);
  });
});
