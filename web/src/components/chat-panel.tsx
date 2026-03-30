"use client";

import type { RefObject } from "react";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatPanelProps = {
  selectedRevisionTitle: string;
  chatMessages: ChatMessage[];
  chatInput: string;
  isSending: boolean;
  chatListRef: RefObject<HTMLDivElement | null>;
  onChatInputChange: (value: string) => void;
  onSend: () => void;
};

export function ChatPanel({
  selectedRevisionTitle,
  chatMessages,
  chatInput,
  isSending,
  chatListRef,
  onChatInputChange,
  onSend,
}: ChatPanelProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-24">
      <h2 className="text-base font-bold text-slate-900">質問チャット</h2>
      <p className="mt-1 text-sm font-medium text-slate-700">対象: {selectedRevisionTitle}</p>

      <div
        ref={chatListRef}
        className="mt-3 h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/90 p-3 sm:h-72"
      >
        {chatMessages.map((message) => {
          const isUser = message.role === "user";
          return (
            <div
              key={message.id}
              className={`max-w-[90%] rounded-lg px-3 py-2 text-sm leading-6 ${
                isUser
                  ? "ml-auto bg-blue-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700"
              }`}
            >
              {message.content}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={chatInput}
          disabled={isSending}
          onChange={(event) => onChatInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSend();
            }
          }}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-200 placeholder:text-slate-400 focus:ring-2"
          placeholder="この法改正について質問を入力"
          aria-label="質問入力"
        />
        <button
          type="button"
          disabled={isSending}
          onClick={onSend}
          className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-white transition ${
            isSending
              ? "cursor-not-allowed bg-emerald-300"
              : "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99]"
          }`}
        >
          {isSending ? "送信中..." : "送信"}
        </button>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        ※ 現在はダミー回答です。後でAPI連携に差し替えます。
      </p>
    </section>
  );
}
