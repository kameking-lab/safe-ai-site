import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeatIllnessKyStart } from "./heat-illness-ky-start";

describe("HeatIllnessKyStart", () => {
  it("必要条件と自動確定しない境界を表示する", () => {
    render(<HeatIllnessKyStart />);
    const panel = screen.getByTestId("heat-illness-ky-start");
    expect(panel.textContent).toContain("現場実測WBGT");
    expect(panel.textContent).toContain("休憩間隔");
    expect(panel.textContent).toContain("水分・塩分補給");
    expect(panel.textContent).toContain("緊急連絡先");
    expect(panel.textContent).toContain("入力候補を自動確定せず");
    expect(panel.textContent).toContain("提出前の確認画面と承認");
  });

  it("risk・公式WBGT・ハブへクロール可能なリンクを提供する", () => {
    render(<HeatIllnessKyStart />);
    expect(
      screen
        .getByRole("link", { name: "地域・天気・取得時刻を確認" })
        .getAttribute("href"),
    ).toBe("/risk");
    const official = screen.getByRole("link", {
      name: "環境省で暑さ指数を確認",
    });
    expect(official.getAttribute("href")).toBe("https://www.wbgt.env.go.jp/");
    expect(official.getAttribute("rel")).toContain("noopener");
    expect(
      screen
        .getByRole("link", { name: "熱中症予防ハブへ戻る" })
        .getAttribute("href"),
    ).toBe("/heat-illness-prevention");
  });
});
