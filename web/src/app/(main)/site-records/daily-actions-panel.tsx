"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight, ListTodo } from "lucide-react";
import {
  buildDailyActions,
  countBySeverity,
  mergeCheckupTrackerMaps,
  readCheckupTrackerMaps,
  type DailyAction,
} from "@/lib/site-records/daily-actions";
import { getAllPatrolRecords } from "@/lib/site-records/patrol-store";
import { getNearMissReports } from "@/lib/site-records/nearmiss-store";
import { getInspectionList } from "@/lib/site-records/inspection-store";
import { getCommitteeList } from "@/lib/site-records/committee-store";

const VISIBLE_LIMIT = 6;

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const ROW_BORDER: Record<DailyAction["severity"], string> = {
  overdue: "border-l-rose-500 bg-rose-50/60",
  alert: "border-l-amber-500 bg-amber-50/40",
  info: "border-l-slate-300 bg-white",
};

const CHIP_CLASS: Record<DailyAction["severity"], string> = {
  overdue: "bg-rose-100 text-rose-700",
  alert: "bg-amber-100 text-amber-800",
  info: "bg-slate-100 text-slate-600",
};

/**
 * 「今日やること（期限切れ・要対応）」横断パネル。
 * 各記録ツールの localStorage を走査し、優先順に並んだ具体アクションを1枚で示す。
 */
export function DailyActionsPanel() {
  const [actions, setActions] = useState<DailyAction[] | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorageは描画後にのみ参照可（SSRハイドレーション差異回避）
    setActions(
      buildDailyActions(
        {
          patrolRecords: getAllPatrolRecords(),
          nearMissReports: getNearMissReports(),
          inspections: getInspectionList(),
          committees: getCommitteeList(),
          checkupRecords: mergeCheckupTrackerMaps(readCheckupTrackerMaps()),
        },
        todayIso(),
      ),
    );
  }, []);

  if (!actions) return null;

  const counts = countBySeverity(actions);
  const urgent = actions.filter((a) => a.severity !== "info");
  const infos = actions.filter((a) => a.severity === "info");
  const visibleUrgent = showAll ? urgent : urgent.slice(0, VISIBLE_LIMIT);
  const hiddenCount = urgent.length - visibleUrgent.length;

  return (
    <section className="mt-2 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
          <ListTodo className="h-4 w-4 text-slate-500" aria-hidden="true" />
          今日やること（期限切れ・要対応）
        </h2>
        {counts.overdue > 0 && (
          <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white">
            期限超過 {counts.overdue}件
          </span>
        )}
        {counts.alert > 0 && (
          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">
            要対応 {counts.alert}件
          </span>
        )}
      </div>

      {urgent.length === 0 ? (
        <p className="mt-2 flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          期限切れ・要対応はありません
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {visibleUrgent.map((a) => (
            <li key={a.id}>
              <Link
                href={a.href}
                className={`flex items-start gap-2 rounded-lg border border-slate-200 border-l-4 px-3 py-2 transition hover:shadow-sm ${ROW_BORDER[a.severity]}`}
              >
                <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${CHIP_CLASS[a.severity]}`}>
                  {a.sourceLabel}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold leading-5 text-slate-800">
                    {a.severity === "overdue" && (
                      <AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-rose-600" aria-hidden="true" />
                    )}
                    {a.title}
                  </span>
                  {(a.detail || a.due) && (
                    <span className="mt-0.5 block text-[11px] text-slate-500">
                      {a.detail}
                      {a.due && (
                        <span className={a.severity === "overdue" ? "ml-1 font-bold text-rose-600" : "ml-1"}>
                          期日 {a.due}
                        </span>
                      )}
                    </span>
                  )}
                </span>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-2 w-full rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          残り {hiddenCount} 件をすべて表示
        </button>
      )}

      {infos.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-2">
          <p className="text-[11px] font-semibold text-slate-500">今月の予定（年間カレンダーより）</p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {infos.map((a) => (
              <li key={a.id}>
                <Link
                  href={a.href}
                  className="inline-block rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 transition hover:border-slate-300 hover:bg-white"
                >
                  {a.title}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/site-records/calendar"
                className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-white"
              >
                カレンダーで全予定 →
              </Link>
            </li>
          </ul>
        </div>
      )}
    </section>
  );
}
