import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TransientChatLink } from "./transient-chat-link";
import {
  TransientQueryBridgeProvider,
  useTransientQueryBridge,
} from "./transient-query-bridge";

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

function PendingQuestion() {
  const { peekChatQuestion } = useTransientQueryBridge();
  return (
    <button
      type="button"
      onClick={() => {
        document.body.dataset.pendingQuestion = peekChatQuestion()?.question ?? "";
      }}
    >
      一時質問を確認
    </button>
  );
}

describe("TransientChatLink", () => {
  beforeEach(() => {
    router.push.mockClear();
    window.localStorage.clear();
    window.sessionStorage.clear();
    delete document.body.dataset.pendingQuestion;
    vi.stubGlobal("crypto", { randomUUID: () => "ky-chat-handoff" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("質問本文をhrefや履歴へ加えず、同一タブの一時メモリへ渡す", () => {
    const question = "足場上で外壁パネルを取り付ける作業の根拠条文";
    render(
      <TransientQueryBridgeProvider>
        <TransientChatLink question={question} role="menuitem" title="法令を確認">
          法令を確認
        </TransientChatLink>
        <PendingQuestion />
      </TransientQueryBridgeProvider>,
    );

    const link = screen.getByRole("menuitem", { name: "法令を確認" });
    expect(link.getAttribute("href")).toBe("/chatbot");
    expect(link.getAttribute("href")).not.toContain(encodeURIComponent(question));

    fireEvent.click(link);

    expect(router.push).toHaveBeenCalledWith("/chatbot");
    expect(JSON.stringify(router.push.mock.calls)).not.toContain(question);
    fireEvent.click(screen.getByRole("button", { name: "一時質問を確認" }));
    expect(document.body.dataset.pendingQuestion).toBe(question);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
