import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WbgtConclusion, WbgtRiskBand } from "./wbgt-conclusion";

// WBGT結論カード（柱0）の回帰ガード。
// 無読テストの前提＝デカ数字・区分チップ・5区分の色帯が確実に描画されること。

describe("WbgtConclusion", () => {
  it("デカ数字（text-6xl）と区分チップを描画し、role=status で読み上げ可能", () => {
    render(
      <WbgtConclusion
        wbgt={29.3}
        level="severe-warning"
        heading="いまの危険度"
        workIntensity="moderate"
        acclimatization="acclimatized"
      />,
    );
    const big = screen.getByTestId("wbgt-big-value");
    expect(big.className).toContain("text-6xl");
    expect(big.textContent).toContain("29.3");
    expect(screen.getByTestId("wbgt-risk-chip").textContent).toBe("厳重警戒");
    expect(screen.getByRole("status")).toBeDefined();
  });

  it("色帯は5セグメント＋境界値ラベルを描画する", () => {
    const { container } = render(
      <WbgtRiskBand wbgt={26} workIntensity="moderate" acclimatization="acclimatized" />,
    );
    const segs = container.querySelectorAll("[data-testid^='wbgt-band-seg-']");
    expect(segs).toHaveLength(5);
    // 中程度・順化済みの境界値（22/25/28/31）が帯の下に出る
    for (const t of ["22", "25", "28", "31"]) {
      expect(screen.getByText(t)).toBeDefined();
    }
  });

  it("危険レベルでは深紅トーンの淡色面になる", () => {
    render(
      <WbgtConclusion
        wbgt={35}
        level="danger"
        heading="いまの危険度"
        workIntensity="moderate"
        acclimatization="acclimatized"
      />,
    );
    expect(screen.getByTestId("wbgt-conclusion").className).toContain("bg-rose-50");
  });
});
