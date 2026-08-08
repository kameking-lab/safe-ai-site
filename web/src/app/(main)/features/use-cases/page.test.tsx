import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import UseCasesPage, { metadata } from "./page";

describe("/features/use-cases 関連機能ピル（柱0 44px）", () => {
  it("PF-013-P2: 再検証中ページをnoindexにし、未提供能力を利用可能と断定しない", () => {
    const { getByRole, queryByText } = render(<UseCasesPage />);
    expect(metadata.robots).toMatchObject({ index: false, follow: true });
    expect(
      getByRole("complementary", { name: "モデルケースの提供状態" })
        .textContent,
    ).toContain("提供可否を再検証中");
    expect(queryByText(/オンライン教材＋修了証発行/)).toBeNull();
    expect(queryByText(/LMSで全社受講状況を一元管理/)).toBeNull();
    expect(queryByText(/SDS取込から作業別ばく露見積もりまで一気通貫/)).toBeNull();
  });

  it("各業種カードの関連機能ピルが min-h-[44px] を持つ", () => {
    const { container } = render(<UseCasesPage />);
    const pills = container.querySelectorAll("a.rounded-md.border-emerald-200");
    expect(pills.length).toBeGreaterThan(0);
    for (const pill of Array.from(pills)) {
      expect(pill.className).toContain("min-h-[44px]");
    }
  });

  it("業種ジャンプナビの各リンクが min-h-[44px] を持つ", () => {
    const { container } = render(<UseCasesPage />);
    const jumpNav = container.querySelector('nav[aria-label="業種ジャンプ"]');
    expect(jumpNav).not.toBeNull();
    const jumpLinks = jumpNav!.querySelectorAll('a[href^="#"]');
    expect(jumpLinks.length).toBeGreaterThan(0);
    for (const link of Array.from(jumpLinks)) {
      expect(link.className).toContain("min-h-[44px]");
    }
  });

  it("下部CTAの2リンクが min-h-[44px] を持つ", () => {
    const { getByRole } = render(<UseCasesPage />);
    expect(getByRole("link", { name: /相談受付の準備状況を見る/ }).className).toContain("min-h-[44px]");
    expect(getByRole("link", { name: "機能一覧に戻る" }).className).toContain("min-h-[44px]");
  });
});
