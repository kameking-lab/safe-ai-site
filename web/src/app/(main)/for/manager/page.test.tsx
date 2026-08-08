import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ForManagerPage, { metadata } from "./page";

const FORBIDDEN = [
  "/accidents-reports",
  "/accidents-analytics",
  "/strategy/plan-generator",
  "/faq",
  "/e-learning",
] as const;

function renderedHrefs(): Array<string | null> {
  return screen
    .getAllByRole("link")
    .map((link) => link.getAttribute("href"));
}

describe("/for/manager 正規機能ランチャー", () => {
  it("安全衛生担当者向けmetadataとcanonicalを固定する", () => {
    expect(metadata).toMatchObject({
      title: "安全衛生担当者向け現場運用入口",
      description:
        "安全衛生担当者が今日の安全、委員会、点検、教育、化学物質、法令確認を正規機能で始めるための入口。",
      alternates: { canonical: "/for/manager" },
    });
  });

  it("役割ラベルと単一H1を表示する", () => {
    render(<ForManagerPage />);
    expect(
      screen.getByText("安全衛生担当者・総務・人事向け"),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "今日の確認と記録から、安全衛生運用を始める。",
      }),
    ).toBeTruthy();
    expect(document.querySelectorAll("h1")).toHaveLength(1);
  });

  it("担当者向け6アクションを正規URLへ直接つなぐ", () => {
    render(<ForManagerPage />);
    expect(renderedHrefs()).toEqual(
      expect.arrayContaining([
        "/risk",
        "/site-records",
        "/site-records/committee",
        "/chemical-ra",
        "/education-certification/finder",
        "/law-search",
      ]),
    );
  });

  it("共通の今日の安全・横断検索・品質・相談導線を持つ", () => {
    render(<ForManagerPage />);
    expect(renderedHrefs()).toEqual(
      expect.arrayContaining([
        "/risk",
        "/search",
        "/about/quality",
        "/services/automation#consult-form",
      ]),
    );
  });

  it("e-Gov公式検索を安全な外部リンクで開く", () => {
    render(<ForManagerPage />);
    const link = screen.getByRole("link", { name: "e-Gov法令検索" });
    expect(link.getAttribute("href")).toBe("https://elaws.e-gov.go.jp/");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("rel")).toContain("noreferrer");
  });

  it("DOM内の全リンクが44px以上の操作標的を持つ", () => {
    render(<ForManagerPage />);
    for (const link of screen.getAllByRole("link")) {
      expect(link.className).toMatch(/\bmin-h-(?:11|32)\b/);
    }
  });

  it("隔離URLを完全一致・子URL・queryのいずれでも出さない", () => {
    render(<ForManagerPage />);
    const hrefs = renderedHrefs();
    for (const forbidden of FORBIDDEN) {
      expect(
        hrefs.some(
          (href) =>
            href === forbidden ||
            href?.startsWith(`${forbidden}/`) ||
            href?.startsWith(`${forbidden}?`),
        ),
      ).toBe(false);
    }
  });

  it("未検証の件数・テンプレ数・自動集計主張を表示しない", () => {
    const { container } = render(<ForManagerPage />);
    expect(container.textContent).not.toMatch(
      /5[,.]?000件|39\s*テンプレ|自動集計/,
    );
  });

  it("公式情報の代替ではなく、原文と現場条件の確認が必要と明示する", () => {
    render(<ForManagerPage />);
    expect(screen.getByText(/公式情報の代替ではありません/)).toBeTruthy();
    expect(
      screen.getByText(/根拠を再確認できない機能は公開導線から停止しています/),
    ).toBeTruthy();
  });

  it("相談情報をanalyticsへ送らず、受信設定不完全時は停止すると明示する", () => {
    render(<ForManagerPage />);
    expect(
      screen.getByText(/相談本文や連絡先をanalyticsへ送信せず/),
    ).toBeTruthy();
    expect(
      screen.getByText(/受信設定が不完全な場合は送信を停止します/),
    ).toBeTruthy();
  });
});
