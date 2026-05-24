/**
 * P0-014 (usability-audit-day3-2026-05-24):
 * Eラーニング 受講者進捗 localStorage 永続化。
 *
 * 既存の elearning-panel.tsx は answers を useState で持つだけで再訪時に
 * 全リセットされていた (法定教育エビデンスにならない致命的欠陥)。本モジュール
 * で進捗を端末内に永続化し、復習リコメンドと進捗ボード表示に使う。
 *
 * 設計:
 * - キー: `safe-ai:elearning-progress:v1`
 * - テーマごとに 1 record (themeId 単位で merge)
 * - 各 record に: 正答数 / 全問数 / 全問正答=true / 最終受講日時 / 誤答 questionId 配列
 * - 学習者本人の端末内のみ保持。サーバ送信なし (匿名性確保)
 * - SSR 中は touch しない (typeof window チェック必須)
 */

const STORAGE_KEY = "safe-ai:elearning-progress:v1";

export type ThemeProgress = {
  themeId: string;
  themeTitle: string;
  totalQuestions: number;
  correctCount: number;
  /** 100% 正答した受講回数 (リトライで増える) */
  completedCount: number;
  /** 最後に間違えた問題の question ID 一覧 (復習用) */
  wrongQuestionIds: string[];
  /** ISO 形式の最終受講日時 */
  lastAttemptedAt: string;
};

export type ProgressSummary = {
  totalThemes: number;
  completedThemes: number;
  inProgressThemes: number;
  totalCorrect: number;
  totalQuestions: number;
};

function safeRead(): Record<string, ThemeProgress> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, ThemeProgress> = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (
        value !== null &&
        typeof value === "object" &&
        "themeId" in value &&
        "totalQuestions" in value &&
        "correctCount" in value
      ) {
        out[id] = value as ThemeProgress;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function safeWrite(data: Record<string, ThemeProgress>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // quota exceeded / disabled — drop silently
  }
}

export function loadAllProgress(): Record<string, ThemeProgress> {
  return safeRead();
}

export function loadProgressList(): ThemeProgress[] {
  const all = safeRead();
  return Object.values(all).sort((a, b) =>
    b.lastAttemptedAt.localeCompare(a.lastAttemptedAt),
  );
}

export function recordThemeAttempt(input: {
  themeId: string;
  themeTitle: string;
  totalQuestions: number;
  correctCount: number;
  wrongQuestionIds: string[];
  attemptedAt?: string;
}): ThemeProgress {
  const all = safeRead();
  const prev = all[input.themeId];
  const attemptedAt = input.attemptedAt ?? new Date().toISOString();
  const isComplete =
    input.totalQuestions > 0 && input.correctCount === input.totalQuestions;
  const next: ThemeProgress = {
    themeId: input.themeId,
    themeTitle: input.themeTitle,
    totalQuestions: input.totalQuestions,
    correctCount: input.correctCount,
    completedCount: (prev?.completedCount ?? 0) + (isComplete ? 1 : 0),
    wrongQuestionIds: [...input.wrongQuestionIds],
    lastAttemptedAt: attemptedAt,
  };
  all[input.themeId] = next;
  safeWrite(all);
  return next;
}

export function buildProgressSummary(
  records: Iterable<ThemeProgress>,
): ProgressSummary {
  let totalThemes = 0;
  let completedThemes = 0;
  let inProgressThemes = 0;
  let totalCorrect = 0;
  let totalQuestions = 0;
  for (const r of records) {
    totalThemes += 1;
    if (r.correctCount === r.totalQuestions && r.totalQuestions > 0) {
      completedThemes += 1;
    } else if (r.correctCount > 0) {
      inProgressThemes += 1;
    }
    totalCorrect += r.correctCount;
    totalQuestions += r.totalQuestions;
  }
  return {
    totalThemes,
    completedThemes,
    inProgressThemes,
    totalCorrect,
    totalQuestions,
  };
}

export function clearAllProgress() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
