/**
 * 健康診断スケジューラ・判定結果の結論（柱0・ビジュアルファースト）
 *
 * 結果ページ最上部に置く「いまの状態」1メッセージ。色の優先順位は
 * 期限超過（赤）→ 期限間近（黄）→ 記録のこり（青=入力の指示）→ 期限内（緑）。
 * 「未記録を緑にしない」: 前回実施日が入っていない健診を「問題なし」と
 * 見せるのは偽安心（ヒヤリ報告ゼロを緑にしないのと同じ思想）。
 *
 * 期限判定は health-checkup-timing.classifyCheckupTiming が単一ソース —
 * ここは件数から1メッセージへの集約のみ。
 */

import type { SafetyTone } from "@/lib/design/safety-tone";
import type { CheckupTimingStatus } from "@/lib/health-checkup-timing";

export type CheckupCounts = Record<CheckupTimingStatus, number>;

export interface CheckupConclusion {
  tone: SafetyTone;
  /** デカ数字（支配的な状態の件数） */
  value: number;
  unit: "件";
  /** 状態の短ラベル（体言止め) */
  title: string;
  description: string;
  /** 漏れチェック台帳（#tracker）への動線を出すか */
  showTrackerAction: boolean;
}

export function computeCheckupConclusion(
  counts: CheckupCounts,
  /** 該当した健診の総数（随時実施を含む） */
  requiredTotal: number,
): CheckupConclusion {
  if (requiredTotal === 0) {
    return {
      tone: "neutral",
      value: 0,
      unit: "件",
      title: "該当健診なし",
      description: "雇入日や作業条件の入力を確認してください。",
      showTrackerAction: false,
    };
  }
  const periodicTotal =
    counts.overdue + counts["due-soon"] + counts.unrecorded + counts.ok;
  if (periodicTotal === 0) {
    return {
      tone: "info",
      value: requiredTotal,
      unit: "件",
      title: "随時実施のみ",
      description:
        "月別の期限管理対象はなく、トリガー事象の発生時に実施する健診・面接指導のみ該当します。",
      showTrackerAction: false,
    };
  }
  if (counts.overdue > 0) {
    return {
      tone: "danger",
      value: counts.overdue,
      unit: "件",
      title: "期限超過",
      description: "法定期限を過ぎた健診があります。速やかに実施してください。",
      showTrackerAction: true,
    };
  }
  if (counts["due-soon"] > 0) {
    return {
      tone: "warning",
      value: counts["due-soon"],
      unit: "件",
      title: "期限間近",
      description: "次回期限が近い健診があります。手配を始めてください。",
      showTrackerAction: true,
    };
  }
  if (counts.unrecorded > 0) {
    return {
      tone: "info",
      value: counts.unrecorded,
      unit: "件",
      title: "記録のこり",
      description:
        "前回実施日を入れると期限超過・期限間近を自動で判定します。",
      showTrackerAction: true,
    };
  }
  return {
    tone: "safe",
    value: counts.ok,
    unit: "件",
    title: "期限内",
    description: "すべての定期健診が法定期限内です。",
    showTrackerAction: true,
  };
}
