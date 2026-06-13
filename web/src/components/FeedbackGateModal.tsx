"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Share2, X } from "lucide-react";
import {
  shouldShowFeedbackGate,
  trackUsage,
  snoozeFeedbackGate,
  markFeedbackSubmitted,
  isWorkContextPath,
} from "@/lib/usage-tracker";

/**
 * 利用スコアが閾値を超えたら表示するフィードバック導線。
 *
 * 第三者レビュー §C 是正（2026-06-13）:
 * - 以前は背景暗転 + aria-modal の全画面割込みで、KY記入中・朝礼前など
 *   作業の文脈を問わず操作をブロックしていた。
 * - 非ブロッキングな下部バナー（PWA促しと同じ作法・背景を暗転させない・
 *   フォーカストラップなし）へ降格。本文操作を妨げない。
 * - /ky 系・/signage 系では出さない。印刷時は print:hidden で消える。
 * - 既定スヌーズは 30 日（usage-tracker の SNOOZE_DAYS_DEFAULT）。
 */
export function FeedbackGateModal() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

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

  // 作業画面（KY記入・朝礼・サイネージ）では割り込まない。
  // ルート遷移で作業画面に入ったら即座に引っ込める。
  if (!open || isWorkContextPath(pathname)) return null;

  const handleSnooze = () => {
    snoozeFeedbackGate();
    setOpen(false);
  };

  const handleAction = () => {
    // いずれかのアクションを実行 → 投稿フラグを立てる（戻るボタンで戻ってきても再表示しない）
    markFeedbackSubmitted();
    setOpen(false);
  };

  const handleShareTwitter = () => {
    const url = "https://www.anzen-ai-portal.jp";
    const text = "現場の労働安全をAIで支援する『安全AIポータル』を使っています。法改正・KY・化学物質RA・事故DB がまとまっていて便利です。";
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text
    )}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=500");
    handleAction();
  };

  return (
    // 非モーダルの下部バナー。背景は暗転させず、本文操作を妨げない。
    // CSS変数 --mobile-bottom-nav-h でモバイル下部ナビと重ならない余白を確保する。
    <div
      role="dialog"
      aria-labelledby="feedback-gate-title"
      className="fixed inset-x-3 bottom-[calc(var(--mobile-bottom-nav-h,0px)+12px)] z-30 mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl print:hidden dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h2
            id="feedback-gate-title"
            className="text-sm font-bold text-slate-900 dark:text-slate-100"
          >
            ご意見をお聞かせください
          </h2>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            現場で役立つサービスにするため、ご協力をお願いします。後でも構いません。
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href="/feedback"
              onClick={handleAction}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
            >
              <MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
              改善提案
            </Link>
            <button
              type="button"
              onClick={handleShareTwitter}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-violet-300 px-4 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950"
            >
              <Share2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              シェアで応援
            </button>
            <button
              type="button"
              onClick={handleSnooze}
              className="inline-flex min-h-[44px] items-center rounded-full px-3 py-2 text-xs font-semibold text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              あとで
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSnooze}
          className="-mr-1 -mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="閉じる（30日後にもう一度）"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
