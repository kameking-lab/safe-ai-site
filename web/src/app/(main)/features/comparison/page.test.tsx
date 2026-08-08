import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ComparisonPage, { metadata } from "./page";

describe("/features/comparison 柱0 44pxタップ標的", () => {
  it("PF-013-P2: 未検証比較をnoindexにし、未提供能力を明示する", () => {
    render(<ComparisonPage />);
    expect(metadata.robots).toMatchObject({ index: false, follow: true });
    expect(
      screen.getByRole("complementary", { name: "比較表の検証状態" })
        .textContent,
    ).toContain("比較内容の根拠と提供状態を再検証中");
    expect(screen.queryByText("○ 業種別カリキュラム + 修了証")).toBeNull();
    expect(screen.queryByText("LMSで一元管理")).toBeNull();
    expect(screen.queryByText("労働安全コンサルタントが直接対応")).toBeNull();
  });

  it("下部CTAの2リンクが min-h-[44px] を満たす", () => {
    render(<ComparisonPage />);
    expect(screen.getByRole("link", { name: /ご意見・改善提案を送る/ }).className).toContain(
      "min-h-[44px]",
    );
    expect(screen.getByRole("link", { name: "機能一覧を見る" }).className).toContain(
      "min-h-[44px]",
    );
  });
});
