"use client";

/**
 * サイネージ「現場の安全状態」パネルのデータ選別。
 *
 * /site-records の横断アクション（buildDailyActions）から、サイネージの
 * 大画面掲示に出すべきものだけを選ぶ。現場レベルの記録（パトロール・
 * ヒヤリハット・点検・委員会）に限定し、健診（個人の健康情報を全員が見る
 * 画面に掲示しない）とカレンダー（参考情報で要対応でない）は除外する。
 * 集計・並び順は buildDailyActions のものをそのまま使い二重実装しない。
 */

import type { DailyAction, DailyActionSource } from "@/lib/site-records/daily-actions";

/** サイネージに掲示する現場レベルの記録ソース。 */
export const SIGNAGE_SITE_SOURCES: ReadonlySet<DailyActionSource> = new Set([
  "patrol",
  "nearmiss",
  "inspection",
  "committee",
]);

export type SignageSiteSafetySummary = {
  /** 掲示対象の要対応アクション（buildDailyActions の並び順を維持）。 */
  actions: DailyAction[];
  overdueCount: number;
  alertCount: number;
};

/**
 * 横断アクションからサイネージ掲示分を選別する。純関数。
 * 現場レベルのソースのみ・info（参考情報）除外。
 */
export function selectSignageSiteSafety(allActions: DailyAction[]): SignageSiteSafetySummary {
  const actions = allActions.filter(
    (a) => SIGNAGE_SITE_SOURCES.has(a.source) && a.severity !== "info",
  );
  let overdueCount = 0;
  let alertCount = 0;
  for (const a of actions) {
    if (a.severity === "overdue") overdueCount += 1;
    else alertCount += 1;
  }
  return { actions, overdueCount, alertCount };
}
