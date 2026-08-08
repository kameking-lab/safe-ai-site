import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HEAT_ILLNESS_FIELD_BRIEFING } from "@/data/heat-illness-learning/slides";
import HeatIllnessSlidesPage, { metadata } from "./page";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("HeatIllnessSlidesPage", () => {
  it("HTML正本として全スライドと法定義務2件を常時表示する", () => {
    const { container } = render(<HeatIllnessSlidesPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "熱中症を防ぐ現場ブリーフィング",
      }),
    ).toBeDefined();

    const slides = screen.getAllByTestId("heat-learning-slide");
    expect(slides).toHaveLength(HEAT_ILLNESS_FIELD_BRIEFING.slides.length);
    expect(slides.every((slide) => !slide.hasAttribute("hidden"))).toBe(true);
    expect(
      container.querySelectorAll("[data-claim-kind='statutory-duty']"),
    ).toHaveLength(2);
    expect(
      screen.getByText(/異常を報告できる体制の整備と周知/),
    ).toBeDefined();
    expect(
      screen.getByText(/症状悪化を防ぐ手順の作成と周知/),
    ).toBeDefined();
  });

  it("実測・実況推定・予測、現行指針、救急分岐を別の主張として表示する", () => {
    render(<HeatIllnessSlidesPage />);

    expect(screen.getByText(/実測値: 環境省サイト/)).toBeDefined();
    expect(screen.getByText(/実況推定値: 気象観測値等/)).toBeDefined();
    expect(screen.getByText(/予測値: 気象庁の数値予報データ等/)).toBeDefined();
    expect(screen.getByText(/現行の包括的な指針は、2026年3月18日付け基発0318第1号/)).toBeDefined();
    expect(screen.getByText(/意識がはっきりしない場合は、ただちに救急隊を要請/)).toBeDefined();
    expect(screen.getByText(/自力で水分をとれない場合は、ただちに救急隊を要請/)).toBeDefined();
  });

  it("出典状態を色以外の文字で示し、公式資料を新しいタブで開く", () => {
    render(<HeatIllnessSlidesPage />);

    expect(
      screen.getAllByText(/一次資料URL確認済み／外部法務レビュー待ち/)
        .length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/一次資料URL確認済み／編集レビュー待ち/).length,
    ).toBeGreaterThan(0);

    const officialLink = screen.getByRole("link", {
      name: /職場における熱中症防止対策のためのガイドライン/,
    });
    expect(officialLink.getAttribute("target")).toBe("_blank");
    expect(officialLink.getAttribute("rel")).toContain("noopener");
    expect(officialLink.getAttribute("href")).toContain("mhlw.go.jp");
  });

  it("44px操作、印刷、reduced motion、forced colorsの境界を持つ", () => {
    const print = vi
      .spyOn(window, "print")
      .mockImplementation(() => undefined);
    render(<HeatIllnessSlidesPage />);

    const printButton = screen.getByRole("button", {
      name: "スライドを印刷",
    });
    expect(printButton.className).toContain("min-h-[44px]");
    expect(printButton.className).toContain("min-w-[44px]");
    expect(printButton.className).toContain("print:hidden");
    expect(printButton.className).toContain("motion-reduce:transition-none");
    expect(printButton.className).toContain("forced-colors:");

    fireEvent.click(printButton);
    expect(print).toHaveBeenCalledTimes(1);

    const slideLink = screen.getByRole("link", {
      name: /1. 熱中症とは/,
    });
    expect(slideLink.className).toContain("min-h-[44px]");
    expect(slideLink.className).toContain("forced-colors:");
  });

  it("画面外スライドも仮想高さで省略せず、出典リンクと次スライドを重ねない", () => {
    render(<HeatIllnessSlidesPage />);

    const deck = screen.getByRole("list", {
      name: "熱中症を防ぐ現場ブリーフィング",
    });
    expect(deck.className).not.toContain("content-visibility");
    expect(deck.className).not.toContain("contain-intrinsic-size");
  });

  it("canonicalと絶対日付を持つ", () => {
    render(<HeatIllnessSlidesPage />);
    expect(metadata.alternates?.canonical).toBe(
      "/heat-illness-prevention/slides",
    );
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(screen.getByText("2026年7月24日")).toBeDefined();
    expect(document.body.textContent).toContain("AI支援で作成した未監修教材");
    expect(document.body.textContent).toContain(
      "公式資料や正式な教育記録を代替しません",
    );
    expect(
      screen
        .getByRole("link", { name: "料金・受付状況を見る" })
        .getAttribute("href"),
    ).toBe("/services/automation");
  });
});
