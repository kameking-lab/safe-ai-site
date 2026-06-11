import type { ThemeProgress } from "./progress";

/**
 * Eラーニングの結論ファースト判定（柱0・脱テキスト）。
 *
 * 画面最上部の結論カード用に「いまの状態」を1メッセージに絞る純関数。
 * 色文法: このページに停止級の状態は無いため赤は使わない。
 *   - 学習のこり（未完了テーマあり）= 青（指示: 続きをやる）
 *   - 全問正答（全テーマ完了）     = 緑
 *   - 履歴なし                     = 青（指示: 入門から始める）
 * クイズ採点中の誤答のみ「黄=要対応（解説を確認して再挑戦）」を許可する。
 */

/** 入門コースの最初のテーマID（elearning-intro-course.ts の先頭ステップ） */
export const INTRO_FIRST_THEME_ID = "intro-step1";

export type LearningConclusion =
  | { kind: "start"; tone: "info"; title: "入門から開始"; actionThemeId: string }
  | {
      kind: "resume";
      tone: "info";
      title: "学習のこり";
      /** 未完了（全問正答に達していない）テーマ数 */
      remaining: number;
      /** 最後に受講した未完了テーマ（「続きから」の行き先） */
      actionThemeId: string;
    }
  | { kind: "complete"; tone: "safe"; title: "全問正答"; completed: number };

function isIncomplete(r: ThemeProgress): boolean {
  return r.totalQuestions === 0 || r.correctCount < r.totalQuestions;
}

export function buildLearningConclusion(
  records: ThemeProgress[],
): LearningConclusion {
  if (records.length === 0) {
    return {
      kind: "start",
      tone: "info",
      title: "入門から開始",
      actionThemeId: INTRO_FIRST_THEME_ID,
    };
  }
  const incomplete = records.filter(isIncomplete);
  if (incomplete.length > 0) {
    const latest = [...incomplete].sort((a, b) =>
      b.lastAttemptedAt.localeCompare(a.lastAttemptedAt),
    )[0];
    return {
      kind: "resume",
      tone: "info",
      title: "学習のこり",
      remaining: incomplete.length,
      actionThemeId: latest.themeId,
    };
  }
  return {
    kind: "complete",
    tone: "safe",
    title: "全問正答",
    completed: records.length,
  };
}

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
