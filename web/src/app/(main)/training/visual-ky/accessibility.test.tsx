import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import VisualKyHubPage from "./page";
import { selectDailyVisualKy } from "@/lib/visual-ky/daily";
import {
  PUBLIC_VISUAL_KY_SCENARIOS,
  VISUAL_KY_CATEGORY_DEFINITIONS,
} from "@/data/visual-ky";

describe("Visual KY hub accessibility", () => {
  it("今日の問題カードは重複リンクにせず見出しで識別できる", () => {
    const { container } = render(<VisualKyHubPage />);
    const heading = container.querySelector("#daily-visual-ky-title");
    const dailyCard = heading?.closest("article");
    const daily = selectDailyVisualKy();

    expect(dailyCard).toBeTruthy();
    expect(dailyCard?.getAttribute("aria-labelledby")).toBe("daily-visual-ky-title");
    expect(screen.getAllByRole("link", { name: "回答する" })).toHaveLength(1);
    expect(dailyCard?.textContent).toContain(
      daily.scenario.facilitator.openingQuestion,
    );
    expect(screen.queryByText("無料 · ログイン不要")).toBeNull();
    expect(screen.queryByText("5分で完結")).toBeNull();
  });

  it("初期HTMLの問題画像を今日の1件に限り、分野と全問題へ到達できる", () => {
    const { container } = render(<VisualKyHubPage />);

    expect(container.querySelectorAll("img")).toHaveLength(1);
    expect(
      container.querySelectorAll(
        'section[aria-labelledby="all-problems-heading"] article a[href^="/training/visual-ky/"]',
      ),
    ).toHaveLength(PUBLIC_VISUAL_KY_SCENARIOS.length);
    expect(
      container.querySelectorAll(
        '#categories a[href^="/training/visual-ky/category/"]',
      ),
    ).toHaveLength(VISUAL_KY_CATEGORY_DEFINITIONS.length);
    expect(
      screen.getByRole("group", { name: "問題一覧を開く" }),
    ).toBeTruthy();
    for (const count of container.querySelectorAll(
      '#categories a[href^="/training/visual-ky/category/"] span:last-child',
    )) {
      expect(count.className).toContain("text-slate-600");
      expect(count.className).not.toContain("text-slate-500");
    }
  });
});
