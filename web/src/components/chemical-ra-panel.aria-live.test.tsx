import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChemicalRaPanel } from "./chemical-ra-panel";

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
}));

describe("ChemicalRaPanel エラー表示のaria-live（スクリーンリーダー通知）", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 500,
        json: async () => ({ error: { message: "AI呼び出しに失敗しました" } }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("判定失敗時のエラーメッセージがrole=alertでスクリーンリーダーに通知される", async () => {
    render(<ChemicalRaPanel />);

    fireEvent.change(screen.getByLabelText(/物質名・CAS番号・製品名を入力/), {
      target: { value: "トルエン" },
    });
    fireEvent.click(screen.getByRole("button", { name: /STEP 3：リスクを判定して/ }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("AI呼び出しに失敗しました");
    });
  });
});
