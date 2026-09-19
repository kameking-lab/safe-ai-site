import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Footer } from "./footer";
import { HomeLearningOverview } from "./home/home-learning-overview";

describe("AI実務研修・建設計算ツールの共通導線", () => {
  it("ホームの今日学ぶから安全研修とAI実務研修へ直接移動できる", () => {
    render(<HomeLearningOverview />);
    expect(
      screen
        .getByRole("link", { name: "安全研修ライブラリ" })
        .getAttribute("href"),
    ).toBe("/training/safety-seminars");
    expect(
      screen.getByRole("link", { name: "AI実務研修" }).getAttribute("href"),
    ).toBe("/training/ai-seminars");
  });

  it("footerからAI実務研修と新しい建設計算ツールへ直接移動できる", () => {
    render(<Footer />);
    expect(
      screen.getByRole("link", { name: "AI実務研修" }).getAttribute("href"),
    ).toBe("/training/ai-seminars");
    expect(
      screen
        .getByRole("link", { name: "建設計算ツール" })
        .getAttribute("href"),
    ).toBe("/tools/construction-calculators");
    expect(screen.queryByRole("link", { name: "建設計算" })).toBeNull();
  });
});
