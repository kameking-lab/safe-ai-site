"use client";

import Link from "next/link";
import { ClipboardList, Search } from "lucide-react";
import { KyHandoffLink } from "@/components/ky-handoff-link";
import type { AccidentCase } from "@/lib/types/domain";
import type {
  KySafeAccidentType,
  KySafeWorkCategory,
} from "@/lib/ky/handoff";
import { isAccidentEligibleForOperationalEvidence } from "@/lib/accident-source";

type Props = {
  accident: Pick<
    AccidentCase,
    "id" | "title" | "type" | "workCategory" | "provenance" | "source"
  >;
  /**
   * "sticky": モバイルで画面下部に固定表示。
   * "inline": 通常のフローに表示（デスクトップや展開カード内）。
   */
  variant?: "sticky" | "inline";
};

/**
 * 事故詳細から、人間確認を前提にKYと法令検索へ進む固定アクションバー。
 * モバイル sticky / デスクトップ inline の2モード。
 */
export function AccidentActionBar({ accident, variant = "inline" }: Props) {
  const lawSearchHref = "/law-search";
  const eligibleForHandoff =
    isAccidentEligibleForOperationalEvidence(accident);
  const accidentType: KySafeAccidentType =
    accident.type === "墜落"
      ? "fall"
      : accident.type === "はさまれ・巻き込まれ"
        ? "caught"
        : accident.type === "車両" || accident.type === "交通事故" || accident.type === "激突され"
          ? "traffic"
          : accident.type === "崩壊・倒壊"
            ? "collapse"
            : accident.type === "飛来・落下"
              ? "falling-object"
              : accident.type === "火災" || accident.type === "爆発"
                ? "fire-explosion"
                : accident.type === "感電"
                  ? "electric-shock"
                  : accident.type === "熱中症" || accident.type === "高温・低温の物との接触"
                    ? "heat"
                    : accident.type === "有害物等との接触" || accident.type === "有害物質"
                      ? "chemical"
                      : "unknown";
  const workCategory: KySafeWorkCategory =
    accident.workCategory === "建設業"
      ? "construction"
      : accident.workCategory === "製造業"
        ? "manufacturing"
        : accident.workCategory === "運輸交通業"
          ? "transport"
          : accident.workCategory === "化学"
            ? "chemical"
            : "unknown";

  const containerClass =
    variant === "sticky"
      ? "sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-3 mt-3 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 sm:hidden"
      : "mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60";

  return (
    <div
      className={containerClass}
      aria-label={`${accident.title} の関連アクション`}
    >
      <div className="flex flex-wrap gap-2">
        {eligibleForHandoff ? (
          <KyHandoffLink
            handoff={{
              source: "accident",
              accidentId: accident.id,
              accidentType,
              workCategory,
            }}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 sm:flex-none"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            この事故を参考にKYを作る
          </KyHandoffLink>
        ) : (
          <Link
            href="/ky/paper"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 sm:flex-none"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            空のKYを作る
          </Link>
        )}
        <Link
          href={lawSearchHref}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-violet-700 sm:flex-none"
        >
          <Search className="h-3.5 w-3.5" />
          法令検索を開く
        </Link>
      </div>
    </div>
  );
}
