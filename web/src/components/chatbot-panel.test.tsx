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

describe("ChatbotPanel 保存済み会話の削除確認", () => {
  function seedSavedSession() {
    window.localStorage.setItem(
      "chatbot_history_v2",
      JSON.stringify([
        {
          id: "s1",
          title: "テスト会話",
          savedAt: Date.now(),
          messages: [{ role: "user", content: "こんにちは" }],
        },
      ]),
    );
  }

  it("キャンセル時は保存済みセッションが削除されない", async () => {
    seedSavedSession();
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));
    render(<ChatbotPanel />);

    fireEvent.click(screen.getByLabelText("保存済み会話を開く"));
    const deleteButton = await screen.findByLabelText("削除");
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(screen.queryByText("テスト会話")).not.toBeNull();
  });

  it("確認して削除すると保存済みセッションが消える", async () => {
    seedSavedSession();
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    render(<ChatbotPanel />);

    fireEvent.click(screen.getByLabelText("保存済み会話を開く"));
    const deleteButton = await screen.findByLabelText("削除");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.queryByText("テスト会話")).toBeNull();
    });
  });
});
