import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { KEYWORD_LANDINGS } from "@/data/seo/keyword-landing";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

function landing(slug: string) {
  const value = KEYWORD_LANDINGS.find((entry) => entry.slug === slug);
  expect(value).toBeDefined();
  return value!;
}

describe("public quality transparency", () => {
  it("explains source status, correction, AI, and heat-review boundaries publicly", () => {
    const quality = source("src/app/(main)/about/quality/page.tsx");
    const sources = source("src/app/(main)/about/data-sources/page.tsx");
    const combined = `${quality}\n${sources}`;

    for (const required of [
      "公式一次資料",
      "更新",
      "取得障害",
      "stale",
      "quarantine",
      "synthetic",
      "AI",
      "人",
      "訂正",
      "2026-07-29",
    ]) {
      expect(combined).toContain(required);
    }
    expect(quality).toContain("noindex,follow");
    expect(quality).toContain("サイトマップから除外");
    expect(quality).toContain("受付中・承認済みとは表示しません");
    expect(combined).not.toMatch(
      /DATABASE_URL|CRON_SECRET|RESEND_API_KEY|ADMIN_EMAILS/,
    );
  });
});

describe("five canonical SEO clusters", () => {
  it("keeps the chatbot first view concise while guides remain source-backed and internally linked", () => {
    for (const slug of [
      "anzeneho-ai-chatbot",
      "chemical-ra-create-simple",
      "ky-sheet",
      "safety-signage",
    ]) {
      const guide = landing(slug);
      expect(guide.title.length).toBeGreaterThan(15);
      expect(guide.h1.length).toBeGreaterThan(15);
      if (slug === "anzeneho-ai-chatbot") {
        expect(guide.description.length).toBeGreaterThanOrEqual(20);
        expect(guide.description.length).toBeLessThanOrEqual(60);
        expect(guide.lead.length).toBeGreaterThanOrEqual(20);
        expect(guide.lead.length).toBeLessThanOrEqual(60);
      } else {
        expect(guide.description.length).toBeGreaterThan(50);
        expect(guide.lead.length).toBeGreaterThan(80);
      }
      expect(guide.steps.length).toBeGreaterThanOrEqual(3);
      expect(guide.longTail.length).toBeGreaterThanOrEqual(4);
      expect(guide.sources.length).toBeGreaterThanOrEqual(2);
      expect(guide.sources.every((item) => item.url.startsWith("https://"))).toBe(
        true,
      );
      expect(guide.related.length).toBeGreaterThanOrEqual(2);
      expect(guide.related.every((item) => item.href.startsWith("/"))).toBe(
        true,
      );
      expect(guide.toolHref.startsWith("/")).toBe(true);
      expect(guide.dateModified).toBe(
        slug === "anzeneho-ai-chatbot" ? "2026-08-02" : "2026-07-29",
      );
    }
    const view = source("src/components/seo/keyword-landing-view.tsx");
    expect(view).toContain("data.dateModified");
    expect(view).toContain("data.sources.map");
    expect(view).toContain("data.related.map");
    expect(view).toContain("data.toolHref");
  });

  it("distinguishes occupational safety AI from general AI safety", () => {
    const content = source("src/app/(main)/safety-ai/page.tsx");
    expect(content).toContain("現場で使える労働安全ツール");
    expect(content).toContain("職長、一人親方、安全衛生担当者");
    expect(content).toContain('data-hero-primary=""');
    expect(content.match(/data-hero-secondary=""/g)).toHaveLength(2);
    expect(content).toContain("必要な機能を、その場で開く");
    expect(content).toContain("<UsageNotesLink");
    expect(content).not.toContain("公式一次資料を正本にする");
    expect(content).not.toContain("AIの出力は人が確認する");
    expect(content).not.toContain("個人情報や機密情報を入力しない");
    expect(content).toContain("2026-07-31");
  });

  it("keeps chemical screening separate from official CREATE-SIMPLE", () => {
    const tool = source("src/app/(main)/chemical-ra/page.tsx");
    const guide = landing("chemical-ra-create-simple");
    const text = JSON.stringify(guide);

    expect(tool).toContain("無料の簡易スクリーニング");
    expect(tool).toContain("CAS");
    expect(tool).toContain("SDS");
    expect(tool).toContain("混合物");
    expect(text).toContain("CREATE-SIMPLE");
    expect(text).toContain("再現・代替");
    expect(guide.dateModified).toBe("2026-07-29");
  });

  it("covers free KY creation, examples, printing, solo work, and construction", () => {
    const tool = source("src/app/(main)/ky/paper/page.tsx");
    const guide = landing("ky-sheet");
    const text = `${tool}\n${JSON.stringify(guide)}`;

    for (const required of [
      "無料",
      "記入例",
      "印刷",
      "一人KY",
      "建設",
      "作業条件",
      "人",
    ]) {
      expect(text).toContain(required);
    }
    expect(guide.dateModified).toBe("2026-07-29");
  });

  it("covers signage freshness, failure modes, examples, and consultation", () => {
    const guide = landing("safety-signage");
    const text = JSON.stringify(guide);

    for (const required of [
      "WBGT",
      "気象",
      "警報",
      "stale",
      "offline",
      "出力例",
      "/services/automation",
    ]) {
      expect(text).toContain(required);
    }
    expect(guide.dateModified).toBe("2026-07-29");
  });

  it("documents chatbot citations, effective dates, emergency use, PII, and limits", () => {
    const guide = landing("anzeneho-ai-chatbot");
    const text = JSON.stringify(guide);

    for (const required of [
      "引用",
      "施行日",
      "緊急時",
      "個人情報",
      "限界",
      "e-Gov",
      "最終確認",
    ]) {
      expect(text).toContain(required);
    }
    expect(guide.dateModified).toBe("2026-08-02");
  });
});
