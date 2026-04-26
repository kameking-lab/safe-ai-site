import type { CertQuizQuestion, QuizDifficulty } from "./types";

/**
 * コンパクトな問題定義ヘルパー。タプルで定義することでファイル長を抑える。
 *
 * 使い方:
 *   q("h1-001", "問題文", ["選1","選2","選3","選4"], 0, "解説", "安衛法10", "基礎", "法令")
 */
export function q(
  id: string,
  question: string,
  choices: [string, string, string, string],
  correct: 0 | 1 | 2 | 3,
  explain: string,
  law: string,
  level: QuizDifficulty,
  topic: string,
): CertQuizQuestion {
  return { id, q: question, choices, correct, explain, law, level, topic };
}
