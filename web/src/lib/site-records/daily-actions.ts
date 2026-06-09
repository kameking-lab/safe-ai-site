"use client";

/**
 * 「今日やること／期限切れ」横断アクション集約。
 *
 * /site-records ハブのライブダッシュボードで、各記録ツールに分散している
 * 「要対応」（パトロール未是正・重大ヒヤリ未対策・使用不可機械・今月の委員会
 * 未開催・健診の期限超過/間近・カレンダーの今月予定）を1枚のリストに集約する。
 * 集約・並べ替えは既存の各ツールの純関数（collectOpenFindings /
 * classifyCheckupTiming 等）を再利用し、判定ロジックの二重実装を作らない。
 */

import {
  collectOpenFindings,
  SEVERITY_JA,
  type PatrolRecord,
} from "@/lib/site-records/patrol-store";
import type { NearMissReport } from "@/lib/site-records/nearmiss-store";
import type { InspectionSummary } from "@/lib/site-records/inspection-store";
import type { CommitteeSummary } from "@/lib/site-records/committee-store";
import { SAFETY_CALENDAR, type CalendarItem } from "@/lib/site-records/safety-calendar";
import { classifyCheckupTiming } from "@/lib/health-checkup-timing";
import { getRuleById } from "@/data/health-checkup-rules";

/** overdue=期限超過（赤） / alert=要対応（橙） / info=今月の予定（参考） */
export type DailyActionSeverity = "overdue" | "alert" | "info";

export type DailyActionSource =
  | "patrol"
  | "nearmiss"
  | "inspection"
  | "committee"
  | "checkup"
  | "calendar";

export type DailyAction = {
  id: string;
  source: DailyActionSource;
  /** 出どころの短いラベル（パトロール・ヒヤリ等）。 */
  sourceLabel: string;
  title: string;
  detail?: string;
  /** 期日 ISO（あれば）。 */
  due?: string;
  /** 危険度が高い（重大指摘・重大ヒヤリ）。同重大度内で期日より先に並べる。 */
  hazardHigh?: boolean;
  severity: DailyActionSeverity;
  href: string;
};

export type DailyActionsInput = {
  patrolRecords: PatrolRecord[];
  nearMissReports: NearMissReport[];
  inspections: InspectionSummary[];
  committees: CommitteeSummary[];
  /** 健診トラッカーの保存値（ruleId→前回実施日 ISO）をプロファイル横断でマージしたもの。 */
  checkupRecords: Record<string, string>;
};

const SOURCE_LABEL: Record<DailyActionSource, string> = {
  patrol: "パトロール",
  nearmiss: "ヒヤリハット",
  inspection: "点検",
  committee: "委員会",
  checkup: "健康診断",
  calendar: "カレンダー",
};

const SEVERITY_RANK: Record<DailyActionSeverity, number> = { overdue: 0, alert: 1, info: 2 };

/**
 * 健診トラッカー（/health-checkup-scheduler）の localStorage キー接頭辞。
 * scheduler-document.tsx がプロファイル毎に `${PREFIX}${profile…}` で保存している。
 */
export const HC_TRACKER_KEY_PREFIX = "safe-ai:hc-tracker:v1:";

/**
 * 複数プロファイルのトラッカー保存値をマージする。同じ ruleId が複数あれば
 * 最新の実施日を採用（より最近受けた記録があるなら期限はそちら基準が正しい）。純関数。
 */
export function mergeCheckupTrackerMaps(maps: Record<string, string>[]): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const map of maps) {
    for (const [ruleId, date] of Object.entries(map)) {
      if (typeof date !== "string" || !date) continue;
      const prev = merged[ruleId];
      if (!prev || prev < date) merged[ruleId] = date;
    }
  }
  return merged;
}

/** 全プロファイルの健診トラッカー保存値を localStorage から読む（SSRでは空）。 */
export function readCheckupTrackerMaps(): Record<string, string>[] {
  if (typeof window === "undefined") return [];
  const maps: Record<string, string>[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(HC_TRACKER_KEY_PREFIX)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        maps.push(parsed as Record<string, string>);
      }
    }
  } catch {
    /* 読めない端末では健診アラートなしで続行 */
  }
  return maps;
}

/** 今月のカレンダー項目（1〜12月以外は空）。純関数。 */
export function calendarItemsForMonth(month: number): CalendarItem[] {
  return SAFETY_CALENDAR.find((m) => m.month === month)?.items ?? [];
}

/** その日が属する月の末日 ISO。純関数（正午基準で日付ずれ回避）。 */
export function lastDayOfMonth(todayIso: string): string {
  const d = new Date(`${todayIso}T12:00:00`);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0, 12);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
}

/**
 * 各ツールの保存データから「今日やること」を集約する。純関数・非破壊。
 * 並びは 期限超過 → 要対応 → 今月の予定、同重大度内は期日昇順（期日なしは末尾）。
 */
export function buildDailyActions(input: DailyActionsInput, todayIso: string): DailyAction[] {
  const actions: DailyAction[] = [];
  const month = Number(todayIso.slice(5, 7));
  const ym = todayIso.slice(0, 7);

  // パトロール: 未是正の指摘（期日超過は最優先）。
  for (const f of collectOpenFindings(input.patrolRecords, todayIso)) {
    actions.push({
      id: `patrol-${f.recordId}-${f.id}`,
      source: "patrol",
      sourceLabel: SOURCE_LABEL.patrol,
      title: `指摘の是正: ${f.content || "（内容未記入）"}`,
      detail: [f.location, f.owner ? `担当: ${f.owner}` : "", SEVERITY_JA[f.severity]]
        .filter(Boolean)
        .join(" / "),
      due: f.due || undefined,
      hazardHigh: f.severity === "high",
      severity: f.overdue ? "overdue" : "alert",
      href: "/site-records/patrol",
    });
  }

  // ヒヤリハット: 重大×未対策は個別に、軽微×未対策はまとめて1行。
  const openHigh = input.nearMissReports.filter((r) => !r.resolved && r.potential === "high");
  for (const r of openHigh) {
    actions.push({
      id: `nearmiss-${r.id}`,
      source: "nearmiss",
      sourceLabel: SOURCE_LABEL.nearmiss,
      title: `重大ヒヤリの対策: ${r.situation || r.type}`,
      detail: [r.site, r.location].filter(Boolean).join(" / "),
      hazardHigh: true,
      severity: "alert",
      href: "/site-records/near-miss",
    });
  }
  const openLow = input.nearMissReports.filter((r) => !r.resolved && r.potential === "low").length;
  if (openLow > 0) {
    actions.push({
      id: "nearmiss-open-low",
      source: "nearmiss",
      sourceLabel: SOURCE_LABEL.nearmiss,
      title: `未対策のヒヤリハット（軽微） ${openLow}件の対策を検討`,
      severity: "alert",
      href: "/site-records/near-miss",
    });
  }

  // 点検: 使用不可の機械（修理・使用再開の確認まで放置しない）。
  for (const s of input.inspections.filter((i) => !i.usable)) {
    actions.push({
      id: `inspection-${s.id}`,
      source: "inspection",
      sourceLabel: SOURCE_LABEL.inspection,
      title: `使用不可の機械: ${s.equipName || "（機番未記入）"} の修理・再点検`,
      detail: [s.site, `点検日 ${s.date}`].filter(Boolean).join(" / "),
      severity: "alert",
      href: "/site-records/inspection",
    });
  }

  // 委員会: 議事録を使っている事業場でのみ「今月未開催」を出す（未使用の小規模現場に毎月ナグらない）。
  if (input.committees.length > 0 && !input.committees.some((c) => c.date.startsWith(ym))) {
    actions.push({
      id: "committee-this-month",
      source: "committee",
      sourceLabel: SOURCE_LABEL.committee,
      title: "今月の安全衛生委員会が未開催",
      detail: "毎月1回以上（安衛則23条）・今月末まで",
      due: lastDayOfMonth(todayIso),
      severity: "alert",
      href: "/site-records/committee",
    });
  }

  // 健診: トラッカーに入力済みの前回実施日から期限超過/間近のみ昇格。
  // 判定は scheduler と同じ classifyCheckupTiming に委譲（正午基準で日付ずれ回避）。
  const refDate = new Date(`${todayIso}T12:00:00`);
  for (const [ruleId, lastPerformed] of Object.entries(input.checkupRecords)) {
    const rule = getRuleById(ruleId);
    if (!rule || rule.frequency.eventDriven || rule.frequency.intervalMonths <= 0) continue;
    const timing = classifyCheckupTiming(rule.frequency.intervalMonths, lastPerformed, refDate);
    if (timing.status !== "overdue" && timing.status !== "due-soon") continue;
    actions.push({
      id: `checkup-${ruleId}`,
      source: "checkup",
      sourceLabel: SOURCE_LABEL.checkup,
      title:
        timing.status === "overdue"
          ? `健診の期限超過: ${rule.title}`
          : `健診の期限間近: ${rule.title}`,
      detail: `前回 ${lastPerformed} / 法定 ${rule.frequency.humanReadable}`,
      due: timing.nextDueDate ?? undefined,
      severity: timing.status === "overdue" ? "overdue" : "alert",
      href: "/health-checkup-scheduler",
    });
  }

  // カレンダー: 今月の予定（参考情報・最大3件）。
  for (const [i, item] of calendarItemsForMonth(month).slice(0, 3).entries()) {
    actions.push({
      id: `calendar-${month}-${i}`,
      source: "calendar",
      sourceLabel: SOURCE_LABEL.calendar,
      title: `今月: ${item.label}`,
      severity: "info",
      href: item.href ?? "/site-records/calendar",
    });
  }

  // 並び: 重大度 → 危険度高（重大指摘・重大ヒヤリ）→ 期日昇順（期日なしは末尾）。
  // 期日より危険度を先にするのは、墜落級のリスクが「軽微だが期日が近い」整理整頓の
  // 下に沈まないようにするため（安全の優先順位）。
  return actions.sort((a, b) => {
    if (SEVERITY_RANK[a.severity] !== SEVERITY_RANK[b.severity]) {
      return SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    }
    const ah = a.hazardHigh ? 0 : 1;
    const bh = b.hazardHigh ? 0 : 1;
    if (ah !== bh) return ah - bh;
    const ad = a.due || "9999-99-99";
    const bd = b.due || "9999-99-99";
    return ad < bd ? -1 : ad > bd ? 1 : 0;
  });
}

/** 期限超過の件数（バッジ表示用）。純関数。 */
export function countBySeverity(actions: DailyAction[]): Record<DailyActionSeverity, number> {
  const counts: Record<DailyActionSeverity, number> = { overdue: 0, alert: 0, info: 0 };
  for (const a of actions) counts[a.severity] += 1;
  return counts;
}
