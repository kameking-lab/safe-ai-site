import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SignageDangerAlert } from "./signage-danger-alert";

describe("SignageDangerAlert", () => {
  // 柱0: フルスクリーン警報オーバーレイの唯一のタップ解除手段が44×44pxであること
  // （p-2+h-6アイコンのみ≈40pxへの退行を防ぐ）。
  it("手動発動後、閉じるボタンが44×44pxタップ標的", () => {
    render(<SignageDangerAlert jmaHeadline={null} warnings={null} />);
    fireEvent.click(screen.getByRole("button", { name: "🚨 アラート発動（手動）" }));

    const closeBtn = screen.getByRole("button", { name: "アラートを閉じる" });
    expect(closeBtn.className).toContain("min-h-[44px]");
    expect(closeBtn.className).toContain("min-w-[44px]");
  });
});
