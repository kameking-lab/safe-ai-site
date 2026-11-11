import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import CourtCasesPage, { metadata } from "./page";

describe("/court-cases 隔離ハブ", () => {
  it("canonicalを維持しつつnoindex/followを明示する", () => {
    expect(metadata.alternates).toEqual({ canonical: "/court-cases" });
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: true,
      googleBot: { index: false, follow: true },
    });
  });

  it("公開停止状態と原文の確認方法を色だけに依存せず表示する", () => {
    render(<CourtCasesPage />);
    expect(screen.getByText("公開停止中")).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "労災・労働判例要旨は出典再検証のため公開停止中です",
      }),
    ).toBeTruthy();
    expect(screen.getByText(/判決原文は裁判所の裁判例検索で確認/)).toBeTruthy();
  });

  it("裁判所の公式検索へ安全な外部リンクと44px以上の操作標的を提供する", () => {
    render(<CourtCasesPage />);
    const link = screen.getByRole("link", {
      name: /裁判所の裁判例検索を開く/,
    });
    expect(link.getAttribute("href")).toBe(
      "https://www.courts.go.jp/app/hanrei_jp/search1",
    );
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("rel")).toContain("noreferrer");
    expect(link.className).toContain("min-h-12");
    expect(link.className).toContain("items-center");
  });

  it("旧公開CTAや『全件実在確認済み』相当の主張を表示しない", () => {
    render(<CourtCasesPage />);
    expect(
      screen.queryByRole("link", { name: /3つの責任.*ガイド/ }),
    ).toBeNull();
    expect(
      screen.queryByRole("link", { name: /A4まとめ資料で印刷/ }),
    ).toBeNull();
    expect(screen.queryByText(/すべて実在を確認できた確定判例/)).toBeNull();
  });
});
