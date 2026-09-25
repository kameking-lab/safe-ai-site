import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  COMING_SOON_SAFETY_SEMINARS,
  COMING_SOON_SAFETY_CORE_20,
  FALL_PREVENTION_SEMINAR_PATH,
  PUBLISHED_SAFETY_SEMINARS,
  SAFETY_MANAGEMENT_BASICS_OSH_LAW_SEMINAR_PATH,
  SAFETY_SEMINARS,
  SAFETY_SEMINAR_CORE_20,
  SAFETY_SEMINAR_HUB_PATH,
} from "@/data/safety-seminars/themes";
import SafetySeminarLibraryPage, { generateMetadata } from "./page";

const EXPECTED_TITLES = [
  "安全管理の基本と安衛法",
  "墜落・転落防止とフルハーネスの実務",
  "熱中症対策の実装",
  "足場・脚立・開口部の安全",
  "重機・車両との接触防止",
  "クレーン・玉掛け・吊り荷周辺の安全",
  "化学物質・SDS・リスクアセスメント入門",
  "電気作業・感電防止の実務",
  "火気・溶接作業の火災防止",
  "Visual KYT・伝わるKYの進め方",
  "事故・ヒヤリハットから学ぶ再発防止",
  "荷役・フォークリフト・テールゲートの安全",
  "交通規制・第三者災害防止",
  "酸欠・閉所作業の管理者向け基礎",
  "石綿・粉じん・有機溶剤の管理ポイント",
  "強風・雷・大雨・凍結時の作業判断",
  "応急手当・AED・緊急連絡体制",
  "新規入場者向け「現場の基本10項目」",
  "外国人作業員へ伝わる安全教育",
  "高年齢作業者の転倒・腰痛・無理な動作防止",
  "保護具の選び方・点検・交換",
  "安全パトロールの見方・指摘の書き方",
  "施工計画書の安全チェック",
  "作業手順書を安全にする方法",
  "法改正を現場の行動へ変える研修",
  "協力会社へ安全ルールを浸透させる方法",
  "事故調査と再発防止報告書の作り方",
  "安全掲示板・サイネージの作り方",
  "AIを安全管理へ使う時のルール",
] as const;

describe("/training/safety-seminars", () => {
  it("29テーマを公開中3件とComing Soon 26件に分ける", () => {
    expect(SAFETY_SEMINARS.map((seminar) => seminar.title)).toEqual(
      EXPECTED_TITLES,
    );
    expect(PUBLISHED_SAFETY_SEMINARS).toHaveLength(3);
    expect(PUBLISHED_SAFETY_SEMINARS.map((seminar) => seminar.href)).toEqual([
      SAFETY_MANAGEMENT_BASICS_OSH_LAW_SEMINAR_PATH,
      FALL_PREVENTION_SEMINAR_PATH,
      "/training/safety-seminars/chemicals-sds-risk-assessment",
    ]);
    expect(COMING_SOON_SAFETY_SEMINARS).toHaveLength(26);
    expect(
      COMING_SOON_SAFETY_SEMINARS.every((seminar) => !("href" in seminar)),
    ).toBe(true);
  });

  it("公開カードだけに詳細リンクと指定情報を表示する", () => {
    const { container } = render(<SafetySeminarLibraryPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "安全研修ライブラリ" }),
    ).toBeDefined();
    expect(
      container.querySelectorAll('[data-seminar-status="published"]'),
    ).toHaveLength(3);
    expect(
      container.querySelectorAll('[data-seminar-status="coming-soon"]'),
    ).toHaveLength(17);
    expect(SAFETY_SEMINAR_CORE_20).toHaveLength(20);
    expect(COMING_SOON_SAFETY_CORE_20).toHaveLength(17);
    expect(screen.queryByText("音声あり")).toBeNull();
    expect(screen.getAllByText("PowerPoint・PDF")).toHaveLength(2);
    expect(screen.getByText("Webスライド・確認クイズ")).toBeDefined();
    expect(screen.getAllByText("12枚")).toHaveLength(2);
    expect(screen.getByText("20枚")).toBeDefined();
    expect(screen.getByText("おすすめ")).toBeDefined();
    expect(screen.queryByText("FIRST RELEASE")).toBeNull();
    expect(screen.getAllByText("SLIDES & QUIZ")).toHaveLength(3);
    expect(
      container
        .querySelector('[data-seminar-status="published"]')
        ?.getAttribute("data-seminar-id"),
    ).toBe("safety-management-basics-osh-law");
    expect(screen.getAllByRole("link", { name: /今すぐ見る/ }).map((link) => link.getAttribute("href")))
      .toEqual([
        SAFETY_MANAGEMENT_BASICS_OSH_LAW_SEMINAR_PATH,
        FALL_PREVENTION_SEMINAR_PATH,
        "/training/safety-seminars/chemicals-sds-risk-assessment",
      ]);
  });

  it("Coming Soonカードにはテーマ名・対象者・Coming Soonだけを表示し、操作を置かない", () => {
    const { container } = render(<SafetySeminarLibraryPage />);
    const cards = [
      ...container.querySelectorAll<HTMLElement>(
        '[data-seminar-status="coming-soon"]',
      ),
    ];

    for (const card of cards) {
      expect(card.children).toHaveLength(3);
      expect(card.querySelector("h3")).not.toBeNull();
      expect(card.querySelector("p")?.textContent).toMatch(/^対象：/u);
      expect(card.querySelector("span")?.textContent?.trim()).toBe(
        "Coming Soon",
      );
      expect(card.querySelector("a, button")).toBeNull();
    }
  });

  it("self canonicalを保ち、query付きだけnoindexにする", async () => {
    const canonical = await generateMetadata({ searchParams: Promise.resolve({}) });
    const queried = await generateMetadata({
      searchParams: Promise.resolve({ consultationType: "training" }),
    });

    expect(canonical.alternates?.canonical).toBe(SAFETY_SEMINAR_HUB_PATH);
    expect(canonical.robots).toEqual({ index: true, follow: true });
    expect(queried.alternates?.canonical).toBe(SAFETY_SEMINAR_HUB_PATH);
    expect(queried.robots).toEqual({ index: false, follow: true });
  });

  it("ホーム・LP・全機能・footer・自動化相談から1クリックで到達できる", () => {
    const sources = [
      "src/components/home/home-learning-overview.tsx",
      "src/app/(main)/safety-ai/page.tsx",
      "src/app/(main)/features/features-index-client.tsx",
      "src/components/footer.tsx",
      "src/app/(main)/services/automation/AutomationServiceContent.tsx",
    ];

    for (const source of sources) {
      expect(readFileSync(join(process.cwd(), source), "utf8")).toContain(
        SAFETY_SEMINAR_HUB_PATH,
      );
    }
  });
});
