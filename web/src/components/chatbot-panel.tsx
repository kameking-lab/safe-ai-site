"use client";

import { useRef, useState } from "react";
import type { ChatbotSource } from "@/app/api/chatbot/route";
import { useUsageLimit } from "@/lib/hooks/use-usage-limit";
import { UpgradePrompt } from "@/components/upgrade-prompt";

const FREE_CHAT_LIMIT = 5;

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatbotSource[];
};

const EXAMPLE_QUESTIONS = [
  "安全管理者の選任要件を教えてください",
  "フォークリフトの運転に必要な資格は？",
  "酸素欠乏危険作業の作業主任者の職務は？",
  "定期健康診断の実施頻度は？",
  "有機溶剤作業主任者の選任が必要な場合は？",
  "クレーン運転士の就業制限は？",
];

export function ChatbotPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { isExceeded: chatLimitReached, increment: incrementChat, reset: resetChat } = useUsageLimit({
    key: "chatbot_usage",
    limit: FREE_CHAT_LIMIT,
    period: "day",
  });

  async function handleSend(question?: string) {
    const text = (question ?? input).trim();
    if (!text || isSending) return;
    if (chatLimitReached) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsSending(true);
    setError(null);

    // スクロールを一番下へ
    setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }, 50);

    incrementChat();

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        const errBody = (await res.json()) as { error: string };
        throw new Error(errBody.error ?? "エラーが発生しました");
      }

      const data = (await res.json()) as { answer: string; sources: ChatbotSource[] };

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer,
        sources: data.sources,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "通信エラーが発生しました";
      setError(message);
    } finally {
      setIsSending(false);
      setTimeout(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      }, 100);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* 免責バナー */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs text-amber-800 leading-5">
          <span className="font-bold">⚠ 免責事項：</span>
          本サービスは法的助言ではありません。実際の判断は必ず専門家（労働安全コンサルタント等）にご確認ください。
        </p>
      </div>

      {/* チャット履歴 */}
      <div
        ref={listRef}
        className="min-h-[320px] flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/80 p-4"
      >
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 py-8">
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700">
                労働安全衛生法についてご質問ください
              </p>
              <p className="mt-1 text-xs text-slate-500">
                安衛法・安衛則・クレーン則・有機則・特化則・酸欠則に対応
              </p>
            </div>
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSend(q)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 active:scale-[0.98]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id}>
                <div
                  className={`max-w-[88%] rounded-xl px-4 py-3 text-sm leading-6 ${
                    msg.role === "user"
                      ? "ml-auto bg-blue-600 text-white"
                      : "border border-slate-200 bg-white text-slate-800"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>

                {/* 根拠条文の表示 */}
                {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                  <details className="mt-2 max-w-[88%] rounded-lg border border-slate-200 bg-white p-3">
                    <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-700">
                      参照条文 ({msg.sources.length}件)
                    </summary>
                    <div className="mt-2 space-y-2">
                      {msg.sources.map((src, i) => (
                        <div key={i} className="rounded-md bg-slate-50 p-2 text-xs">
                          <p className="font-semibold text-blue-700">
                            {src.law} {src.article}
                          </p>
                          <p className="mt-1 text-slate-600 leading-5">{src.text}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ))}

            {/* 送信中インジケータ */}
            {isSending && (
              <div className="flex items-center gap-2 border border-slate-200 bg-white rounded-xl px-4 py-3 max-w-[88%]">
                <span className="inline-flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                  <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                  <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                </span>
                <span className="text-xs text-slate-500">回答を生成中...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 入力エリア */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          disabled={isSending || chatLimitReached}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="安衛法について質問を入力..."
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
          aria-label="質問入力"
        />
        <button
          type="button"
          disabled={isSending || !input.trim() || chatLimitReached}
          onClick={() => handleSend()}
          className="shrink-0 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          送信
        </button>
      </div>

      {/* 利用上限 */}
      {chatLimitReached && (
        <UpgradePrompt
          featureName="AIチャットボット"
          limit={FREE_CHAT_LIMIT}
          period="day"
          onReset={resetChat}
        />
      )}

      {/* 免責注記 */}
      <p className="text-xs text-slate-400 leading-5">
        ※ 回答は提供済み法令条文に基づくものです。最新の法令は
        <a
          href="https://elaws.e-gov.go.jp/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-600"
        >
          e-Gov法令検索
        </a>
        で確認してください。法的判断は専門家にご相談ください。
      </p>
    </div>
  );
}
