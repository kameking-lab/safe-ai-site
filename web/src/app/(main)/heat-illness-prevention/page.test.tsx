import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HeatIllnessPreventionPage, { metadata } from "./page";

describe("HeatIllnessPreventionPage", () => {
  it("現在値・今日の行動・KY・緊急対応を先に表示する", () => {
    render(<HeatIllnessPreventionPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "職場の熱中症対策",
      }),
    ).toBeDefined();
    for (const heading of [
      "現在値",
      "今日行うこと",
      "KY・教育",
      "緊急時",
      "詳細",
      "講習・資料作成",
    ]) {
      expect(
        screen.getByRole("heading", { level: 2, name: heading }),
      ).toBeDefined();
    }
    expect(screen.queryByText("全17項目の目次を見る")).toBeNull();
  });

  it("未取得を安全表示せず、WBGTの3区分を必要時に確認できる", () => {
    const { container } = render(<HeatIllnessPreventionPage />);
    const current = screen
      .getByRole("heading", { name: "現在値" })
      .closest("section") as HTMLElement;

    expect(current.textContent).toContain("地域未選択");
    expect(current.textContent).toContain("WBGT未取得");
    expect(current.textContent).toContain("情報種別未取得");
    expect(current.textContent).toContain("警戒状態未判定");
    expect(current.textContent).not.toContain(
      "取得できないときは「安全」「警報なし」と判定しません",
    );
    expect(container.textContent).not.toContain("取得できないため安全");
    const details = screen.getByText("WBGTの情報種別").closest("details");
    expect(details?.open).toBe(false);
    expect(details?.textContent).toContain("実測値");
    expect(details?.textContent).toContain("実況推定値");
    expect(details?.textContent).toContain("予測値");
    expect(container.querySelectorAll('[role="alert"]')).toHaveLength(0);
  });

  it("KY・教材・サイネージ・5種の相談へクロール可能にリンクする", () => {
    render(<HeatIllnessPreventionPage />);

    expect(
      screen.getAllByRole("link", { name: "熱中症KY" })[0]?.getAttribute("href"),
    ).toBe("/ky/paper?topic=heat-illness");
    expect(
      screen
        .getByRole("link", { name: "14枚の教育スライド" })
        .getAttribute("href"),
    ).toBe("/heat-illness-prevention/slides");
    expect(
      screen
        .getByRole("link", { name: "7問のeラーニング" })
        .getAttribute("href"),
    ).toBe("/heat-illness-prevention/elearning");
    expect(
      screen.getByRole("link", { name: "サイネージで表示" }).getAttribute("href"),
    ).toBe("/signage");

    for (const type of [
      "heat-illness-training",
      "safety-education-materials",
      "wbgt-weather-notifications",
      "heat-signage",
      "ky-document-automation",
    ]) {
      expect(
        document.querySelector(
          `a[href='/services/automation?consultationType=${type}#consult-form']`,
        ),
      ).not.toBeNull();
    }
    expect(document.body.textContent).toContain("受付停止中");
    expect(document.body.textContent).not.toContain("受付準備中");
  });

  it("今日の行動を2件に限定し、統計・商品・チェックカード壁を描画しない", () => {
    const { container } = render(<HeatIllnessPreventionPage />);
    const actions = screen
      .getByRole("heading", { name: "今日行うこと" })
      .closest("section") as HTMLElement;
    expect(within(actions).getAllByRole("listitem")).toHaveLength(2);
    expect(container.querySelector("table")).toBeNull();
    expect(container.textContent).not.toContain("人手確認待ち");
    expect(container.textContent).not.toContain("アフィリエイトリンク");
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
    expect((container.textContent ?? "").length).toBeLessThan(1200);
  });

  it("noindex,followを維持し、長い免責は注意事項へ集約する", () => {
    const { container } = render(<HeatIllnessPreventionPage />);
    expect(metadata.alternates?.canonical).toBe("/heat-illness-prevention");
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(
      screen.getByRole("link", { name: "注意事項" }).getAttribute("href"),
    ).toBe("/about/usage-notes");
    expect(container.querySelector("[data-evidence-kind]")).toBeNull();
    expect(container.textContent).not.toContain("AI支援で作成した未監修");
    expect(container.textContent).not.toContain("外部法務・編集・医学レビュー");
  });

  it("公式WBGT・気象警報・法令・緊急手順へ直接到達できる", () => {
    render(<HeatIllnessPreventionPage />);
    expect(
      screen.getByRole("link", { name: "環境省WBGT" }).getAttribute("href"),
    ).toBe("https://www.wbgt.env.go.jp/");
    expect(
      screen
        .getByRole("link", { name: "気象庁の警報・注意報" })
        .getAttribute("href"),
    ).toBe("https://www.jma.go.jp/bosai/warning/");
    expect(
      screen
        .getByRole("link", { name: "安衛則第612条の2" })
        .getAttribute("href"),
    ).toContain("e-gov.go.jp");
    expect(
      screen
        .getByRole("link", { name: "厚生労働省の対応手順" })
        .getAttribute("href"),
    ).toContain("mhlw.go.jp");
    expect(document.body.textContent).toContain(
      "反応・意識に異常がある、または判断できない場合は119",
    );
  });
});
