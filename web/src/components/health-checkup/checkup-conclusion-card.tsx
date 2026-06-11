"use client";

/**
 * 健診スケジューラ結果ページの結論カード（柱0・1画面1メッセージ）。
 * 期限超過（赤）→ 期限間近（黄）→ 記録のこり（青）→ 期限内（緑）を
 * デカ数字1つに集約し、漏れチェック台帳（#tracker）への動線を出す。
 * 台帳と同じ共有ストアを購読しているので、下の台帳で実施日を入れた瞬間に
 * この結論も切り替わる。画面専用（印刷には出さない）。
 */

import { useSyncExternalStore } from "react";
import { classifyCheckupTiming } from "@/lib/health-checkup-timing";
import {
  computeCheckupConclusion,
  type CheckupCounts,
} from "@/lib/health-checkup-conclusion";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { useCheckupRecords } from "./checkup-records-store";
import type { TrackerEntry } from "./missing-checkup-tracker";

interface Props {
  entries: TrackerEntry[];
  storageKey: string;
  /** 該当した健診の総数（随時実施を含む） */
  requiredTotal: number;
}

export function CheckupConclusionCard({
  entries,
  storageKey,
  requiredTotal,
}: Props) {
  const records = useCheckupRecords(storageKey);
  // 今日基準の判定はマウント後のみ（ハイドレーション差異回避・台帳と同じ作法）
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const now = mounted ? new Date() : null;

  const counts: CheckupCounts = {
    overdue: 0,
    "due-soon": 0,
    unrecorded: 0,
    ok: 0,
  };
  for (const e of entries) {
    if (e.eventDriven || e.intervalMonths <= 0) continue;
    const status = now
      ? classifyCheckupTiming(e.intervalMonths, records[e.ruleId] ?? "", now)
          .status
      : "unrecorded";
    counts[status] += 1;
  }

  const c = computeCheckupConclusion(counts, requiredTotal);
  return (
    <ConclusionCard
      tone={c.tone}
      value={c.value}
      unit={c.unit}
      title={c.title}
      description={c.description}
      action={
        c.showTrackerAction
          ? { href: "#tracker", label: "漏れチェック台帳へ" }
          : undefined
      }
      className="print:hidden"
    />
  );
}
