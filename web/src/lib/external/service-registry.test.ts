import { describe, it, expect } from "vitest";
import { listServices, SERVICE_REGISTRY, isConfigured } from "./service-registry";

describe("service-registry", () => {
  it("exposes every declared service in the registry", () => {
    const services = listServices();
    expect(services.length).toBe(Object.keys(SERVICE_REGISTRY).length);
    for (const s of services) {
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.fallbackBehavior.length).toBeGreaterThan(0);
      expect(["core", "important", "best-effort"]).toContain(s.criticality);
    }
  });

  it("reports services with no required env vars as configured", () => {
    expect(isConfigured("open-meteo")).toBe(true);
    expect(isConfigured("google-news-rss")).toBe(true);
  });

  it("returns false when a required env var is missing", () => {
    const original = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      expect(isConfigured("gemini")).toBe(false);
    } finally {
      if (original !== undefined) process.env.GEMINI_API_KEY = original;
    }
  });

  it("ignores dummy placeholder values", () => {
    const original = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = "dummy";
    try {
      expect(isConfigured("gemini")).toBe(false);
    } finally {
      if (original === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = original;
    }
  });
});
