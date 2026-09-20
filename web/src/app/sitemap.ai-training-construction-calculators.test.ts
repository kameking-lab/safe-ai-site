import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COMING_SOON_AI_SEMINARS } from "@/data/ai-seminars/themes";
import { COMING_SOON_CONSTRUCTION_CALCULATORS } from "@/data/construction-calculators/coming-soon";
import { constructionCalculatorRegistry } from "@/data/construction-calculators/formula-registry";
import sitemap from "./sitemap";

const BASE = "https://www.anzen-ai-portal.jp";

describe("AI研修と建設計算のsitemap境界", () => {
  const urls = sitemap().map((entry) => entry.url);

  it("AI一覧と公開教材1件だけを追加する", () => {
    const aiUrls = urls.filter((url) => url.startsWith(`${BASE}/training/ai-seminars`));
    expect(aiUrls).toEqual([
      `${BASE}/training/ai-seminars`,
      `${BASE}/training/ai-seminars/ai-chat-work`,
    ]);
    for (const seminar of COMING_SOON_AI_SEMINARS) {
      expect(urls).not.toContain(`${BASE}/training/ai-seminars/${seminar.id}`);
    }
  });

  it("建設計算一覧と公開12件だけを追加する", () => {
    const prefix = `${BASE}/tools/construction-calculators`;
    const calculatorUrls = urls.filter((url) => url.startsWith(prefix));
    expect(calculatorUrls).toHaveLength(13);
    expect(calculatorUrls).toContain(prefix);
    for (const calculator of constructionCalculatorRegistry) {
      expect(calculatorUrls).toContain(`${prefix}/${calculator.slug}`);
    }
    expect(COMING_SOON_CONSTRUCTION_CALCULATORS).toHaveLength(23);
  });

  it("Coming Soonの空詳細ディレクトリとquery URLを作らない", () => {
    const calculatorDir = join(process.cwd(), "src", "app", "(main)", "tools", "construction-calculators");
    expect(
      readdirSync(calculatorDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name),
    ).toEqual(["[slug]"]);
    expect(urls.some((url) => /[?#]/u.test(url))).toBe(false);
  });
});
