import { describe, expect, it } from "vitest";
import { GET, POST } from "./route";

function context(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

describe("formal safety image download route", () => {
  it("returns 404 for unknown legacy or invented slugs", async () => {
    const response = await GET(
      new Request("https://example.test/api/safety-images/legacy-stickman/download"),
      context("legacy-stickman"),
    );
    expect(response.status).toBe(404);
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
  });

  it("allowlists GET mode, paper, orientation, format and language", async () => {
    for (const query of [
      "mode=edited",
      "paper=A2",
      "orientation=square",
      "format=svg",
      "lang=fr",
    ]) {
      const response = await GET(
        new Request(`https://example.test/api/safety-images/helmet-required/download?${query}`),
        context("helmet-required"),
      );
      expect(response.status, query).toBe(400);
    }
  });

  it("offers PNG only for construction-plan illustrations", async () => {
    const response = await GET(
      new Request("https://example.test/api/safety-images/helmet-required/download?format=png"),
      context("helmet-required"),
    );
    expect(response.status).toBe(400);
  });

  it("rejects oversized, multiline, control-character and unsafe edit fields", async () => {
    const base = {
      mode: "edited",
      language: "ja",
      text: "保護帽を着用",
      fontSize: "standard",
      position: "top",
      textColor: "#082f49",
      band: true,
      bandColor: "#ffffff",
      brand: true,
      lineHeight: 1.18,
      align: "center",
      border: true,
      padding: "standard",
      writingMode: "horizontal",
      subMessage: "",
      numericValue: "",
      numericUnit: "",
    };
    for (const settings of [
      { ...base, text: "a".repeat(181) },
      { ...base, text: "1\n2\n3\n4\n5\n6" },
      { ...base, text: "unsafe\u0000text" },
      { ...base, textColor: "url(javascript:alert(1))" },
      { ...base, numericValue: "<script>" },
      { ...base, lineHeight: 5 },
    ]) {
      const response = await POST(
        new Request("https://example.test/api/safety-images/helmet-required/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paper: "A4", orientation: "portrait", format: "jpeg", settings }),
        }),
        context("helmet-required"),
      );
      expect(response.status).toBe(400);
      expect(await response.text()).not.toContain(settings.text);
      expect(response.headers.get("cache-control")).toContain("no-store");
    }
  });
});
