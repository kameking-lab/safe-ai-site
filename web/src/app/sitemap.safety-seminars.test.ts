import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COMING_SOON_SAFETY_SEMINARS,
  PUBLISHED_SAFETY_SEMINARS,
} from "@/data/safety-seminars/themes";
import sitemap from "./sitemap";

const BASE = "https://www.anzen-ai-portal.jp";

describe("安全研修ライブラリのsitemap境界", () => {
  const urls = sitemap().map((entry) => entry.url);

  it("一覧と公開教材だけを公開配列の順で収載する", () => {
    expect(urls).toContain(`${BASE}/training/safety-seminars`);
    expect(
      urls.filter((url) => url.startsWith(`${BASE}/training/safety-seminars/`)),
    ).toEqual(PUBLISHED_SAFETY_SEMINARS.map((seminar) => `${BASE}${seminar.href}`));
    expect(urls.filter((url) => url.startsWith(`${BASE}/training/safety-seminars`))).toHaveLength(4);
  });

  it("Coming Soon個別URL・利用条件・再生状態URLを収載しない", () => {
    expect(urls).not.toContain(`${BASE}/training/safety-seminars/terms`);
    expect(urls.some((url) => /[?#]/u.test(url))).toBe(false);
    for (const seminar of COMING_SOON_SAFETY_SEMINARS) {
      expect(urls).not.toContain(`${BASE}/training/safety-seminars/${seminar.id}`);
    }
  });

  it("Coming Soonの空詳細ページを作らない", () => {
    const dir = join(process.cwd(), "src", "app", "(main)", "training", "safety-seminars");
    const directories = readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    expect(directories).toEqual([
      "chemicals-sds-risk-assessment",
      "fall-prevention",
      "safety-management-basics-osh-law",
      "terms",
    ]);
  });
});
