import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CourseConclusion } from "./CourseConclusion";

// 教育コース詳細ページの結論カード（柱0）の無読ガード。
// 本文を読まず3秒で「区分」「時間」「次にやること（サンプル資料を見る）」が読めることを固定する。

describe("CourseConclusion", () => {
  it("区分を role=status の状態ラベルとして描画する（特別教育）", () => {
    render(
      <CourseConclusion
        kind="special"
        duration="約6時間"
        basis="省令ベース"
        summary="安衛則第36条第41号に基づく特別教育。"
      />,
    );
    expect(screen.getByRole("status", { name: "いまの状態: 特別教育" })).toBeDefined();
    expect(screen.getByText("特別教育")).toBeDefined();
  });

  it("区分ラベルは kind ごとに切り替わる（法定教育・労働衛生教育）", () => {
    const { rerender } = render(
      <CourseConclusion kind="legal" duration="12時間以上" summary="安衛法第60条に基づく職長等教育。" />,
    );
    expect(screen.getByRole("status", { name: "いまの状態: 法定教育" })).toBeDefined();

    rerender(
      <CourseConclusion kind="health" duration="約1.5時間" summary="熱中症予防の労働衛生教育。" />,
    );
    expect(screen.getByRole("status", { name: "いまの状態: 労働衛生教育" })).toBeDefined();
  });

  it("時間チップを描画する", () => {
    render(<CourseConclusion kind="special" duration="約9時間" summary="玉掛け特別教育。" />);
    expect(screen.getByText("約9時間")).toBeDefined();
  });

  it("既定では次にやること＝サンプル資料を見るへ #course-sample で誘導する", () => {
    render(<CourseConclusion kind="special" duration="約6時間" summary="特別教育。" />);
    const link = screen.getByRole("link", { name: /サンプル資料を見る/ });
    expect(link.getAttribute("href")).toBe("#course-sample");
  });

  it("sampleHref を指定するとリンク先を差し替えられる", () => {
    render(
      <CourseConclusion
        kind="health"
        duration="約2時間"
        summary="振動障害予防の労働衛生教育。"
        sampleHref="#material"
      />,
    );
    expect(
      screen.getByRole("link", { name: /サンプル資料を見る/ }).getAttribute("href"),
    ).toBe("#material");
  });

  it("basis は任意（無ければ根拠チップを出さない）", () => {
    const { rerender } = render(
      <CourseConclusion kind="special" duration="約5.5時間" basis="規則ベース" summary="酸欠特別教育。" />,
    );
    expect(screen.getByText("規則ベース")).toBeDefined();

    rerender(<CourseConclusion kind="special" duration="約5.5時間" summary="酸欠特別教育。" />);
    expect(screen.queryByText("規則ベース")).toBeNull();
  });
});
