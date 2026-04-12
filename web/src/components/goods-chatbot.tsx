"use client";

import { useRef, useState } from "react";
import { Bot, Send, ShoppingBag } from "lucide-react";
import { TextareaWithVoice } from "@/components/voice-input-field";
import { amazonSearchUrl, rakutenSearchUrl } from "@/lib/affiliate";
import type { GoodsRecommendation, GoodsChatResponse } from "@/app/api/goods-chat/route";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  recommendations?: GoodsRecommendation[];
};

const EXAMPLE_QUESTIONS = [
  "高さ10mの鉄骨建方作業をします。どんな保護具が必要ですか？",
  "有機溶剤を使った塗装作業。必要な保護具を教えてください",
  "グラインダーで金属を研削する作業をします",
  "騒音の激しい工場で溶接作業をしています",
];

function RecommendationCard({ item }: { item: GoodsRecommendation }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <ShoppingBag className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">{item.item}</p>
          <p className="mt-0.5 text-xs text-slate-600">{item.reason}</p>
          {item.lawBasis && (
            <p className="mt-1 text-[10px] font-medium text-emerald-700">法令: {item.lawBasis}</p>
          )}
          <div className="mt-2 flex gap-1.5">
            <a
              href={amazonSearchUrl(item.searchQuery)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-amber-500 px-2 py-1 text-[10px] font-bold text-white hover:bg-amber-600"
            >
              Amazonで探す
            </a>
            <a
              href={rakutenSearchUrl(item.searchQuery)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-rose-500 px-2 py-1 text-[10px] font-bold text-white hover:bg-rose-600"
            >
              楽天で探す
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GoodsChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      role: "assistant",
      text: "こんにちは！作業内容や作業環境を教えていただくと、必要な保護具を法令根拠とともにご提案します。\n\n例: 「高所作業（10m）で鉄骨組立てをします。必要な保護具は？」",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }, 100);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    scrollToBottom();

    try {
      const res = await fetch("/api/goods-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text.trim() }),
      });
      const data = (await res.json()) as GoodsChatResponse | { error: { message: string } };
      if ("error" in data) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            text: `エラー: ${data.error.message}`,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            text: data.reply,
            recommendations: data.recommendations,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          text: "通信エラーが発生しました。しばらく経ってから再試行してください。",
        },
      ]);
    } finally {
      setSending(false);
      scrollToBottom();
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-5 shadow-sm">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">保護具選定AIアシスタント</h2>
          <p className="text-xs text-slate-500">作業内容を入力すると、必要な保護具を法令根拠付きで提案します</p>
        </div>
        <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">Gemini AI</span>
      </div>

      {/* メッセージ一覧 */}
      <div
        ref={listRef}
        className="mb-4 max-h-96 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-inner"
      >
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}>
            <div
              className={`max-w-[90%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-200 bg-slate-50 text-slate-800"
              }`}
              style={{ whiteSpace: "pre-wrap" }}
            >
              {msg.text}
            </div>
            {msg.recommendations && msg.recommendations.length > 0 && (
              <div className="w-full max-w-lg space-y-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">推奨保護具 ({msg.recommendations.length}件)</p>
                {msg.recommendations.map((rec, i) => (
                  <RecommendationCard key={i} item={rec} />
                ))}
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div className="flex items-start gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500">
              <span className="animate-pulse">回答を生成中…</span>
            </div>
          </div>
        )}
      </div>

      {/* サンプル質問 */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {EXAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => sendMessage(q)}
            disabled={sending}
            className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
          >
            {q.length > 20 ? q.slice(0, 20) + "…" : q}
          </button>
        ))}
      </div>

      {/* 入力欄 */}
      <div className="flex gap-2">
        <TextareaWithVoice
          className="min-h-12 flex-1 resize-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void sendMessage(input);
            }
          }}
          placeholder="作業内容・環境を入力（例：地上15mの外壁塗装作業）"
          disabled={sending}
        />
        <button
          type="button"
          onClick={() => void sendMessage(input)}
          disabled={!input.trim() || sending}
          className="shrink-0 rounded-xl bg-emerald-600 p-3 text-white shadow hover:bg-emerald-700 disabled:opacity-50"
          aria-label="送信"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 text-[10px] text-slate-400">
        ※ AI回答は参考情報です。実際の保護具選定は専門家・安全管理者にご確認ください。
        商品リンクはアフィリエイトプログラムを利用しています。
      </p>
    </div>
  );
}
