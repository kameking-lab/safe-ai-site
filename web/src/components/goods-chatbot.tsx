"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardCheck, Send, ShieldCheck } from "lucide-react";
import { TextareaWithVoice } from "@/components/voice-input-field";
import type { GoodsChatResponse } from "@/app/api/goods-chat/route";
import { evaluateChatbotSafety } from "@/lib/chatbot-safety";
import { PUBLIC_SAFETY_GOODS_CATEGORIES } from "@/data/public-safety-goods-categories";

export function GoodsChatbot() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<GoodsChatResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function showSelectionBoundary() {
    const question = input.trim();
    if (!question || sending) return;
    const safety = evaluateChatbotSafety(question);
    if (safety) {
      setResult(null);
      setError(safety.response);
      return;
    }
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/goods-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = (await response.json()) as
        | GoodsChatResponse
        | { error?: { message?: string } };
      if ("error" in data || !response.ok || !("selectionStatus" in data)) {
        setError(
          "error" in data && data.error?.message
            ? data.error.message
            : "確認項目を表示できませんでした。",
        );
        return;
      }
      setResult(data);
    } catch {
      setError("通信に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setSending(false);
    }
  }

  return (
    <section
      className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm"
      aria-labelledby="ppe-selection-boundary-title"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-700">
          <ShieldCheck className="h-5 w-5 text-white" aria-hidden="true" />
        </span>
        <div>
          <h2 id="ppe-selection-boundary-title" className="text-base font-bold text-slate-950">
            保護具選定の条件確認
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            入力は外部AIへ送信しません。商品名や法令適合を自動判定せず、選定前に必要な確認条件だけを整理します。
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <TextareaWithVoice
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="例：有機溶剤を使う塗装作業。屋内、局所排気あり、1日2時間"
          aria-label="作業内容と作業条件"
          className="min-h-[88px] flex-1 resize-y"
          maxLength={2_000}
          disabled={sending}
        />
        <button
          type="button"
          onClick={() => void showSelectionBoundary()}
          disabled={!input.trim() || sending}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {sending ? "確認中…" : "確認項目を表示"}
        </button>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="font-bold text-amber-950">カテゴリ候補を整理しました</p>
          <p className="mt-1 text-sm leading-6 text-amber-950">{result.reply}</p>
          {result.matchedCategories.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-black tracking-wide text-slate-700">関連カテゴリ</p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {result.matchedCategories.map((match) => {
                  const category = PUBLIC_SAFETY_GOODS_CATEGORIES.find(
                    (item) => item.id === match.id,
                  );
                  if (!category) return null;
                  return (
                    <li key={match.id} className="rounded-lg border border-emerald-300 bg-white p-3">
                      <a
                        href={`#goods-${match.id}`}
                        className="block min-h-11 text-sm hover:text-emerald-800"
                      >
                        <span className="font-black text-emerald-900">
                          {category.icon} {category.name}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-600">
                          {match.reason}
                        </span>
                      </a>
                      <a
                        href={`#goods-${match.id}`}
                        className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-emerald-700 bg-emerald-50 px-3 text-xs font-black text-emerald-900 hover:bg-emerald-100"
                      >
                        確認条件と購入先を見る
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="mt-3 rounded-lg bg-white p-3 text-sm text-slate-700">
              危険源を特定できませんでした。「高所」「粉じん」「薬液」「騒音」「酸欠」など、作業と危険を具体的に入力してください。
            </p>
          )}
          <ul className="mt-3 space-y-2">
            {result.checklist.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm leading-6 text-slate-800">
                <ClipboardCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs font-bold leading-5 text-slate-600">
            該当カテゴリへ移動すると確認条件と販売サイトへの広告リンクを表示します。価格・在庫・規格適合を保証するものではありません。型式と適合性を確認してから購入してください。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/chemical-ra"
              className="inline-flex min-h-[44px] items-center rounded-lg border border-emerald-700 bg-white px-3 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50"
            >
              化学物質RAで条件を整理
            </Link>
            <Link
              href="/about/quality"
              className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50"
            >
              情報品質の方針
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
