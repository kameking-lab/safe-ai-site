"use client";

import { useCallback, useEffect, useState } from "react";
import { buildDailyActions, todayIso, type DailyAction } from "@/lib/site-records/daily-actions";
import { getAllPatrolRecords } from "@/lib/site-records/patrol-store";
import { getNearMissReports } from "@/lib/site-records/nearmiss-store";
import { getInspectionList } from "@/lib/site-records/inspection-store";
import { getCommitteeList } from "@/lib/site-records/committee-store";
import { selectSignageSiteSafety } from "@/lib/signage/site-safety";

// localStorage 読みは軽いので短周期でも負荷なし。別タブ保存は storage イベントで即時反映され、
// この間隔は同一タブ内での日付跨ぎ（期日超過への昇格）を拾う保険。
const RELOAD_INTERVAL_MS = 5 * 60 * 1000;
const VISIBLE_LIMIT = 4;

type PanelData = {
  /** この端末に現場記録がひとつでもあるか。無い端末ではパネル自体を出さない。 */
  hasRecords: boolean;
  actions: DailyAction[];
  overdueCount: number;
  alertCount: number;
};

/**
 * 「現場の安全状態」パネル: この端末（同一ブラウザ）の /site-records 記録キットに
 * 保存された 未是正指摘・要対策ヒヤリ・使用不可機械・委員会未開催 をサイネージに掲示する。
 * 気象・事故・法改正など外部情報のみだったサイネージに自現場のデータを結線する。
 * 健診（個人情報）とカレンダー（参考情報）は掲示しない（lib/signage/site-safety.ts）。
 */
export function SignageSiteSafety() {
  const [data, setData] = useState<PanelData | null>(null);

  const reload = useCallback(() => {
    const patrolRecords = getAllPatrolRecords();
    const nearMissReports = getNearMissReports();
    const inspections = getInspectionList();
    const committees = getCommitteeList();
    const hasRecords =
      patrolRecords.length + nearMissReports.length + inspections.length + committees.length > 0;
    const summary = selectSignageSiteSafety(
      buildDailyActions(
        { patrolRecords, nearMissReports, inspections, committees, checkupRecords: {} },
        todayIso(),
      ),
    );
    setData({ hasRecords, ...summary });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorageは描画後にのみ参照可（SSRハイドレーション差異回避）
    reload();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      reload();
    }, RELOAD_INTERVAL_MS);
    // 同一端末の別タブで記録が保存されたら即反映（storage は他タブ起点の変更でのみ発火）
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key.startsWith("safe-ai:")) reload();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", onStorage);
    };
  }, [reload]);

  // 記録のない端末（サイネージ専用機など）では場所を取らない
  if (!data || !data.hasRecords) return null;

  const allClear = data.actions.length === 0;
  const visible = data.actions.slice(0, VISIBLE_LIMIT);
  const hiddenCount = data.actions.length - visible.length;
  const hiddenSourceLabels = [
    ...new Set(data.actions.slice(VISIBLE_LIMIT).map((a) => a.sourceLabel)),
  ].join("・");
  const frameClass = data.overdueCount > 0
    ? "border-rose-500/70"
    : data.alertCount > 0
      ? "border-amber-500/60"
      : "border-emerald-600/40";

  return (
    <section
      className={`flex min-h-0 shrink-0 flex-col overflow-hidden rounded-xl border bg-slate-900/90 p-2 sm:rounded-2xl sm:p-3 xl:max-h-[30vh] ${frameClass}`}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <h2 className="text-xs font-bold tracking-wide text-slate-100 sm:text-sm lg:text-base">
          現場の安全状態
        </h2>
        {data.overdueCount > 0 && (
          <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[9px] font-bold text-white sm:text-[10px]">
            期限超過 {data.overdueCount}件
          </span>
        )}
        {data.alertCount > 0 && (
          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-bold text-white sm:text-[10px]">
            要対応 {data.alertCount}件
          </span>
        )}
        <a
          href="/site-records"
          target="_blank"
          rel="noreferrer"
          className="ml-auto rounded-lg border border-emerald-600/60 px-2 py-1 text-[9px] font-semibold text-emerald-300 hover:bg-emerald-950/50 sm:text-[10px]"
        >
          記録キット →
        </a>
      </div>

      {allClear ? (
        <p className="mt-1.5 rounded-lg border border-emerald-600/40 bg-emerald-950/50 px-2 py-1.5 text-[10px] font-semibold text-emerald-200 sm:text-xs">
          ✓ 未是正の指摘・要対策ヒヤリ・使用不可機械はありません
        </p>
      ) : (
        <ul className="mt-1.5 min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
          {visible.map((a) => (
            <li
              key={a.id}
              className={`rounded-lg border px-2 py-1.5 ${
                a.severity === "overdue"
                  ? "border-rose-500/60 bg-rose-950/60"
                  : "border-amber-500/40 bg-amber-950/40"
              }`}
            >
              <div className="flex items-start gap-1.5">
                <span
                  className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold sm:text-[9px] ${
                    a.severity === "overdue" ? "bg-rose-600 text-white" : "bg-amber-500 text-white"
                  }`}
                >
                  {a.sourceLabel}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold leading-snug text-slate-50 sm:text-xs lg:text-sm">
                    {a.hazardHigh && <span aria-hidden="true">⚠ </span>}
                    {a.title}
                  </p>
                  {(a.detail || a.due) && (
                    <p className="mt-0.5 text-[9px] leading-snug text-slate-300 sm:text-[10px]">
                      {a.detail}
                      {a.due && (
                        <span
                          className={
                            a.severity === "overdue" ? "font-bold text-rose-300" : undefined
                          }
                        >
                          {a.detail ? " ／ " : ""}期日 {a.due}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
          {hiddenCount > 0 && (
            <li className="text-[9px] font-semibold text-slate-400 sm:text-[10px]">
              {/* 非対話の常時掲示では隠れた項目は存在しないのと同じ。種別だけでも声に出せるようにする */}
              ほか {hiddenCount} 件（{hiddenSourceLabels}） — 記録キットで確認してください
            </li>
          )}
        </ul>
      )}

      <p className="mt-1 shrink-0 text-[8px] text-slate-500 sm:text-[9px]">
        この端末に保存された記録（パトロール・ヒヤリ・点検・委員会）から自動集計。別タブでの保存も即時反映。
      </p>
    </section>
  );
}
