import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatPanel } from "./chat-panel";

describe("ChatPanel legacy answer-first UI", () => {
  it("回答の後に条件・確認・最大3件のcompact replyを示し、根拠は閉じる", () => {
    const onChatInputChange = vi.fn();
    const { container } = render(
      <ChatPanel
        selectedRevisionTitle="労働安全衛生規則"
        chatMessages={[
          {
            id: "assistant-1",
            role: "assistant",
            content:
              "電気作業の資格・教育は、配線工事、充電部付近の作業、設備操作で異なります。",
            conditions: ["工事か操作か", "電圧区分", "充電部への接近"],
            clarificationQuestion:
              "必要な資格を絞るため、実際に行うのはどの作業ですか？",
            quickReplies: [
              { label: "配線工事", prompt: "配線工事です" },
              { label: "充電部・近接", prompt: "充電部・近接作業です" },
              { label: "操作・点検", prompt: "設備の操作・点検です" },
              { label: "表示しない候補", prompt: "4件目" },
            ],
            sources: [
              {
                law: "労働安全衛生規則（安衛則）",
                article: "第36条",
                text: "低圧の充電電路の敷設等の業務",
                snippet: "低圧の充電電路の敷設若しくは修理の業務",
                url: "https://laws.e-gov.go.jp/law/347M50002000032",
              },
            ],
          },
        ]}
        chatInput=""
        isSending={false}
        status="idle"
        error={null}
        chatListRef={createRef<HTMLDivElement>()}
        onChatInputChange={onChatInputChange}
        onSend={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText(/電気作業の資格・教育は/)).toBeDefined();
    expect(screen.getByText("条件で変わる点")).toBeDefined();
    expect(screen.getByText(/必要な資格を絞るため/)).toBeDefined();
    expect(screen.getAllByRole("button", { name: /配線工事|充電部・近接|操作・点検/ })).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "表示しない候補" })).toBeNull();

    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect((details as HTMLDetailsElement).open).toBe(false);
    expect(screen.getByRole("link", { name: "公式原文" }).getAttribute("href")).toBe(
      "https://laws.e-gov.go.jp/law/347M50002000032",
    );

    fireEvent.click(screen.getByRole("button", { name: "充電部・近接" }));
    expect(onChatInputChange).toHaveBeenCalledWith("充電部・近接作業です");
  });
});
