/**
 * 資格試験別100問クイズ - データ型
 *
 * 既存の web/src/data/exam-questions/ は過去問ベース、
 * こちらはカリキュラム網羅型の curated 100問セット。
 */

export type QuizDifficulty = "基礎" | "標準" | "応用";

/** 1問の4択クイズ（コンパクト形式） */
export interface CertQuizQuestion {
  /** 問題ID（例: "h1-001"） */
  id: string;
  /** 問題文 */
  q: string;
  /** 4選択肢 */
  choices: [string, string, string, string];
  /** 正解インデックス（0..3） */
  correct: 0 | 1 | 2 | 3;
  /** 解説 */
  explain: string;
  /** 法令根拠（例: "安衛法10条", "安衛則36条"） */
  law?: string;
  /** 難易度 */
  level: QuizDifficulty;
  /** 出題分野（例: "法令", "労働衛生", "労働生理"） */
  topic: string;
}

/** 資格メタデータ */
export interface CertQuizMeta {
  id: string;
  /** 表示名 */
  name: string;
  /** 短縮名 */
  shortName: string;
  /** 説明文（受験者像など） */
  description: string;
  /** カラーアクセント（Tailwind class） */
  color: string;
  /** 主な出題範囲 */
  topics: readonly string[];
  /** 試験の難易度（参考） */
  difficulty: "入門" | "標準" | "難関" | "最難関";
}
