import { describe, expect, it, vi } from "vitest";
import {
  SAFETY_IMAGE_LANGUAGES,
  SAFETY_IMAGE_THEMES,
} from "@/data/safety-image-library";
import {
  GET,
  HEAD,
  POST,
  hasOnlyCanonicalQuery,
  isSafeSafetyImageMainText,
  isSafeSafetyImageUnit,
} from "./route";

const missingContext = { params: Promise.resolve({ slug: "legacy-missing-safety-image" }) };

describe("safety image download route", () => {
  it.each([
    ["GET", () => GET(new Request("https://example.test/api/safety-images/legacy-missing-safety-image/download"), missingContext)],
    ["HEAD", () => HEAD(new Request("https://example.test/api/safety-images/legacy-missing-safety-image/download", { method: "HEAD" }), missingContext)],
    ["POST", () => POST(new Request("https://example.test/api/safety-images/legacy-missing-safety-image/download", { method: "POST", body: "{}" }), missingContext)],
  ] as const)("returns an indexed-safe 404 for missing assets via %s", async (_method, invoke) => {
    const response = await invoke();
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(response.headers.get("content-disposition")).toBeNull();
  });

  it("rejects edited text that is not sent in the private POST body", async () => {
    const response = await POST(
      new Request("https://example.test/api/safety-images/helmet-required/download", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ size: "a4-portrait", format: "png", settings: { mode: "default" } }),
      }),
      { params: Promise.resolve({ slug: "helmet-required" }) },
    );
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("accepts every registry unit in all five languages and rejects unsafe unit text", () => {
    const numericThemes = SAFETY_IMAGE_THEMES.filter((theme) => theme.numericTemplate);
    expect(numericThemes).toHaveLength(10);
    for (const theme of numericThemes) {
      for (const language of SAFETY_IMAGE_LANGUAGES) {
        expect(
          isSafeSafetyImageUnit(theme.numericTemplate?.units[language] ?? ""),
          `${theme.slug}/${language}`,
        ).toBe(true);
      }
    }
    for (const invalid of ["kg\nalert", "<script>", "kg_unsafe", "x".repeat(17), null]) {
      expect(isSafeSafetyImageUnit(invalid)).toBe(false);
    }
  });

  it("rejects unknown, duplicate and incomplete legacy query variants", () => {
    for (const query of [
      "paper=random",
      "orientation=portrait",
      "paper=A4&orientation=portrait&nonce=1",
      "paper=A4&orientation=portrait&paper=A4",
      "size=a4-portrait&paper=A4&orientation=portrait",
    ]) {
      expect(hasOnlyCanonicalQuery(new URLSearchParams(query)), query).toBe(false);
    }
    expect(hasOnlyCanonicalQuery(new URLSearchParams("paper=A4&orientation=portrait"))).toBe(true);
    expect(hasOnlyCanonicalQuery(new URLSearchParams("size=a4-portrait&format=png"))).toBe(true);
  });

  it("keeps the editor and API on the same 180-character, 12-line contract", () => {
    expect(isSafeSafetyImageMainText(Array.from({ length: 6 }, (_, index) => `line${index}`).join("\n"))).toBe(true);
    expect(isSafeSafetyImageMainText(Array.from({ length: 12 }, () => "x").join("\n"))).toBe(true);
    expect(isSafeSafetyImageMainText(Array.from({ length: 13 }, () => "x").join("\n"))).toBe(false);
    expect(isSafeSafetyImageMainText("x".repeat(181))).toBe(false);
  });

  it("rejects cross-site edited render requests before reading custom text", async () => {
    const response = await POST(
      new Request("https://example.test/api/safety-images/helmet-required/download", {
        method: "POST",
        headers: { origin: "https://attacker.test", "sec-fetch-site": "cross-site" },
        body: "{}",
      }),
      { params: Promise.resolve({ slug: "helmet-required" }) },
    );
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("marks preset availability for shared Vercel CDN caching", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 200, headers: { "Content-Type": "image/png" } }),
    );
    try {
      const response = await HEAD(
        new Request("https://example.test/api/safety-images/helmet-required/download?mode=default&lang=ja&brand=branded&size=a4-portrait&format=jpeg", { method: "HEAD" }),
        { params: Promise.resolve({ slug: "helmet-required" }) },
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("cdn-cache-control")).toContain("s-maxage=86400");
      expect(response.headers.get("vercel-cdn-cache-control")).toContain("s-maxage=86400");
    } finally {
      fetchMock.mockRestore();
    }
  });
});
