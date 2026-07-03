import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ChatbotPanel } from "./chatbot-panel";

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
}));

// jsdom は Element.scrollTo 未実装のため、自動スクロールが投げる例外を吸収する
Element.prototype.scrollTo = vi.fn();

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("ChatbotPanel a11y", () => {
  it("回答ストリーミング中は最新のAI回答バブルにaria-live=politeが付く", async () => {
    // /api/chatbot/stream を解決させず isSending=true のまま保持し、
    // ストリーミング中プレースホルダの状態を固定して検証する。
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => new Promise(() => {})),
    );
    render(<ChatbotPanel />);

    fireEvent.click(screen.getAllByText("足場の手すり高さは？")[0]);

    await waitFor(() => {
      const bubble = document.querySelector('[aria-live="polite"]');
      expect(bubble).not.toBeNull();
    });
  });

  it("送信失敗時のエラー表示はrole=alertでスクリーンリーダーに通知される", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );
    render(<ChatbotPanel />);

    fireEvent.click(screen.getAllByText("足場の手すり高さは？")[0]);

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert.textContent).toContain("network down");
    });
  });
});
