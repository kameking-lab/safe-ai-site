/**
 * 現在のタブで回答中のクイズだけを判定する純関数。
 * 端末やサーバーに学習履歴・時間・進捗を保存しない。
 */
/**
 * 受講中テーマのクイズ採点の結論（パネル下部の色帯ストリップ用）。
 * 回答のこり（青）→ 全問回答後: 全問正答（緑）/ 誤答N問（黄=解説確認→再挑戦）。
 */
export type QuizConclusion = {
  tone: "info" | "safe" | "warning";
  title: string;
  /** デカ数字（設問なしのときのみ null） */
  value: number | null;
  unit?: "問";
};

export function buildQuizConclusion(input: {
  total: number;
  answered: number;
  correct: number;
}): QuizConclusion {
  const { total, answered, correct } = input;
  if (total === 0) return { tone: "info", title: "設問なし", value: null };
  if (answered < total) {
    return { tone: "info", title: "回答のこり", value: total - answered, unit: "問" };
  }
  if (correct === total) {
    return { tone: "safe", title: "全問正答", value: total, unit: "問" };
  }
  return { tone: "warning", title: "誤答", value: total - correct, unit: "問" };
}
