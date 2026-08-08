import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ForConstructionPage, { metadata } from "./page";

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

describe("/for/construction 正規機能ランチャー", () => {
  it("職長・現場代理人向けmetadataとcanonicalを固定する", () => {
    expect(metadata).toMatchObject({
      title: "職長・現場代理人向け安全行動入口",
      description:
        "職長・現場代理人が、今日の気象確認、KY、安全工程打合せ書、事故検索、資格確認を現場条件付きで始める入口。",
      alternates: { canonical: "/for/construction" },
    });
  });

  it("役割ラベルと単一H1を表示する", () => {
    render(<ForConstructionPage />);
    expect(
      screen.getByText("職長・現場代理人・元請安全担当向け"),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "今日の条件を確認し、KYと工程打合せへ。",
      }),
    ).toBeTruthy();
    expect(document.querySelectorAll("h1")).toHaveLength(1);
  });

  it("建設現場向け6アクションを正規URLへ直接つなぐ", () => {
    render(<ForConstructionPage />);
    expect(renderedHrefs()).toEqual(
      expect.arrayContaining([
        "/risk?work=construction",
        "/ky/paper?industry=construction",
        "/safety-diary?industry=construction",
        "/accident-news",
        "/education-certification/finder?industry=construction",
        "/signage?industry=construction",
      ]),
    );
  });

  it("共通の今日の安全・横断検索・品質・相談導線を持つ", () => {
    render(<ForConstructionPage />);
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
    render(<ForConstructionPage />);
    const link = screen.getByRole("link", { name: "e-Gov法令検索" });
    expect(link.getAttribute("href")).toBe("https://elaws.e-gov.go.jp/");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("rel")).toContain("noreferrer");
  });

  it("DOM内の全リンクが44px以上の操作標的を持つ", () => {
    render(<ForConstructionPage />);
    for (const link of screen.getAllByRole("link")) {
      expect(link.className).toMatch(/\bmin-h-(?:11|32)\b/);
    }
  });

  it("隔離URLを完全一致・子URL・queryのいずれでも出さない", () => {
    render(<ForConstructionPage />);
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
    const { container } = render(<ForConstructionPage />);
    expect(container.textContent).not.toMatch(
      /5[,.]?000件|39\s*テンプレ|自動集計/,
    );
  });

  it("公式情報の代替ではなく、原文と現場条件の確認が必要と明示する", () => {
    render(<ForConstructionPage />);
    expect(screen.getByText(/公式情報の代替ではありません/)).toBeTruthy();
    expect(
      screen.getByText(/根拠を再確認できない機能は公開導線から停止しています/),
    ).toBeTruthy();
  });

  it("相談情報をanalyticsへ送らず、受信設定不完全時は停止すると明示する", () => {
    render(<ForConstructionPage />);
    expect(
      screen.getByText(/相談本文や連絡先をanalyticsへ送信せず/),
    ).toBeTruthy();
    expect(
      screen.getByText(/受信設定が不完全な場合は送信を停止します/),
    ).toBeTruthy();
  });
});
