"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronRight, ListTodo } from "lucide-react";
import { SAFETY_TONE, dominantTone, type SafetyTone } from "@/lib/design/safety-tone";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  buildDailyActions,
  countBySeverity,
  mergeCheckupTrackerMaps,
  readCheckupTrackerMaps,
  todayIso,
  type DailyAction,
} from "@/lib/site-records/daily-actions";
import { getAllPatrolRecords } from "@/lib/site-records/patrol-store";
import { getNearMissReports } from "@/lib/site-records/nearmiss-store";
import { getInspectionList } from "@/lib/site-records/inspection-store";
import { getCommitteeList } from "@/lib/site-records/committee-store";

const VISIBLE_LIMIT = 6;

// 重大度→共通視覚言語トーン（柱0-0: 状態色は safety-tone 経由で統一）
const SEVERITY_TONE: Record<DailyAction["severity"], SafetyTone> = {
  overdue: "danger",
  alert: "warning",
  info: "neutral",
};

const ROW_BORDER: Record<DailyAction["severity"], string> = {
  overdue: `${SAFETY_TONE.danger.leftBar} bg-rose-50/60`,
  alert: `${SAFETY_TONE.warning.leftBar} bg-amber-50/40`,
  info: `${SAFETY_TONE.neutral.leftBar} bg-white`,
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

  // 1画面1メッセージ: 最も重い状態をデカ数字の結論カード1枚で示す（柱0-0）
  const tone = dominantTone({ danger: counts.overdue, warning: counts.alert });

  return (
    <section className="mt-2 rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
        <ListTodo className="h-4 w-4 text-slate-500" aria-hidden="true" />
        今日やること（期限切れ・要対応）
      </h2>

      {tone === "danger" ? (
        <ConclusionCard
          tone="danger"
          value={counts.overdue}
          unit="件"
          title="期限超過"
          className="mt-2"
        >
          {counts.alert > 0 && (
            <StatusBadge tone="warning" size="sm">
              ほかに要対応 {counts.alert}件
            </StatusBadge>
          )}
        </ConclusionCard>
      ) : tone === "warning" ? (
        <ConclusionCard tone="warning" value={counts.alert} unit="件" title="要対応" className="mt-2" />
      ) : (
        <ConclusionCard tone="safe" title="要対応なし" description="期限切れ・要対応の記録はありません。" className="mt-2" />
      )}

      {urgent.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {visibleUrgent.map((a) => (
            <li key={a.id}>
              <Link
                href={a.href}
                className={`flex items-start gap-2 rounded-lg border border-slate-200 border-l-4 px-3 py-2 transition hover:shadow-sm ${ROW_BORDER[a.severity]}`}
              >
                <span className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold ${SAFETY_TONE[SEVERITY_TONE[a.severity]].soft}`}>
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
          className="mt-2 min-h-[44px] w-full rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
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
                  className="inline-flex min-h-[44px] items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 transition hover:border-slate-300 hover:bg-white"
                >
                  {a.title}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/site-records/calendar"
                className="inline-flex min-h-[44px] items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-white"
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
