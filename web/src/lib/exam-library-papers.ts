import "server-only";
/**
 * 1回分の問題JSONをサーバー側で読み込む。
 * 全回の問題をクライアントへ同梱しないため、ページ単位で fs から読む。
 * パスはカタログに存在するIDだけから組み立て、任意パスを読まない。
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { EXAM_CATALOG, findExamEntry } from "@/lib/exam-library-catalog";
import {
  EXAM_ID_PATTERN,
  isScorableQuestion,
  parseExamPaper,
  type ExamQuestion,
} from "@/lib/exam-library-model";

// The native static build executes the same server module from mobile/.
const PAPERS_DIR = join(process.cwd(), process.env.ANZEN_NATIVE_BUILD === "true" ? "../web/src" : "src", "data", "exam-library", "papers");

const paperCache = new Map<string, readonly ExamQuestion[] | null>();

function paperFile(id: string): string | null {
  if (!EXAM_ID_PATTERN.test(id) || !findExamEntry(id)) return null;
  return join(PAPERS_DIR, `${id}.json`);
}

/** カタログ外ID・未取込・不正JSONは null。検証済み問題が0件の場合も null。 */
export function loadExamPaper(id: string): readonly ExamQuestion[] | null {
  if (paperCache.has(id)) return paperCache.get(id) ?? null;
  const file = paperFile(id);
  let questions: readonly ExamQuestion[] | null = null;
  if (file) {
    try {
      const raw = readFileSync(file, "utf8");
      const parsed = parseExamPaper(JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw), id);
      questions = parsed.length > 0 ? parsed : null;
    } catch {
      questions = null;
    }
  }
  // カタログ外IDはキャッシュしない（任意文字列でMapを肥大化させない）
  if (file) paperCache.set(id, questions);
  return questions;
}

export function hasExamPaper(id: string): boolean {
  const file = paperFile(id);
  return file !== null && existsSync(file);
}

export interface ExamPaperStats {
  questionCount: number;
  scoredCount: number;
}

export function getExamPaperStats(id: string): ExamPaperStats | null {
  const questions = loadExamPaper(id);
  if (!questions) return null;
  return {
    questionCount: questions.length,
    scoredCount: questions.filter(isScorableQuestion).length,
  };
}

/** 問題データを表示できる回だけ（sitemap・静的パラメータ用） */
export function listAvailableExamIds(): string[] {
  return EXAM_CATALOG.filter((entry) => hasExamPaper(entry.id) && loadExamPaper(entry.id) !== null)
    .map((entry) => entry.id);
}
