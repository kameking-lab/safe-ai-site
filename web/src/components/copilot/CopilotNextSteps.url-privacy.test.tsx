import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CopilotNextSteps } from "./CopilotNextSteps";
import {
  TransientQueryBridgeProvider,
  useTransientQueryBridge,
} from "@/components/home-safety-cockpit/transient-query-bridge";

const router = vi.hoisted(() => ({ push: vi.fn() }));
const concern = "audit.person@example.invalid の足場点検";

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/components/copilot/CopilotProvider", () => ({
  useOptionalCopilot: () => ({
    state: {
      industry: "construction",
      keyConcerns: ["audit.person@example.invalid の足場点検"],
    },
  }),
}));

vi.mock("@/lib/public-content-policy", () => ({
  isPublicRouteAvailable: () => true,
}));

function PendingQuestion() {
  const { peekChatQuestion } = useTransientQueryBridge();
  return (
    <button
      type="button"
      onClick={() => {
        document.body.dataset.pendingQuestion =
          peekChatQuestion()?.question ?? "";
      }}
    >
      一時質問を確認
    </button>
  );
}

describe("CopilotNextSteps URL privacy", () => {
  beforeEach(() => {
    router.push.mockClear();
    window.localStorage.clear();
    window.sessionStorage.clear();
    delete document.body.dataset.pendingQuestion;
    vi.stubGlobal("crypto", { randomUUID: () => "copilot-chat-handoff" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("利用者由来の関心事項をchatbot・計画URLへ載せない", () => {
    render(
      <TransientQueryBridgeProvider>
        <CopilotNextSteps current="accidents-reports" />
        <PendingQuestion />
      </TransientQueryBridgeProvider>,
    );

    const chatLink = screen.getByRole("link", {
      name: /関連法令を安衛法AIで深掘りする/u,
    });
    expect(chatLink.getAttribute("href")).toBe("/chatbot");
    expect(document.body.innerHTML).not.toContain(encodeURIComponent(concern));

    const planLink = screen.getByRole("link", {
      name: /年次安全衛生計画を作成する/u,
    });
    expect(planLink.getAttribute("href")).not.toContain("focus=");
    expect(planLink.getAttribute("href")).not.toContain(
      encodeURIComponent(concern),
    );

    fireEvent.click(chatLink);
    expect(router.push).toHaveBeenCalledWith("/chatbot");
    fireEvent.click(screen.getByRole("button", { name: "一時質問を確認" }));
    expect(document.body.dataset.pendingQuestion).toContain(concern);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
