"use client";

/**
 * 前回実施日トラッカー（漏れ・期限超過の可視化）。
 *
 * 結果ページの「漏れ・期限超過の警告」を、ただ全件を「実施記録なし」と並べる
 * 静的リストから、安全衛生担当が前回実施日を入力 → 期限超過/間近/適正/未記録を
 * 即時に色分けする台帳に置き換える。入力はこの端末の localStorage に保存され、
 * 次回開いたときも残るので「健診漏れを防ぐ」リマインド台帳として使える。
 *
 * 判定ロジックは純関数 classifyCheckupTiming（テスト済）に委譲。今日基準の
 * 計算はマウント後のみ行い、SSR とのハイドレーション差異を避ける。
 */

import { useMemo, useSyncExternalStore } from "react";
import {
  CHECKUP_TIMING_LABELS,
  CHECKUP_TIMING_ORDER,
  type CheckupTimingStatus,
  classifyCheckupTiming,
} from "@/lib/health-checkup-timing";
import {
  clearCheckupRecords,
  useCheckupRecords,
  writeCheckupRecord,
} from "./checkup-records-store";

export interface TrackerEntry {
  ruleId: string;
  title: string;
  /** 表示用カテゴリ名（CHECKUP_TYPE_LABELS で解決済み）。 */
  typeLabel: string;
  /** 法定間隔（月）。0 = 随時実施。 */
  intervalMonths: number;
  /** 随時実施（イベント駆動）か。 */
  eventDriven: boolean;
  /** 実施頻度の人が読む説明。 */
  frequencyHuman: string;
}

interface Props {
  entries: TrackerEntry[];
  /** プロファイル毎に保存を分けるキー。 */
  storageKey: string;
}

function formatJaMonth(iso: string): string {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(iso);
  if (!m) return iso;
  return `${m[1]}年${Number(m[2])}月`;
}

const CHIP_CLASS: Record<CheckupTimingStatus, string> = {
  overdue: "bg-red-100 text-red-800 border-red-300",
  "due-soon": "bg-amber-100 text-amber-800 border-amber-300",
  unrecorded: "bg-slate-100 text-slate-600 border-slate-300",
  ok: "bg-emerald-100 text-emerald-800 border-emerald-300",
};

const ROW_CLASS: Record<CheckupTimingStatus, string> = {
  overdue: "border-red-300 bg-red-50",
  "due-soon": "border-amber-300 bg-amber-50",
  unrecorded: "border-slate-200 bg-white",
  ok: "border-emerald-200 bg-emerald-50",
};

export function MissingCheckupTracker({ entries, storageKey }: Props) {
  // ハイドレーション後だけ true。サーバー描画・初回クライアント描画では false
  // のままにし、localStorage 由来の値や今日基準の判定でのミスマッチを避ける。
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  // 保存済みの実施日。結論カードと同じ共有ストアを購読（同一タブ内で即時同期）。
  const records = useCheckupRecords(storageKey);

  // 随時実施は月別の期限管理になじまないため別枠で案内。
  const periodic = useMemo(
    () => entries.filter((e) => !e.eventDriven && e.intervalMonths > 0),
    [entries],
  );
  const onDemand = useMemo(
    () => entries.filter((e) => e.eventDriven || e.intervalMonths <= 0),
    [entries],
  );

  const update = (ruleId: string, value: string) => {
    writeCheckupRecord(storageKey, ruleId, value);
  };

  const clearAll = () => {
    clearCheckupRecords(storageKey);
  };

  // マウント前は今日依存の判定をしない（ハイドレーション差異回避）。
  const now = mounted ? new Date() : null;

  const rows = periodic
    .map((e) => {
      // マウント前はサーバー描画に合わせて常に空・未記録扱い。
      const last = mounted ? (records[e.ruleId] ?? "") : "";
      const timing = now
        ? classifyCheckupTiming(e.intervalMonths, last, now)
        : { status: "unrecorded" as CheckupTimingStatus, monthsSince: null, monthsUntilDue: null, nextDueDate: null };
      return { entry: e, last, timing };
    })
    .sort(
      (a, b) =>
        CHECKUP_TIMING_ORDER[a.timing.status] - CHECKUP_TIMING_ORDER[b.timing.status],
    );

  const counts = rows.reduce(
    (acc, r) => {
      acc[r.timing.status] += 1;
      return acc;
    },
    { overdue: 0, "due-soon": 0, unrecorded: 0, ok: 0 } as Record<CheckupTimingStatus, number>,
  );

  return (
    <div className="mt-3">
      <p className="text-sm text-slate-600">
        各健診の「前回実施日」を入れると、法定間隔に対して
        <span className="font-semibold text-red-700">期限超過</span>・
        <span className="font-semibold text-amber-700">期限間近</span>・
        <span className="font-semibold text-emerald-700">適正</span>
        を自動で色分けします。入力はこの端末にのみ保存され、次回開いたときも残ります（個人の健康情報は入力しないでください）。
      </p>

      {/* サマリーバッジ */}
      {mounted ? (
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          <span className={`rounded-full border px-3 py-1 ${CHIP_CLASS.overdue}`}>
            期限超過 {counts.overdue} 件
          </span>
          <span className={`rounded-full border px-3 py-1 ${CHIP_CLASS["due-soon"]}`}>
            期限間近 {counts["due-soon"]} 件
          </span>
          <span className={`rounded-full border px-3 py-1 ${CHIP_CLASS.unrecorded}`}>
            未記録 {counts.unrecorded} 件
          </span>
          <span className={`rounded-full border px-3 py-1 ${CHIP_CLASS.ok}`}>
            適正 {counts.ok} 件
          </span>
        </div>
      ) : null}

      <ul className="mt-4 space-y-2">
        {rows.map(({ entry, last, timing }) => (
          <li
            key={entry.ruleId}
            className={`rounded border p-3 ${mounted ? ROW_CLASS[timing.status] : "border-slate-200 bg-white"}`}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{entry.title}</p>
                <p className="text-xs text-slate-500">
                  {entry.typeLabel}・{entry.frequencyHuman}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {mounted ? (
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${CHIP_CLASS[timing.status]}`}
                  >
                    {CHECKUP_TIMING_LABELS[timing.status]}
                  </span>
                ) : null}
                <label className="flex shrink-0 items-center gap-1 text-xs text-slate-600 print:hidden">
                  <span className="whitespace-nowrap">前回実施日</span>
                  <input
                    type="date"
                    value={last}
                    onChange={(ev) => update(entry.ruleId, ev.target.value)}
                    className="rounded border border-slate-300 px-2 py-1 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    aria-label={`${entry.title} の前回実施日`}
                  />
                </label>
              </div>
            </div>
            {mounted ? (
              <p className="mt-2 text-xs">
                {timing.status === "unrecorded" ? (
                  <span className="text-slate-500">
                    前回実施日を入力すると次回期限を判定します。
                  </span>
                ) : timing.status === "overdue" ? (
                  <span className="font-semibold text-red-800">
                    法定期限（{timing.nextDueDate ? formatJaMonth(timing.nextDueDate) : "—"}）を
                    {timing.monthsUntilDue !== null ? `${Math.abs(timing.monthsUntilDue)}か月` : ""}
                    超過。速やかに実施してください。
                  </span>
                ) : timing.status === "due-soon" ? (
                  <span className="font-semibold text-amber-800">
                    次回期限は{timing.nextDueDate ? formatJaMonth(timing.nextDueDate) : "—"}（あと
                    {timing.monthsUntilDue ?? 0}か月）。手配を始めてください。
                  </span>
                ) : (
                  <span className="text-emerald-800">
                    次回期限の目安: {timing.nextDueDate ? formatJaMonth(timing.nextDueDate) : "—"}
                  </span>
                )}
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-500">前回実施日を入力すると期限を判定します。</p>
            )}
          </li>
        ))}
      </ul>

      {onDemand.length > 0 ? (
        <p className="mt-3 text-xs text-slate-500">
          ※ 長時間労働者の面接指導・海外派遣健診など随時実施の{onDemand.length}件は、月別の期限管理になじまないため上の「3.
          随時実施対象」を参照し、トリガー事象の発生時に実施してください。
        </p>
      ) : null}

      {rows.length > 0 ? (
        <div className="mt-3 print:hidden">
          <button
            type="button"
            onClick={clearAll}
            className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:border-slate-400 hover:bg-slate-50"
          >
            入力した実施日をすべて消去
          </button>
        </div>
      ) : null}
    </div>
  );
}
