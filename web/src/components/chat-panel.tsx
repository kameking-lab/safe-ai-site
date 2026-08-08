"use client";

import type { RefObject } from "react";
import { ErrorNotice } from "@/components/error-notice";
import { InputWithVoice } from "@/components/voice-input-field";
import { EasyJapaneseText } from "@/components/easy-japanese-text";
import { Mascot } from "@/components/mascot";
import type { ServiceError, ServiceStatus } from "@/lib/types/api";
import type {
  ChatbotQuickReply,
  ChatbotSource,
} from "@/lib/chatbot-contract";
import type { LegalConversationContext } from "@/lib/legal-conversation-context";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  conditions?: string[];
  clarificationQuestion?: string | null;
  quickReplies?: ChatbotQuickReply[];
  sources?: ChatbotSource[];
  context?: LegalConversationContext;
};

function officialSourceUrl(source: ChatbotSource): string | null {
  if (!source.url) return null;
  try {
    const url = new URL(source.url);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

type ChatPanelProps = {
  selectedRevisionTitle: string;
  chatMessages: ChatMessage[];
  chatInput: string;
  isSending: boolean;
  status: ServiceStatus;
  error: ServiceError | null;
  errorTitle?: string;
  retryLabel?: string;
  chatListRef: RefObject<HTMLDivElement | null>;
  onChatInputChange: (value: string) => void;
  onSend: () => void;
  onRetry: () => void;
};

export function ChatPanel({
  selectedRevisionTitle,
  chatMessages,
  chatInput,
  isSending,
  status,
  error,
  errorTitle = "チャット送信に失敗しました",
  retryLabel = "再試行",
  chatListRef,
  onChatInputChange,
  onSend,
  onRetry,
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
          if (!isUser) {
            return (
              <div key={message.id} className="flex items-start gap-1.5">
                <Mascot size="sm" className="mt-0.5 shrink-0" alt="AI回答" />
                <div className="max-w-[90%] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-700">
                  <EasyJapaneseText>{message.content}</EasyJapaneseText>
                  {(message.conditions?.length ?? 0) > 0 && (
                    <div className="mt-2 border-t border-slate-100 pt-2">
                      <p className="text-xs font-bold text-slate-700">条件で変わる点</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5">
                        {message.conditions!.slice(0, 3).map((condition) => (
                          <li key={condition}>{condition}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {message.clarificationQuestion && (
                    <p className="mt-2 font-medium text-slate-900">
                      {message.clarificationQuestion}
                    </p>
                  )}
                  {(message.quickReplies?.length ?? 0) > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2" aria-label="回答候補">
                      {message.quickReplies!.slice(0, 3).map((reply) => (
                        <button
                          key={`${reply.label}-${reply.prompt}`}
                          type="button"
                          className="min-h-11 rounded-full border border-slate-300 bg-white px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                          onClick={() => onChatInputChange(reply.prompt)}
                        >
                          {reply.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {(message.sources?.length ?? 0) > 0 && (
                    <details className="mt-2 border-t border-slate-100 pt-2">
                      <summary className="min-h-11 cursor-pointer py-2 text-xs font-bold text-slate-700">
                        根拠 {message.sources!.length}件
                      </summary>
                      <ol className="list-decimal space-y-3 pl-5">
                        {message.sources!.map((source) => {
                          const url = officialSourceUrl(source);
                          return (
                            <li key={`${source.law}-${source.article}-${source.item ?? ""}`}>
                              <p className="font-medium text-slate-900">
                                {source.law} {source.article}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-slate-600">
                                {source.snippet ?? source.text}
                              </p>
                              {url && (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 inline-flex min-h-11 items-center text-xs font-medium text-blue-700 underline"
                                >
                                  公式原文
                                </a>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    </details>
                  )}
                </div>
              </div>
            );
          }
          return (
            <div key={message.id} className="ml-auto max-w-[90%] rounded-lg bg-blue-600 px-3 py-2 text-sm leading-6 text-white">
              {message.content}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2">
        <InputWithVoice
          value={chatInput}
          disabled={isSending}
          onChange={(event) => onChatInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSend();
            }
          }}
          className="w-full bg-white text-slate-900 outline-none ring-emerald-200 placeholder:text-slate-400 focus:ring-2"
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
      <p className="mt-2 text-xs text-slate-600">個人情報は入力しない</p>
      {status === "success" && !error && (
        <p className="mt-2 text-xs leading-5 text-emerald-700">
          応答を受信しました。
        </p>
      )}
      {error && (
        <ErrorNotice
          title={errorTitle}
          error={error}
          onRetry={error.retryable ? onRetry : undefined}
          retryLabel={retryLabel}
          className="mt-3"
        />
      )}
    </section>
  );
}
