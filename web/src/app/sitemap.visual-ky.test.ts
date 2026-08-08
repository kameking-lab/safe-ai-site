import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";
import { PUBLIC_VISUAL_KY_SCENARIOS } from "@/data/visual-ky";

describe("visual KY sitemap indexability", () => {
  it("hubとreviewed・権利確認済み問題だけを掲載する", () => {
    const urls = sitemap().map((item) => String(item.url));
    const visualKyUrls = urls.filter((url) =>
      url.includes("/training/visual-ky"),
    );
    expect(visualKyUrls).toHaveLength(
      PUBLIC_VISUAL_KY_SCENARIOS.length + 1,
    );
    expect(visualKyUrls).toContain(
      "https://www.anzen-ai-portal.jp/training/visual-ky",
    );
    for (const scenario of PUBLIC_VISUAL_KY_SCENARIOS) {
      expect(visualKyUrls).toContain(
        `https://www.anzen-ai-portal.jp/training/visual-ky/${scenario.slug}`,
      );
    }
    expect(visualKyUrls.some((url) => url.includes("/category/"))).toBe(false);
    expect(visualKyUrls.some((url) => url.endsWith("/today"))).toBe(false);
    expect(visualKyUrls.some((url) => url.endsWith("/facilitator"))).toBe(
      false,
    );
    expect(visualKyUrls.some((url) => url.endsWith("/print"))).toBe(false);
  });

  it("熱中症hub・slides・e-learningのnoindex sitemap除外境界を維持する", () => {
    const urls = sitemap().map((item) => String(item.url));
    expect(urls).not.toContain(
      "https://www.anzen-ai-portal.jp/heat-illness-prevention",
    );
    expect(urls).not.toContain(
      "https://www.anzen-ai-portal.jp/heat-illness-prevention/slides",
    );
    expect(urls).not.toContain(
      "https://www.anzen-ai-portal.jp/heat-illness-prevention/elearning",
    );
  });
});
