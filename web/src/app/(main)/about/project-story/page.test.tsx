import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import ProjectStoryPage, { metadata } from "./page";

const STORY_PATH = "/about/project-story";
const STORY_URL = `https://www.anzen-ai-portal.jp${STORY_PATH}`;
const REMOVED_PUBLIC_TERMS = [
  "日商簿記2級",
  "簿記",
  "学生時代",
  "文系",
  "約10年",
  "現在の職場",
  "勤務先",
  "worksFor",
] as const;

describe("/about/project-story", () => {
  it("uses a self canonical, concise metadata, and sitemap entry", () => {
    expect(metadata.title).toBe("プロジェクトについて");
    expect(metadata.description).toContain("編集体制");
    expect(metadata.alternates?.canonical).toBe(STORY_URL);
    expect(sitemap().some((entry) => entry.url === STORY_URL)).toBe(true);
  });

  it("renders one H1 and five policy blocks", () => {
    const { container } = render(<ProjectStoryPage />);
    const article = container.querySelector("[data-project-story]");
    expect(article).not.toBeNull();
    expect(article?.querySelectorAll("h1")).toHaveLength(1);
    expect(article?.querySelectorAll("[data-story-block]")).toHaveLength(5);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "労働安全と生成AIを、根拠を確認できる形へ。",
      }),
    ).toBeTruthy();
    const textLength = (article?.textContent ?? "").replace(/\s+/gu, "").length;
    expect(textLength).toBeGreaterThanOrEqual(700);
    expect(textLength).toBeLessThanOrEqual(1400);
  });

  it("states the editorial identity, supervision boundary, privacy, and improvement stance", () => {
    const { container } = render(<ProjectStoryPage />);
    const text = container.textContent ?? "";
    expect(text).toContain("安全AIポータル編集部");
    expect(text).toContain("労働安全コンサルタント監修");
    expect(text).toContain("個別コンテンツの確認状況");
    expect(text).toContain("本人特定につながる情報を掲載しません");
    expect(text).toContain("AI回答、計算結果、教材、帳票例は最終判断を代替しません");
  });

  it("removes personal history and employment clues", () => {
    const { container } = render(<ProjectStoryPage />);
    const publicOutput = container.innerHTML;
    for (const term of REMOVED_PUBLIC_TERMS) {
      expect(publicOutput).not.toContain(term);
    }
  });

  it("does not publish a personal operation or employment narrative", () => {
    const { container } = render(<ProjectStoryPage />);
    const text = container.textContent ?? "";
    expect(text).not.toContain(["個人", "運営"].join(""));
    expect(text).not.toContain(["個人", "開発"].join(""));
    expect(text).not.toContain("現在および過去の勤務先");
    expect(text).toContain("最終判断を代替しません");
  });

  it("offers the four requested next actions and links back to the canonical LP", () => {
    render(<ProjectStoryPage />);
    for (const [name, href] of [
      ["安全AIポータルを使う", "/"],
      ["できることを見る", "/safety-ai"],
      ["品質と出典を見る", "/about/quality"],
      ["業務改善・資料制作の相談範囲を見る", "/about#work-support"],
    ] as const) {
      expect(screen.getByRole("link", { name }).getAttribute("href")).toBe(href);
    }
  });

  it("publishes AboutPage and BreadcrumbList only, without a Person profile or employment relation", () => {
    const { container } = render(<ProjectStoryPage />);
    const serialized = [...container.querySelectorAll('script[type="application/ld+json"]')]
      .map((script) => script.textContent ?? "")
      .join("\n");
    expect(serialized).toContain('"@type":"AboutPage"');
    expect(serialized).toContain('"@type":"BreadcrumbList"');
    expect(serialized).not.toContain('"@type":"ProfilePage"');
    expect(serialized).not.toContain('"@type":"Person"');
    expect(serialized).not.toContain("worksFor");
  });

  it("is linked from the LP, quality page, home hero/menu, and footer", () => {
    const sources = [
      "src/app/(main)/safety-ai/page.tsx",
      "src/app/(main)/about/quality/page.tsx",
      "src/components/new-home-hero.tsx",
      "src/components/app-shell-navigation.tsx",
      "src/components/footer.tsx",
    ];
    const expected = sources.map((source) => ({
      source,
      body: readFileSync(join(process.cwd(), source), "utf8"),
    }));
    expect(expected[0]?.body).toContain(STORY_PATH);
    expect(expected[1]?.body).toContain(STORY_PATH);
    expect(expected.slice(2).every(({ body }) => body.includes("/safety-ai"))).toBe(true);
  });
});
