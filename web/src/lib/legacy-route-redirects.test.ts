// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getRedirectUrl,
  unstable_getResponseFromNextConfig,
} from "next/experimental/testing/server";
import nextConfig from "../../next.config";
import sitemap from "@/app/sitemap";
import { SITE_URL } from "@/lib/seo-metadata";

const movedRoutes = [
  ["/services", "/services/automation"],
  ["/enterprise/contact", "/contact"],
  ...[
    "brand-consistency",
    "content-quality-cleanup",
    "news-feed-stats",
    "p1-batch-plan",
    "p2-batch-plan",
    "p3-batch-plan",
    "post-2week-regression",
    "review-dashboard",
  ].map((slug) => [`/audits/${slug}`, `/admin/audits/${slug}`]),
];

describe("移動済みページの恒久転送", () => {
  it.each(movedRoutes)("%s は後継 %s へクエリを維持して308転送する", async (source, destination) => {
    const query = "?from=bookmark&topic=safety";
    const response = await unstable_getResponseFromNextConfig({
      url: `${SITE_URL}${source}${query}`,
      nextConfig,
    });
    expect(response.status).toBe(308);
    expect(getRedirectUrl(response)).toBe(`${SITE_URL}${destination}${query}`);

    const next = await unstable_getResponseFromNextConfig({
      url: `${SITE_URL}${destination}${query}`,
      nextConfig,
    });
    expect(getRedirectUrl(next)).toBeNull();

    const directory = destination.startsWith("/admin/")
      ? `src/app${destination}`
      : `src/app/(main)${destination}`;
    expect(existsSync(resolve(directory, "page.tsx"))).toBe(true);
  });

  it.each([
    "/consulting",
    "/services/proposal",
    "/services/unknown",
    "/handover",
    "/audits/2026-05-16",
    "/quiz",
    "/exam-quiz",
    "/exam-quiz/old-course/result",
    "/e-learning/exams",
  ])("後継のない %s を無関係なページへ転送しない", async (path) => {
    const response = await unstable_getResponseFromNextConfig({
      url: `${SITE_URL}${path}`,
      nextConfig,
    });
    expect(getRedirectUrl(response)).toBeNull();
  });

  it("旧URLと管理領域をサイトマップへ収載しない", () => {
    const paths = sitemap().map((entry) => new URL(entry.url).pathname);
    for (const [source] of movedRoutes) expect(paths).not.toContain(source);
    expect(paths.some((path) => path.startsWith("/admin/"))).toBe(false);
    for (const path of ["/consulting", "/services/proposal", "/quiz", "/exam-quiz", "/e-learning/exams"]) {
      expect(paths).not.toContain(path);
    }
  });

  it("FAQから資格・教育検索の実在ルートへ案内する", () => {
    const source = readFileSync(resolve("src/app/(main)/faq/page.tsx"), "utf8");
    expect(source).toContain('href="/education-certification/finder"');
    expect(source).not.toContain('href="/qualifications"');
  });
});
