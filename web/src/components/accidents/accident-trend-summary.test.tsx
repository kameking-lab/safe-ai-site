import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { AccidentTrendSummary } from "./accident-trend-summary";

describe("AccidentTrendSummary 柱0（44pxタップ標的）", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("厚労省 速報 原典を見る リンクが 44px タップ標的を満たす", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          trend: { periodLabel: "直近1年", total: 1, byType: [], byIndustry: [] },
          sokuhou: {
            fetchedAt: "2026-07-01",
            sibouPeriod: "2026/5",
            sisyouPeriod: null,
            topSibou: [{ name: "墜落・転落", total: 3 }],
            topSisyou: [],
            sourceUrl: "https://example.jp/sokuhou",
          },
          summary: null,
        }),
      })
    );

    render(<AccidentTrendSummary />);
    fireEvent.click(screen.getByRole("button", { name: /AIで要約/ }));

    const link = await waitFor(() => screen.getByRole("link", { name: /厚労省 速報 原典を見る/ }));
    expect(link.className).toContain("min-h-[44px]");
    expect(link.className).toContain("items-center");
  });

  it("集計期間セレクト・AIで要約ボタンが 44px タップ標的を満たす", () => {
    render(<AccidentTrendSummary />);
    expect(screen.getByLabelText("集計期間").className).toContain("min-h-[44px]");
    expect(screen.getByRole("button", { name: /AIで要約/ }).className).toContain("min-h-[44px]");
  });
});
