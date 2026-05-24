"use client";

/**
 * P0-006 (usability-audit-day2-2026-05-24):
 * 過去計画ピッカー UI。最大3件の履歴をドロップダウンで表示し、選択すると
 * その preview ページに遷移する。プレビュー画面とフォーム画面の両方で使う。
 *
 * 履歴がない (= 初めて生成) 場合は何も描画しない。
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { History, ArrowRight } from "lucide-react";
import {
  loadPlanHistory,
  type PlanHistoryEntry,
} from "@/lib/safety-plan/history";

type PlanHistoryPickerProps = {
  /** 現在表示中のエントリ ID。同じものは「(表示中)」と表記する。 */
  currentId?: string;
  /** UI 種別。compact はフォーム上部用、full はプレビュー画面用。 */
  variant?: "compact" | "full";
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}

export function PlanHistoryPicker({
  currentId,
  variant = "compact",
}: PlanHistoryPickerProps) {
  const [history, setHistory] = useState<PlanHistoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage は外部システム、初回マウントでの hydration として setState は正当
    setHistory(loadPlanHistory());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  if (!hydrated) return null;
  if (history.length === 0) return null;

  if (variant === "compact") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-amber-900">
          <History className="h-3.5 w-3.5" aria-hidden="true" />
          過去の計画から作成 ({history.length}件)
        </div>
        <p className="mt-1 text-[11px] text-amber-800">
          昨年・前年の計画書を再表示・編集できます。最大3件を端末内に保持。
        </p>
        <ul className="mt-2 space-y-1.5">
          {history.map((h) => {
            const isCurrent = h.id === currentId;
            return (
              <li key={h.id}>
                <Link
                  href={h.previewHref}
                  className={`flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 transition ${
                    isCurrent
                      ? "border-amber-400 bg-amber-100 text-amber-900"
                      : "border-amber-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50"
                  }`}
                >
                  <span className="flex-1 truncate">
                    <span className="font-bold">{h.fiscalYear}年度</span>
                    <span className="ml-1 text-[10px] text-slate-500">
                      {h.industryLabel} / {h.scaleLabel}
                    </span>
                    {h.organizationName && (
                      <span className="ml-1 text-[10px] text-slate-500">
                        ・ {h.organizationName}
                      </span>
                    )}
                    {isCurrent && (
                      <span className="ml-1 rounded bg-amber-200 px-1 text-[10px] font-bold text-amber-900">
                        表示中
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-[10px] text-slate-500">
                    {formatDate(h.generatedAt)}
                  </span>
                  {!isCurrent && (
                    <ArrowRight className="h-3 w-3 shrink-0 text-amber-700" aria-hidden="true" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // full variant (preview page sidebar)
  return (
    <aside
      aria-label="過去計画"
      className="mt-6 rounded-xl border border-amber-200 bg-amber-50/40 p-4 print:hidden"
    >
      <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
        <History className="h-4 w-4" aria-hidden="true" />
        過去の計画 ({history.length}件)
      </div>
      <p className="mt-1 text-xs text-amber-800">
        本ブラウザに保存された過去の計画書 (最大3件)。クリックで再表示・PDF再出力できます。
      </p>
      <ul className="mt-3 space-y-2">
        {history.map((h) => {
          const isCurrent = h.id === currentId;
          return (
            <li key={h.id}>
              <Link
                href={h.previewHref}
                className={`flex flex-col gap-1 rounded-lg border px-3 py-2 transition ${
                  isCurrent
                    ? "border-amber-400 bg-amber-100"
                    : "border-amber-200 bg-white hover:border-amber-300"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                    {h.fiscalYear}年度
                  </span>
                  <span className="text-xs font-semibold text-slate-800">
                    {h.industryLabel} / {h.scaleLabel}
                  </span>
                  {isCurrent && (
                    <span className="rounded bg-amber-300 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">
                      表示中
                    </span>
                  )}
                </div>
                {h.organizationName && (
                  <p className="text-xs text-slate-600">{h.organizationName}</p>
                )}
                <p className="text-[10px] text-slate-500">
                  生成: {formatDate(h.generatedAt)}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
