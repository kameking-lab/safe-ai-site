import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HeatSafetySpecial } from "./heat-safety-special";

vi.mock("@/lib/services/weather-risk-service", () => ({
  createApiWeatherRiskService: () => ({
    getTodaySiteRisk: vi.fn().mockResolvedValue({
      ok: false,
      error: { code: "NETWORK", message: "取得不能", retryable: true },
    }),
  }),
}));

describe("HeatSafetySpecial", () => {
  it("夏季の主操作4件と公式一次情報をSSRリンクで提供する", () => {
    render(
      <HeatSafetySpecial
        presentation="seasonal-large"
        todayJstLabel="2026年7月29日(水)"
        campaignYearLabel="2026年"
      />,
    );

    expect(
      screen.getByRole("link", { name: /今日の熱中症リスクを見る/ }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /今日の熱中症リスクを見る/ })
        .getAttribute("href"),
    ).toBe("/heat-illness-prevention");
    expect(
      screen.getByRole("link", { name: /熱中症KYを作る/ }).getAttribute("href"),
    ).toBe("/ky/paper?topic=heat-illness");
    expect(
      screen.getByRole("link", { name: /5分で学ぶ/ }).getAttribute("href"),
    ).toBe("/heat-illness-prevention/elearning");
    expect(
      screen
        .getByRole("link", { name: /教育スライドを見る/ })
        .getAttribute("href"),
    ).toBe("/heat-illness-prevention/slides");
    expect(
      screen
        .getByRole("link", { name: /気象庁の熱中症警戒アラート/ })
        .getAttribute("href"),
    ).toBe(
      "https://www.jma.go.jp/jma/kishou/know/bosai/heat_alert.html",
    );
    expect(
      screen.getByRole("link", { name: /WBGTを確認する/ }).getAttribute("href"),
    ).toBe("https://www.wbgt.env.go.jp/");
    expect(
      screen.getByRole("navigation", { name: "熱中症対策の主要操作" })
        .className,
    ).toContain("grid-cols-1");
    expect(
      document.querySelector('[data-mascot-variant="heat"]'),
    ).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "今日の暑熱データ状態" })
        .className,
    ).toContain("[overflow-wrap:anywhere]");
  });

  it("WBGT未確認・取得不能・未監修を安全扱いしない", () => {
    render(
      <HeatSafetySpecial
        presentation="seasonal-large"
        todayJstLabel="2026年7月29日(水)"
        campaignYearLabel="2026年"
      />,
    );
    const text = document.body.textContent ?? "";
    expect(text).toContain("実測・推定とも未確認");
    expect(text).toContain("判定保留");
    expect(text).toContain("安全」「警報なし」と扱いません");
    expect(text).toContain("未監修・外部確認待ち");
    expect(text).not.toMatch(/WBGT\s*[=:：]?\s*\d/i);
    expect(text).not.toContain("基準値以下なので安全");
  });

  it("JST季節判定結果を色だけに頼らず表示し、季節外は縮小する", () => {
    const { rerender } = render(
      <HeatSafetySpecial
        presentation="seasonal-large"
        todayJstLabel="2026年7月29日(水)"
        campaignYearLabel="2026年"
      />,
    );
    expect(
      screen
        .getByRole("region", {
          name: "夏の重点対策｜今日の熱中症リスクを確認",
        })
        .getAttribute("data-heat-campaign-presentation"),
    ).toBe("seasonal-large");
    expect(screen.getByText("重点実施中")).toBeTruthy();
    expect(screen.getByText("2026年 夏季")).toBeTruthy();

    rerender(
      <HeatSafetySpecial
        presentation="standard-card"
        todayJstLabel="2026年12月1日(火)"
        campaignYearLabel="2026年"
      />,
    );
    expect(
      screen
        .getByRole("region", {
          name: "季節の重点対策｜熱中症予防を確認",
        })
        .getAttribute("data-heat-campaign-presentation"),
    ).toBe("standard-card");
    expect(screen.getByText("通常表示")).toBeTruthy();
    expect(
      screen.queryByRole("region", { name: "今日の暑熱データ状態" }),
    ).toBeNull();
  });
});
