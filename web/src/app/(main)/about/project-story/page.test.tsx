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
  "現場別気象警報・熱中症通知システム",
  "安全eラーニングシステム",
  "全社表彰",
  "年間表彰",
  "現在の職場",
  "賞金額",
  "worksFor",
] as const;

describe("/about/project-story", () => {
  it("uses a self canonical, concise metadata, and sitemap entry", () => {
    expect(metadata.title).toBe("このプロジェクトをつくった理由");
    expect(metadata.description).toContain("工事現場での事故を原点");
    expect(metadata.alternates?.canonical).toBe(STORY_URL);
    expect(sitemap().some((entry) => entry.url === STORY_URL)).toBe(true);
  });

  it("renders one H1, five story blocks, and a 900–1400 character story", () => {
    const { container } = render(<ProjectStoryPage />);
    const article = container.querySelector("[data-project-story]");
    expect(article).not.toBeNull();
    expect(article?.querySelectorAll("h1")).toHaveLength(1);
    expect(article?.querySelectorAll("[data-story-block]")).toHaveLength(5);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "現場の時間を、安全と本質的な仕事へ。",
      }),
    ).toBeTruthy();
    const textLength = (article?.textContent ?? "").replace(/\s+/gu, "").length;
    expect(textLength).toBeGreaterThanOrEqual(900);
    expect(textLength).toBeLessThanOrEqual(1400);
  });

  it("keeps the origin, field experience, qualifications, and improvement stance", () => {
    const { container } = render(<ProjectStoryPage />);
    const text = container.textContent ?? "";
    expect(text).toContain("学生時代、工事現場で死亡事故を目の当たりにしました");
    expect(text).toContain("文系から土木施工管理の道へ");
    expect(text).toContain("建設・土木分野で約10年");
    expect(text).toContain("一級土木施工管理技士");
    expect(text).toContain("労働安全コンサルタント");
    expect(text).toContain("安全、施工計画、品質向上");
    expect(text).toContain("AIとコーディングを学びました");
    expect(text).toContain("まず話を聞き");
    expect(text).toContain("小さく試し");
    expect(text).not.toMatch(/衝撃的|凄惨|生々しい/u);
  });

  it("removes bookkeeping, workplace systems, awards, and employer promotion", () => {
    const { container } = render(<ProjectStoryPage />);
    const publicOutput = container.innerHTML;
    for (const term of REMOVED_PUBLIC_TERMS) {
      expect(publicOutput).not.toContain(term);
    }
  });

  it("states individual funding, free publication, and independence from employers", () => {
    const { container } = render(<ProjectStoryPage />);
    const text = container.textContent ?? "";
    expect(text).toContain("個人が開発・運営し、無償公開しているプロジェクト");
    expect(text).toContain("運営費も個人で負担");
    expect(text).toContain(
      "現在および過去の勤務先、取引先、その他の組織が運営、監修、推奨するものではありません",
    );
    expect(text).toContain("最終判断は、公式情報、専門家、各組織の手順");
  });

  it("offers the four requested next actions and links back to the canonical LP", () => {
    render(<ProjectStoryPage />);
    for (const [name, href] of [
      ["安全AIポータルを使う", "/"],
      ["できることを見る", "/safety-ai"],
      ["品質と出典を見る", "/about/quality"],
      ["自社向けの相談内容を整理する", "/contact/automation-email"],
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
