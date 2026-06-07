"use client";

/**
 * 月次安全衛生レポート: 現場の安全記録キット各ツールの当月分を横断集計し、
 * 1枚の月次報告（元請提出・社内報告・委員会資料）にまとめる。
 *
 * 各ツールの保存データ（localStorage）を入力として受け取り、当月（YYYY-MM）の
 * 実績を集計する純関数。データ取得（window依存）は呼び出し側（クライアント）で行う。
 */
import { countByType, openCount as nearMissOpenCount, type NearMissReport } from "./nearmiss-store";
import type { PatrolSummary } from "./patrol-store";
import type { InspectionSummary } from "./inspection-store";
import type { InductionSummary } from "./induction-store";
import type { CommitteeSummary } from "./committee-store";
import type { HeatLogSummary } from "@/lib/heat-illness/log-store";

export type MonthlyInputs = {
  patrol: PatrolSummary[];
  nearmiss: NearMissReport[];
  inspection: InspectionSummary[];
  induction: InductionSummary[];
  committee: CommitteeSummary[];
  heatlog: HeatLogSummary[];
};

export type MonthlyReport = {
  month: string; // YYYY-MM
  patrol: { count: number; findings: number; open: number };
  nearMiss: { count: number; open: number; topType: string | null };
  inspection: { count: number; unusable: number };
  induction: { count: number };
  committee: { held: boolean; count: number };
  heat: { days: number; maxWbgt: number | null };
  hasAny: boolean;
};

function inMonth(date: string | undefined, month: string): boolean {
  return typeof date === "string" && date.startsWith(month);
}

/** 当月(YYYY-MM)の各ツール実績を集計。純関数。 */
export function aggregateMonth(month: string, input: MonthlyInputs): MonthlyReport {
  const patrol = input.patrol.filter((s) => inMonth(s.date, month));
  const nearmiss = input.nearmiss.filter((r) => inMonth(r.date, month));
  const inspection = input.inspection.filter((s) => inMonth(s.date, month));
  const induction = input.induction.filter((s) => inMonth(s.date, month));
  const committee = input.committee.filter((s) => inMonth(s.date, month));
  const heatlog = input.heatlog.filter((s) => inMonth(s.date, month));

  const tally = countByType(nearmiss);
  const heatDays = new Set(heatlog.map((s) => s.date)).size;
  const heatMax = heatlog.reduce<number | null>(
    (mx, s) => (s.maxWbgt === null ? mx : mx === null ? s.maxWbgt : Math.max(mx, s.maxWbgt)),
    null,
  );

  return {
    month,
    patrol: {
      count: patrol.length,
      findings: patrol.reduce((n, s) => n + s.findingCount, 0),
      open: patrol.reduce((n, s) => n + s.openCount, 0),
    },
    nearMiss: {
      count: nearmiss.length,
      open: nearMissOpenCount(nearmiss),
      topType: tally.length ? tally[0]!.type : null,
    },
    inspection: {
      count: inspection.length,
      unusable: inspection.filter((s) => !s.usable).length,
    },
    induction: { count: induction.length },
    committee: { held: committee.length > 0, count: committee.length },
    heat: { days: heatDays, maxWbgt: heatMax },
    hasAny:
      patrol.length + nearmiss.length + inspection.length + induction.length + committee.length + heatlog.length > 0,
  };
}

/** 月の選択肢（当月から過去n月）を YYYY-MM で返す。日付は引数で受けて決定論的に。 */
export function recentMonths(fromYear: number, fromMonth1to12: number, n: number): string[] {
  const out: string[] = [];
  let y = fromYear;
  let m = fromMonth1to12;
  for (let i = 0; i < n; i++) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }
  return out;
}
