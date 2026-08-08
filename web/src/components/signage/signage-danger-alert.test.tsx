import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SignageDangerAlert } from "./signage-danger-alert";

describe("SignageDangerAlert", () => {
  // 柱0: フルスクリーン警報オーバーレイの唯一のタップ解除手段が44×44pxであること
  // （p-2+h-6アイコンのみ≈40pxへの退行を防ぐ）。
  it("手動発動後、閉じるボタンが44×44pxタップ標的", () => {
    render(<SignageDangerAlert jmaHeadline={null} warnings={null} />);
    fireEvent.click(screen.getByRole("button", { name: "アラート発動（手動）" }));

    const closeBtn = screen.getByRole("button", { name: "アラートを閉じる" });
    expect(closeBtn.className).toContain("min-h-[44px]");
    expect(closeBtn.className).toContain("min-w-[44px]");
  });

  it.each([
    ["伊豆諸島の暴風警報を解除しました", []],
    ["東京都の大雨警報", [{ code: "03", status: "解除" }]],
    ["発表警報・注意報はなし", [{ code: "03", status: "発表警報・注意報はなし" }]],
    ["東京都の雷注意報", [{ code: "14", status: "発表" }]],
    ["大雨警報から注意報", [{ code: "03", status: "警報から注意報" }]],
  ] as const)("解除・他地域・注意報では自動警報にしない: %s", (headline, warnings) => {
    const { container } = render(
      <SignageDangerAlert jmaHeadline={headline} warnings={[...warnings]} />,
    );
    expect(container.querySelector("[data-danger-active='0']")).not.toBeNull();
    expect(screen.queryByText("高リスク警報を検知中")).toBeNull();
  });

  it("選択地点の発表中警報コードだけを高リスクとして扱う", () => {
    const { container } = render(
      <SignageDangerAlert
        jmaHeadline="東京都に大雨警報"
        warnings={[{ code: "03", status: "発表" }]}
      />,
    );
    expect(container.querySelector("[data-danger-active='1']")).not.toBeNull();
    expect(screen.getByText("高リスク警報を検知中")).not.toBeNull();
  });
});
