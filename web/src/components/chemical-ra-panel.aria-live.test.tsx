import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChemicalRaPanel } from "./chemical-ra-panel";
import { TransientQueryBridgeProvider } from "./home-safety-cockpit/transient-query-bridge";

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
    render(
      <TransientQueryBridgeProvider>
        <ChemicalRaPanel />
      </TransientQueryBridgeProvider>,
    );

    fireEvent.change(screen.getByLabelText(/物質名・CAS番号・SDS記載名/), {
      target: { value: "トルエン" },
    });
    fireEvent.click(screen.getByRole("button", { name: "作業条件へ進む" }));
    fireEvent.click(screen.getByRole("button", { name: "公的情報を確認" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("AI呼び出しに失敗しました");
    });
  });
});
