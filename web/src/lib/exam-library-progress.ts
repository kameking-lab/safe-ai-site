/**
 * 公表試験問題プレーヤーの端末内進捗（任意・明示的なオプトイン時のみ）。
 *
 * - 保存先はこのブラウザの localStorage だけ。サーバーへ送信しない。
 * - 保存するのは選んだ番号と記述メモだけ。正誤は読込時に現在の問題データから再計算し、
 *   保存値を採点結果として信用しない。
 * - キーは "safe-ai:" 接頭辞＝設定画面の「端末データを全削除」対象（local-data-registry）。
 */
import {
  gradeExamAnswer,
  isScorableQuestion,
  isValidChoice,
  type ExamAnswerResult,
  type ExamQuestion,
} from "@/lib/exam-library-model";

export const EXAM_PROGRESS_STORAGE_PREFIX = "safe-ai:exam-library:v1:";
export const EXAM_PROGRESS_CHANGE_EVENT = "safe-ai:exam-library-progress";
export const EXAM_PROGRESS_MEMO_MAX_LENGTH = 4000;

export interface ExamSessionAnswer {
  /** 選んだ番号（記述式・選択肢なしは null） */
  choice: number | null;
  memo: string;
  /** 回答を確定した（記述式は「確認済み」にした）か */
  submitted: boolean;
}

export type ExamSessionAnswers = Record<string, ExamSessionAnswer>;

export interface ExamProgress {
  version: 1;
  examId: string;
  answers: ExamSessionAnswers;
  lastQuestionId: string | null;
  updatedAt: string;
}

export function examProgressKey(examId: string): string {
  return `${EXAM_PROGRESS_STORAGE_PREFIX}${examId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clampMemo(value: unknown): string {
  return typeof value === "string" ? value.slice(0, EXAM_PROGRESS_MEMO_MAX_LENGTH) : "";
}

/**
 * 保存文字列を検証して復元する。別の回・存在しない問題・範囲外の番号は捨てる。
 * 壊れたデータは null（呼び出し側は未保存として扱う）。
 */
export function parseExamProgress(
  raw: string | null,
  examId: string,
  questions: readonly ExamQuestion[],
): ExamProgress | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(value) || value.version !== 1 || value.examId !== examId) return null;
  if (!isRecord(value.answers)) return null;

  const byId = new Map(questions.map((question) => [question.id, question]));
  const answers: ExamSessionAnswers = {};
  for (const [questionId, stored] of Object.entries(value.answers)) {
    const question = byId.get(questionId);
    if (!question || !isRecord(stored)) continue;
    const choice = isValidChoice(question, stored.choice) ? stored.choice : null;
    const memo = clampMemo(stored.memo);
    // 選択式で番号が無効になった回答は、未回答へ戻す（誤った採点を表示しない）
    const submitted =
      stored.submitted === true && (question.choiceCount === 0 || choice !== null);
    if (choice === null && memo === "" && !submitted) continue;
    answers[questionId] = { choice, memo, submitted };
  }

  const lastQuestionId =
    typeof value.lastQuestionId === "string" && byId.has(value.lastQuestionId)
      ? value.lastQuestionId
      : null;
  const updatedAt =
    typeof value.updatedAt === "string" && !Number.isNaN(Date.parse(value.updatedAt))
      ? value.updatedAt
      : "";
  return { version: 1, examId, answers, lastQuestionId, updatedAt };
}

export function createExamProgress(
  examId: string,
  answers: ExamSessionAnswers,
  lastQuestionId: string | null,
  now: Date = new Date(),
): ExamProgress {
  const compact: ExamSessionAnswers = {};
  for (const [questionId, answer] of Object.entries(answers)) {
    const memo = clampMemo(answer.memo);
    if (answer.choice === null && memo === "" && !answer.submitted) continue;
    compact[questionId] = { choice: answer.choice, memo, submitted: answer.submitted };
  }
  return {
    version: 1,
    examId,
    answers: compact,
    lastQuestionId,
    updatedAt: now.toISOString(),
  };
}

/** localStorage へのアクセス自体が例外になる環境（制限付きiframe等）では null */
export function getBrowserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function notifyChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EXAM_PROGRESS_CHANGE_EVENT));
  }
}

/** 保存に成功したら true。容量超過・プライベートモード等は false（例外を投げない）。 */
export function saveExamProgress(storage: Storage, progress: ExamProgress): boolean {
  try {
    storage.setItem(examProgressKey(progress.examId), JSON.stringify(progress));
    notifyChange();
    return true;
  } catch {
    return false;
  }
}

export function readExamProgressRaw(storage: Storage, examId: string): string | null {
  try {
    return storage.getItem(examProgressKey(examId));
  } catch {
    return null;
  }
}

export function clearExamProgress(storage: Storage, examId: string): void {
  try {
    storage.removeItem(examProgressKey(examId));
  } catch {
    // 端末側で削除できない場合も画面の状態は破棄済み
  }
  notifyChange();
}

/** useSyncExternalStore 用。別タブの変更（storage）と同一タブの変更を購読する。 */
export function subscribeExamProgress(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(EXAM_PROGRESS_STORAGE_PREFIX)) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EXAM_PROGRESS_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EXAM_PROGRESS_CHANGE_EVENT, onChange);
  };
}

export function answerResult(
  question: ExamQuestion,
  answer: ExamSessionAnswer | undefined,
): ExamAnswerResult | "unanswered" {
  if (!answer?.submitted) return "unanswered";
  return gradeExamAnswer(question, answer.choice);
}

export interface ExamProgressSummary {
  total: number;
  answered: number;
  correct: number;
  incorrect: number;
  /** 回答済みだが採点しない問題（公式正答未登録・記述式） */
  unscored: number;
  /** 公式正答で採点できる問題数 */
  scorable: number;
}

export function summarizeExamProgress(
  questions: readonly ExamQuestion[],
  answers: ExamSessionAnswers,
): ExamProgressSummary {
  const summary: ExamProgressSummary = {
    total: questions.length,
    answered: 0,
    correct: 0,
    incorrect: 0,
    unscored: 0,
    scorable: 0,
  };
  for (const question of questions) {
    if (isScorableQuestion(question)) summary.scorable += 1;
    const result = answerResult(question, answers[question.id]);
    if (result === "unanswered") continue;
    summary.answered += 1;
    summary[result] += 1;
  }
  return summary;
}

/** 公式正答と異なる番号を選んだ問題だけ（出題順） */
export function wrongQuestionIds(
  questions: readonly ExamQuestion[],
  answers: ExamSessionAnswers,
): string[] {
  return questions
    .filter((question) => answerResult(question, answers[question.id]) === "incorrect")
    .map((question) => question.id);
}

/** 指定した問題の回答を未回答へ戻す（間違えた問題の解き直し用。メモは残す） */
export function resetAnswers(
  answers: ExamSessionAnswers,
  questionIds: readonly string[],
): ExamSessionAnswers {
  const next: ExamSessionAnswers = { ...answers };
  for (const questionId of questionIds) {
    const current = next[questionId];
    if (!current) continue;
    if (current.memo) next[questionId] = { choice: null, memo: current.memo, submitted: false };
    else delete next[questionId];
  }
  return next;
}
