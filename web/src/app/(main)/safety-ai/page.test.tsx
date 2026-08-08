import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { getAutomationConsultAvailability } from "@/lib/automation-consult/availability";
import SafetyAiLandingPage, { metadata } from "./page";

describe("/safety-ai simple landing page", () => {
  it("keeps a self canonical, one distinct title, and the first-visitor audience", () => {
    expect(metadata.alternates?.canonical).toBe(
      "https://www.anzen-ai-portal.jp/safety-ai",
    );
    expect(metadata.title).toEqual({
      absolute: "安全AIポータルとは｜現場で使える労働安全ツール",
    });
    expect(metadata.description).toContain("職長、一人親方、安全衛生担当者");

    const { container } = render(<SafetyAiLandingPage />);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "安全情報を、現場で使える行動へ。",
      }),
    ).toBeTruthy();
    expect(container.textContent).toContain("職長・一人親方・安全衛生担当者へ");
  });

  it("uses four focused sections and stays within the reduced LP text budget", () => {
    const { container } = render(<SafetyAiLandingPage />);
    const article = container.querySelector("[data-simple-safety-ai-lp]");
    expect(article).not.toBeNull();
    expect(article?.querySelectorAll("[data-lp-section]")).toHaveLength(4);
    const textLength = (article?.textContent ?? "").replace(/\s+/gu, "").length;
    expect(textLength).toBeGreaterThanOrEqual(600);
    expect(textLength).toBeLessThanOrEqual(1400);
  });

  it("keeps one primary and at most two supporting hero actions", () => {
    const { container } = render(<SafetyAiLandingPage />);
    expect(container.querySelectorAll("[data-hero-primary]")).toHaveLength(1);
    expect(container.querySelectorAll("[data-hero-secondary]")).toHaveLength(2);
    expect(container.querySelectorAll('[data-primary-action="true"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-secondary-action="true"]')).toHaveLength(2);
    expect(container.querySelectorAll("[data-lp-cta]")).toHaveLength(9);
    for (const section of container.querySelectorAll("[data-lp-section]")) {
      expect(section.querySelectorAll("[data-lp-cta]").length).toBeLessThanOrEqual(3);
    }
    expect(screen.getAllByRole("link", { name: "今すぐ使う" })[0]?.getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: "できることを見る" }).getAttribute("href")).toBe("#available");
    const consultation = container.querySelectorAll("[data-hero-secondary] a")[1];
    const availability = getAutomationConsultAvailability();
    const expected = availability.contactMode === "mail_client"
      ? ["メールで相談する", "/contact/automation-email"]
      : availability.contactMode === "web_form"
        ? ["自社向けに相談する", "/services/automation#consult-form"]
        : ["自動化例・料金を見る", "/services/automation"];
    expect(consultation?.textContent).toContain(expected[0]);
    expect(consultation?.getAttribute("href")).toBe(expected[1]);
  });

  it("shows six available capabilities with verb-led destinations", () => {
    render(<SafetyAiLandingPage />);
    for (const [name, href] of [
      ["WBGTを見る", "/risk"],
      ["法令を聞く", "/chatbot"],
      ["物質を調べる", "/chemical-ra"],
      ["最新事故を見る", "/accident-news"],
      ["5分学ぶ", "/education"],
      ["KYTを始める", "/training/visual-ky"],
    ] as const) {
      expect(screen.getByRole("link", { name }).getAttribute("href")).toBe(href);
    }
  });

  it("distinguishes standard features from company and site customization", () => {
    const { container } = render(<SafetyAiLandingPage />);
    const text = container.textContent ?? "";
    expect(text).toContain("そのまま使う。合わない部分は、現場に合わせてつくる。");
    expect(text).toContain("標準で使えること");
    expect(text).toContain("法令・事故・化学物質・気象の確認");
    expect(text).toContain("会社・現場に合わせてつくること");
    for (const item of [
      "会社独自の帳票",
      "承認フロー",
      "社内通知",
      "安全教育資料",
      "サイネージ",
      "社内データ・API連携",
      "定型業務の自動化",
    ]) {
      expect(text).toContain(item);
    }
  });

  it("links automation details and the centralized usage notes without repeating the closing actions", () => {
    render(<SafetyAiLandingPage />);
    expect(screen.getAllByRole("link", { name: "自動化例・料金を見る" })[0]?.getAttribute("href")).toBe("/services/automation");
    expect(screen.getAllByRole("link", { name: "自動化例・料金を見る" })).toHaveLength(1);
    expect(screen.queryByRole("link", { name: "このプロジェクトをつくった理由" })).toBeNull();
    expect(screen.getByRole("link", { name: "注意事項" }).getAttribute("href")).toBe("/about/usage-notes");
    expect(screen.queryByRole("heading", { name: "安全な使い方" })).toBeNull();
  });

  it("keeps structured data factual and free of contact recipients or form actions", () => {
    const { container } = render(<SafetyAiLandingPage />);
    const schemas = [...container.querySelectorAll('script[type="application/ld+json"]')]
      .map((script) => script.textContent ?? "")
      .join("\n");
    expect(schemas).toContain('"datePublished":"2026-07-31"');
    expect(schemas).toContain('"dateModified":"2026-08-01"');
    expect(schemas).not.toContain("potentialAction");
    expect(schemas).not.toMatch(/@gmail|@outlook/i);
    expect(
      sitemap().find(
        (entry) => entry.url === "https://www.anzen-ai-portal.jp/safety-ai",
      )?.lastModified,
    ).toBe("2026-08-01");
  });
});
