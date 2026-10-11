"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronDown, MessageSquare, Share2 } from "lucide-react";
import {
  shouldShowFeedbackGate,
  trackUsage,
  snoozeFeedbackGate,
  markFeedbackSubmitted,
  isWorkContextPath,
} from "@/lib/usage-tracker";

/**
 * 利用スコアが閾値を超えた利用者向けの、小さなフィードバック導線。
 *
 * 2026-10-11 是正: 485px幅で自動表示の下部バナー（約150px）が、ホームの機能や
 * コンクリート計算の図・入力欄を覆っていた。
 * - 自動で開く大きな固定バナーをやめ、本文の流れの末尾（フッター直前）に置く
 *   小さな「ご意見をお聞かせください」ボタンへ変更。固定配置しないので入力・結果を覆わない。
 * - 選択肢（改善提案 /feedback・シェア・あとで）は利用者がボタンを押したときだけ開く。
 * - 作業画面（KY・朝礼・サイネージ・計算ツール等）では出さない。印刷時は print:hidden。
 * - 既定スヌーズは 30 日（usage-tracker の SNOOZE_DAYS_DEFAULT）。
 */
export function FeedbackGateModal() {
  const [eligible, setEligible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // 全ページでマウント時に PV を加算してから判定。判定結果は小さな入口の
    // 表示可否だけに使い、選択肢の展開は利用者の操作に任せる。
    trackUsage("page_view");
    const t = window.setTimeout(() => setEligible(shouldShowFeedbackGate()), 0);
    return () => window.clearTimeout(t);
  }, []);

  if (!eligible || isWorkContextPath(pathname)) return null;

  const handleSnooze = () => {
    snoozeFeedbackGate();
    setEligible(false);
  };

  const handleAction = () => {
    // いずれかのアクションを実行 → 投稿フラグを立てる（戻るボタンで戻ってきても再表示しない）
    markFeedbackSubmitted();
    setEligible(false);
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
    <section
      aria-label="ご意見の受付"
      className="mx-auto mt-6 w-full max-w-7xl px-4 print:hidden"
    >
      <div className="rounded-xl border border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-900/80">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls="feedback-entry-options"
          className="flex min-h-[44px] w-full items-center gap-2 px-4 py-2 text-left text-sm font-semibold text-slate-700 transition hover:text-emerald-700 dark:text-slate-200 dark:hover:text-emerald-300"
        >
          <MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">ご意見をお聞かせください</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition ${expanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
        {expanded ? (
          <div id="feedback-entry-options" className="border-t border-slate-200 px-4 pb-3 pt-2 dark:border-slate-700">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              現場で役立つサービスにするため、ご協力をお願いします。後でも構いません。
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
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
                あとで（30日後）
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
