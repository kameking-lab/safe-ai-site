/**
 * 柱0: 新着ハブ(/whats-new)・法改正一覧(/laws)の「いまの状態」結論判定（純粋関数）。
 *
 * 色文法（safety-tone.ts の約束に従う）:
 *   黄 = 施行が近い改正がある（ユーザーが対応準備すべきことがある時だけ黄を使う）
 *   青 = 新着あり（情報・指示。危険ではない）
 *   緑 = 新着なし・施行間近なし（確認済み・安心してよい）
 *   赤 = 使わない（新着情報に「危険・停止」は存在しない。オオカミ少年化防止）
 *
 * 「施行間近」の基準は60日以内に統一（/whats-new と /laws で同じ言葉・同じ色）。
 */

import type { SafetyTone } from "@/lib/design/safety-tone";
import { isNewDateSince, isNewSince, type NewsHubItem } from "@/lib/news-hub-types";
import {
  getEnforcementStatus,
  daysUntilEnforcement,
  type EnforcementStatus,
} from "@/lib/law-revision-status";

/** 「施行間近」と扱う残日数（この日数以内なら黄=要準備） */
export const ENFORCEMENT_SOON_DAYS = 60;

export type NewsConclusion = {
  tone: SafetyTone;
  /** デカ数字 */
  value: number;
  unit: "件";
  /** 漢字短ラベル（体言止め） */
  title: string;
  /** 1行補足 */
  description: string;
  /** 最も施行が近い改正（黄のときのみ） */
  nearest: { title: string; daysLeft: number } | null;
};

/**
 * /whats-new の結論。
 * 優先順位: 施行間近の法改正（黄）> 新着あり（青）> 新着なし（緑）。
 */
export function computeWhatsNewConclusion(
  items: NewsHubItem[],
  lastVisit: string | null,
  now: Date = new Date(),
): NewsConclusion {
  const soon = items
    .filter(
      (i) =>
        i.category === "law-revision" &&
        i.enforcementDaysLeft != null &&
        i.enforcementDaysLeft <= ENFORCEMENT_SOON_DAYS,
    )
    .sort((a, b) => (a.enforcementDaysLeft ?? 0) - (b.enforcementDaysLeft ?? 0));
  if (soon.length > 0) {
    const top = soon[0];
    return {
      tone: "warning",
      value: soon.length,
      unit: "件",
      title: "施行間近",
      description: `最短: ${top.title}（あと${top.enforcementDaysLeft}日）`,
      nearest: { title: top.title, daysLeft: top.enforcementDaysLeft ?? 0 },
    };
  }
  const newCount = items.filter((i) => isNewSince(i, lastVisit, now)).length;
  if (newCount > 0) {
    return {
      tone: "info",
      value: newCount,
      unit: "件",
      title: "新着あり",
      description: lastVisit
        ? "前回ご覧になった以降の新着。緑の「新着」バッジが目印。"
        : "直近30日の新着。緑の「新着」バッジが目印。",
      nearest: null,
    };
  }
  return {
    tone: "safe",
    value: 0,
    unit: "件",
    title: "新着なし",
    description: "前回ご覧になった以降の新着はありません。",
    nearest: null,
  };
}

/** /laws の結論判定に必要な最小フィールド（lawRevisionCores の各要素が満たす） */
export type LawRevisionLike = {
  title: string;
  enforcement_date?: string;
  enforcement_status?: EnforcementStatus;
};

/**
 * /laws の結論。
 * 優先順位: 60日以内に施行（黄・要準備）> 施行待ちあり（青・情報）> 施行間近なし（緑）。
 */
export function computeLawsConclusion(
  revisions: LawRevisionLike[],
  now: Date = new Date(),
): NewsConclusion {
  const upcoming = revisions.filter((r) => getEnforcementStatus(r, now) === "upcoming");
  const soon = upcoming
    .map((r) => ({ r, daysLeft: daysUntilEnforcement(r.enforcement_date, now) }))
    .filter((x): x is { r: LawRevisionLike; daysLeft: number } => x.daysLeft != null && x.daysLeft <= ENFORCEMENT_SOON_DAYS)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  if (soon.length > 0) {
    const top = soon[0];
    return {
      tone: "warning",
      value: soon.length,
      unit: "件",
      title: "施行間近",
      description: `最短: ${top.r.title}（あと${top.daysLeft}日）`,
      nearest: { title: top.r.title, daysLeft: top.daysLeft },
    };
  }
  if (upcoming.length > 0) {
    return {
      tone: "info",
      value: upcoming.length,
      unit: "件",
      title: "施行待ち",
      description: `60日以内に施行される改正はありません（施行前の改正 ${upcoming.length}件）。`,
      nearest: null,
    };
  }
  return {
    tone: "safe",
    value: 0,
    unit: "件",
    title: "施行間近なし",
    description: "施行前の改正はありません。",
    nearest: null,
  };
}

/**
 * トップページの新着タイル用: 前回閲覧（/whats-new と同じ localStorage 基準）以降の新着件数。
 * lastVisit が無い初訪問は直近30日でカウント。
 */
export function countNewDates(
  dates: string[],
  lastVisit: string | null,
  now: Date = new Date(),
): number {
  return dates.filter((d) => isNewDateSince(d, lastVisit, now)).length;
}
