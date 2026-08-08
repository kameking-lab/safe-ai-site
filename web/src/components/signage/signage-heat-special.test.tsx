import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  SIGNAGE_HEAT_SPECIAL_STATES,
  SignageHeatSpecial,
  type SignageHeatSpecialState,
} from "./signage-heat-special";

const EXPECTED_LABELS: Record<SignageHeatSpecialState, string> = {
  checking: "取得確認中",
  normal: "通常表示",
  stale: "データが古い",
  offline: "オフライン",
  "partial-failure": "一部取得失敗",
  emergency: "緊急対応中",
  maintenance: "保守中",
  drill: "訓練モード",
};

describe("SignageHeatSpecial", () => {
  it.each(SIGNAGE_HEAT_SPECIAL_STATES)(
    "%sを明示し、運用状態を安全判定と混同させない",
    (state) => {
      render(<SignageHeatSpecial state={state} />);

      const card = screen.getByTestId("signage-heat-special");
      expect(card.getAttribute("data-signage-heat-state")).toBe(state);
      expect(card.textContent).toContain(`表示状態：${EXPECTED_LABELS[state]}`);
      expect(card.textContent).not.toContain("WBGT値はこのカードに表示・推定しません");
      expect(card.textContent).not.toContain("このカードは熱中症や警報を自動検知するものではありません");
      expect(card.textContent).not.toMatch(/安全です|安全な状態です/);
    },
  );

  it("emergencyだけをassertive alertとして扱い、通常更新は過剰に読み上げない", () => {
    const { rerender } = render(<SignageHeatSpecial state="emergency" />);
    expect(screen.getByRole("alert").getAttribute("aria-live")).toBe(
      "assertive",
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "作業中止",
    );

    rerender(<SignageHeatSpecial state="drill" />);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    const note = screen.getByRole("note");
    expect(note.getAttribute("aria-live")).toBeNull();
    expect(note.textContent).toContain("訓練表示です");
  });

  it("WBGT値を算出せず、公式確認先をクロール可能なリンクで示す", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<SignageHeatSpecial state="partial-failure" />);

    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/WBGT\s*[=:：]?\s*\d/i);
    expect(text).not.toMatch(/\d+(?:\.\d+)?\s*℃/);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(text).toContain("一部を確認できません。公式情報を確認してください。");

    const details = screen.getByText("公式情報・確認手順").closest("details");
    expect(details?.open).toBe(false);
    fireEvent.click(screen.getByText("公式情報・確認手順"));
    expect(details?.open).toBe(true);

    expect(
      screen
        .getByRole("link", { name: "気象庁の発表" })
        .getAttribute("href"),
    ).toBe(
      "https://www.jma.go.jp/jma/kishou/know/bosai/heat_alert.html",
    );
    expect(
      screen
        .getByRole("link", { name: "環境省の暑さ指数" })
        .getAttribute("href"),
    ).toBe("https://www.wbgt.env.go.jp/");
    expect(
      screen
        .getByRole("link", { name: "現場の確認手順" })
        .getAttribute("href"),
    ).toBe("/heat-illness-prevention");
  });
});
