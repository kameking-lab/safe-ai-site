"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, Share2, FileText, X } from "lucide-react";
import {
  shouldShowFeedbackGate,
  trackUsage,
  snoozeFeedbackGate,
  markFeedbackSubmitted,
} from "@/lib/usage-tracker";

/**
 * 利用スコアが閾値を超えたら中央モーダルで表示。
 * 3つの選択肢から1つ実行で閉じ可能。「次回」で7日延期。
 */
export function FeedbackGateModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // 全ページでマウント時に PV を加算してから判定
    trackUsage("page_view");
    // 数百msの猶予をおいてゲート判定（読み込み直後に被せない）
    const t = window.setTimeout(() => {
      if (shouldShowFeedbackGate()) {
        setOpen(true);
      }
    }, 1500);
    return () => window.clearTimeout(t);
  }, []);

  if (!open) return null;

  const handleSnooze = () => {
    snoozeFeedbackGate(7);
    setOpen(false);
  };

  const handleAction = () => {
    // いずれかのアクションを実行 → 投稿フラグを立てる（戻るボタンで戻ってきても再表示しない）
    markFeedbackSubmitted();
    setOpen(false);
  };

  const handleShareTwitter = () => {
    const url = "https://safe-ai-site.vercel.app";
    const text = "現場の労働安全をAIで支援する『ANZEN AI』を使っています。法改正・KY・化学物質RA・事故DB がまとまっていて便利です。";
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text
    )}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=500");
    handleAction();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-gate-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2
              id="feedback-gate-title"
              className="text-lg font-bold text-slate-900 sm:text-xl"
            >
              いつもご利用ありがとうございます
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              現場で役立つサービスにするため、ご協力をお願いします。
            </p>
          </div>
          <button
            type="button"
            onClick={handleSnooze}
            className="ml-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-3 px-6 py-5">
          <Link
            href="/feedback"
            onClick={handleAction}
            className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 transition hover:bg-emerald-100"
          >
            <MessageSquare className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-slate-900">ご意見・改善提案</p>
              <p className="mt-0.5 text-xs text-slate-700">
                使いにくい点・追加してほしい機能などを教えてください。
              </p>
            </div>
          </Link>

          <Link
            href="/community-cases/submit"
            onClick={handleAction}
            className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 transition hover:bg-sky-100"
          >
            <FileText className="mt-0.5 h-6 w-6 shrink-0 text-sky-600" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-slate-900">現場事例を共有</p>
              <p className="mt-0.5 text-xs text-slate-700">
                ヒヤリハット・質問・現場のTipsを匿名で投稿できます。
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={handleShareTwitter}
            className="flex w-full items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-left transition hover:bg-violet-100"
          >
            <Share2 className="mt-0.5 h-6 w-6 shrink-0 text-violet-600" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-slate-900">シェアで応援</p>
              <p className="mt-0.5 text-xs text-slate-700">
                X（旧Twitter）でこのサイトを共有して仲間を増やしませんか。
              </p>
            </div>
          </button>
        </div>

        <div className="flex justify-end border-t border-slate-200 px-6 py-3">
          <button
            type="button"
            onClick={handleSnooze}
            className="text-xs font-semibold text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
          >
            次回でいい（7日後にもう一度）
          </button>
        </div>
      </div>
    </div>
  );
}
