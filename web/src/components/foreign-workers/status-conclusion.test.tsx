import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusConclusion } from "./status-conclusion";

// 在留資格ガイド詳細ページの結論カード（柱0）の無読ガード。
// 本文を読まず3秒で「在留資格名」「就労制限・転職可否」「次にやること」が読めることを固定する。

describe("StatusConclusion", () => {
  it("在留資格名を role=status の状態ラベルとして描画する", () => {
    render(
      <StatusConclusion
        labelJa="特定技能1号"
        summary="特定産業分野で相当程度の知識・経験を要する業務に従事する在留資格。"
        periodOfStay="通算5年"
        unlimitedWorkScope={false}
        transferAllowed={true}
      />,
    );
    expect(screen.getByRole("status", { name: "いまの状態: 特定技能1号" })).toBeDefined();
  });

  it("在留期間チップを描画する", () => {
    render(
      <StatusConclusion
        labelJa="永住者"
        summary="就労制限のない身分系の在留資格。"
        periodOfStay="無期限"
        unlimitedWorkScope={true}
        transferAllowed={true}
      />,
    );
    expect(screen.getByText("無期限")).toBeDefined();
  });

  it("就労制限の有無で表示とトーンが切り替わる", () => {
    const { rerender } = render(
      <StatusConclusion
        labelJa="永住者"
        summary="就労制限のない身分系の在留資格。"
        periodOfStay="無期限"
        unlimitedWorkScope={true}
        transferAllowed={true}
      />,
    );
    expect(screen.getByText("就労制限なし")).toBeDefined();

    rerender(
      <StatusConclusion
        labelJa="技能実習2号"
        summary="技能実習計画で定めた職種に限定される在留資格。"
        periodOfStay="通算2年"
        unlimitedWorkScope={false}
        transferAllowed={false}
      />,
    );
    expect(screen.getByText("就労制限あり")).toBeDefined();
  });

  it("転職可否で表示が切り替わる", () => {
    const { rerender } = render(
      <StatusConclusion
        labelJa="特定技能1号"
        summary="特定産業分野で相当程度の知識・経験を要する業務に従事する在留資格。"
        periodOfStay="通算5年"
        unlimitedWorkScope={false}
        transferAllowed={true}
      />,
    );
    expect(screen.getByText("転職可能")).toBeDefined();

    rerender(
      <StatusConclusion
        labelJa="技能実習2号"
        summary="技能実習計画で定めた職種に限定される在留資格。"
        periodOfStay="通算2年"
        unlimitedWorkScope={false}
        transferAllowed={false}
      />,
    );
    expect(screen.getByText("転籍原則不可")).toBeDefined();
  });

  it("次にやること＝多言語安全教育教材を見るへ誘導する", () => {
    render(
      <StatusConclusion
        labelJa="特定技能1号"
        summary="特定産業分野で相当程度の知識・経験を要する業務に従事する在留資格。"
        periodOfStay="通算5年"
        unlimitedWorkScope={false}
        transferAllowed={true}
      />,
    );
    const link = screen.getByRole("link", { name: /多言語安全教育教材を見る/ });
    expect(link.getAttribute("href")).toBe("/foreign-workers/safety-training");
  });
});
