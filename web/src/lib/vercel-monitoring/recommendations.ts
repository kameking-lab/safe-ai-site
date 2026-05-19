import type { AlertLevel } from "./types";

/**
 * Maps the overall worst alert level to a concrete action list.
 * Wording matches the Phase C brief verbatim so the user can copy
 * recommendations into an issue or Slack without rewriting them.
 */
export function recommendedActions(level: AlertLevel): string[] {
  switch (level) {
    case "exceeded":
      return [
        "[skip ci] 厳格運用に即時切替: ドキュメント/データ更新コミットは全て [skip ci]",
        "PR数を1日3本以内に絞る（マージは1日2本以内）",
        "Pro plan継続をオーナーへ即時相談（請求期限まで日数を確認）",
        "ISR Writes/Edge Requests が原因なら revalidate=43200 (12h) へ引き上げ検討",
      ];
    case "critical":
      return [
        "[skip ci] 徹底: scheduled job 系コミットは全て [skip ci] 付与",
        "PR数を1日3本以内に絞る",
        "Pro plan継続検討（次サイクルでHobbyに戻すための条件を整理）",
      ];
    case "warn":
      return [
        "今週分のスケジュール更新 PR を [skip ci] へ寄せる",
        "ISR Writes の revalidate を 21600 → 43200 (12h) へ拡大検討",
        "並行Dispatch本数の上限を見直す",
      ];
    case "watch":
      return [
        "現状ペースで月末を着地できる見込み。引き続き [skip ci] 運用を継続",
      ];
    case "ok":
      return ["クォータに余裕あり。Hobby復帰可能水準。"];
    default:
      return ["データ取得不足のため判定保留。"];
  }
}
