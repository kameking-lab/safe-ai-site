/**
 * KY全面再設計 Phase 2: 数値プルダウンの選択肢生成（純粋関数）。
 *
 * 社長要件: 年・月・日・気温・可能性・重大性をプルダウンで選べるようにする。
 * UIから切り離した純粋関数として実装し、単体テスト可能にしている。
 */

export type NumberOption = { value: number; label: string };

/** 年の選択肢: 当年-2 〜 当年+5（基準日を渡せるようにしてテスト可能に） */
export function yearOptions(now: Date = new Date()): number[] {
  const y = now.getFullYear();
  const out: number[] = [];
  for (let i = y - 2; i <= y + 5; i += 1) out.push(i);
  return out;
}

/** 月の選択肢: 1〜12 */
export const MONTH_OPTIONS: readonly number[] = Object.freeze(
  Array.from({ length: 12 }, (_, i) => i + 1)
);

/** 指定年月の日数（うるう年対応）。月は1始まり。 */
export function daysInMonth(year: number, month: number): number {
  if (!Number.isFinite(year) || !Number.isFinite(month)) return 31;
  if (month < 1 || month > 12) return 31;
  // 翌月の0日 = 当月末日
  return new Date(year, month, 0).getDate();
}

/** 指定年月に応じた日の選択肢（28/29/30/31 を自動調整） */
export function dayOptions(year: number, month: number): number[] {
  const max = daysInMonth(year, month);
  return Array.from({ length: max }, (_, i) => i + 1);
}

/**
 * 気温の選択肢（℃）。屋外作業の現実的レンジ -15〜45。
 * 文字列で持つフィールド(temperature)へは String(value) で格納する。
 */
export function temperatureOptions(min = -15, max = 45): number[] {
  if (min > max) return [];
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

/** 可能性（発生のしやすさ）1〜3 */
export const LIKELIHOOD_OPTIONS: readonly NumberOption[] = Object.freeze([
  { value: 3, label: "3 高い（かなり起こる）" },
  { value: 2, label: "2 中（たまに起こる）" },
  { value: 1, label: "1 低い（ほとんどない）" },
]);

/** 重大性（けがの重さ）1〜3 */
export const SEVERITY_OPTIONS: readonly NumberOption[] = Object.freeze([
  { value: 3, label: "3 重大（死亡・後遺障害）" },
  { value: 2, label: "2 中（休業4日以上）" },
  { value: 1, label: "1 軽微（不休・軽傷）" },
]);

/** 評価値 = 可能性 × 重大性 */
export function evalScore(likelihood: number, severity: number): number {
  return likelihood * severity;
}

export type RiskGrade = { grade: "high" | "medium" | "low"; label: string };

/**
 * 評価値からリスクの大きさ区分を返す。
 * 既存UIの色しきい値（>=6 赤 / >=3 橙 / それ以下 灰）に合わせる。
 */
export function riskGrade(score: number): RiskGrade {
  if (score >= 6) return { grade: "high", label: "大（すぐ対策）" };
  if (score >= 3) return { grade: "medium", label: "中（対策を検討）" };
  return { grade: "low", label: "小（管理を継続）" };
}
