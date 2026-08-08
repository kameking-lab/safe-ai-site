import { describe, expect, it } from "vitest";
import {
  FOCUS_PAINT_FRAMES,
  assessInteractiveTarget,
  hasRenderedFocusIndicator,
} from "../../../scripts/audit/intuitive-ux-accessibility-metrics.mjs";

describe("intuitive UX accessibility metrics", () => {
  it("uses two animation frames so reduced-motion focus styles are painted", () => {
    expect(FOCUS_PAINT_FRAMES).toBeGreaterThanOrEqual(2);
  });

  it("measures checkbox hit area from its associated label", () => {
    expect(
      assessInteractiveTarget({
        tag: "input",
        name: "確認する",
        width: 13,
        height: 13,
        labelWidth: 120,
        labelHeight: 44,
        display: "inline-block",
        focusReveal: false,
      }),
    ).toMatchObject({
      width: 120,
      height: 44,
      hitAreaSource: "associated-label",
      belowWcagMinimum: false,
      belowPreferred44: false,
    });
  });

  it("does not report inline text links or focus-revealed skip links as undersized", () => {
    expect(
      assessInteractiveTarget({
        tag: "a",
        name: "一次資料",
        width: 72,
        height: 19,
        display: "inline",
        focusReveal: false,
      }).exception,
    ).toBe("inline-text");
    expect(
      assessInteractiveTarget({
        tag: "a",
        name: "メインコンテンツへスキップ",
        width: 1,
        height: 1,
        display: "block",
        focusReveal: true,
      }).exception,
    ).toBe("focus-revealed");
  });

  it("distinguishes a rendered focus ring from an ambient shadow", () => {
    const base = {
      focusVisible: true,
      outlineStyle: "none",
      outlineWidth: "0px",
      outlineColor: "rgb(0, 0, 0)",
    };
    expect(
      hasRenderedFocusIndicator({
        ...base,
        boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 3px 0px",
      }),
    ).toBe(false);
    expect(
      hasRenderedFocusIndicator({
        ...base,
        boxShadow: "oklab(0 0 0 / 0) 0px 0px 0px 4px",
      }),
    ).toBe(false);
    expect(
      hasRenderedFocusIndicator({
        ...base,
        boxShadow:
          "rgb(255, 255, 255) 0px 0px 0px 2px, lab(44 -41 11) 0px 0px 0px 4px",
      }),
    ).toBe(true);
  });
});
