/**
 * 公表試験問題ライブラリの型・検証・採点（純粋関数のみ）。
 *
 * クライアントの問題プレーヤーからも使うため、カタログJSONやfsをimportしない。
 * 正答は answerAuthority=official かつ正答番号が選択肢範囲内の場合だけ採点する。
 * それ以外は「採点しない」を返し、推測した正答で判定しない（fail-closed）。
 */

export const EXAM_GROUP_IDS = ["lckohyo", "emkohyo", "cskohyo"] as const;
export type ExamGroupId = (typeof EXAM_GROUP_IDS)[number];

export type ExamDateKind = "publication" | "exam";
export type ExamAnswerMode = "official-choice" | "reference";
export type ExamAnswerAuthority = "official" | "unconfirmed" | "descriptive";
export type ExamAnswerResult = "correct" | "incorrect" | "unscored";

export interface ExamNoteLink {
  title: string;
  url: string;
}

export interface ExamCatalogEntry {
  id: string;
  group: ExamGroupId;
  subject: string;
  label: string;
  /** YYYY-MM（publication）または YYYY-MM-DD（exam） */
  date: string;
  dateKind: ExamDateKind;
  pdfUrl: string;
  indexUrl: string;
  answerMode: ExamAnswerMode;
  checkedAt: string;
  questionCount?: number;
  scoredCount?: number;
  /** 実在する関連解説記事（提供された場合のみ表示） */
  noteLinks?: ExamNoteLink[];
}

export interface ExamQuestion {
  id: string;
  number: number;
  /** 画像の代替テキスト・検索用。表示の正本は images */
  text: string;
  images: string[];
  correctChoice: number | null;
  choiceCount: number;
  answerAuthority: ExamAnswerAuthority;
  explanation?: string;
  sourcePages?: number[];
}

export interface ExamGroupInfo {
  id: ExamGroupId;
  title: string;
  shortTitle: string;
  description: string;
  dateNote: string;
}

export const EXAM_GROUPS: readonly ExamGroupInfo[] = [
  {
    id: "lckohyo",
    title: "免許試験の公表問題",
    shortTitle: "免許試験",
    description:
      "ボイラー技士、クレーン・デリック運転士、衛生管理者、潜水士などの免許試験。",
    dateNote: "日付は公表（掲載）時期です。試験の実施日ではありません。",
  },
  {
    id: "emkohyo",
    title: "作業環境測定士試験の公表問題",
    shortTitle: "作業環境測定士",
    description: "共通科目と選択科目（有機溶剤、鉱物性粉じん、特定化学物質など）。",
    dateNote: "日付は試験の実施日です。",
  },
  {
    id: "cskohyo",
    title: "労働安全・労働衛生コンサルタント試験の公表問題",
    shortTitle: "労働安全・衛生コンサルタント",
    description:
      "筆記試験の択一式・記述式科目（産業安全一般、労働衛生一般、機械安全など）。",
    dateNote: "日付は筆記試験の実施日です。",
  },
];

export function findExamGroup(id: string): ExamGroupInfo | undefined {
  return EXAM_GROUPS.find((group) => group.id === id);
}

export const EXAM_ID_PATTERN = /^(?:lckohyo|emkohyo|cskohyo)-[A-Za-z0-9][A-Za-z0-9-]{0,63}$/u;
const MONTH_PATTERN = /^(\d{4})-(\d{2})$/u;
const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u;
const OFFICIAL_ORIGIN = "https://www.exam.or.jp/";
const MAX_CHOICES = 9;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isValidMonthOrDay(value: string, kind: ExamDateKind): boolean {
  const match = kind === "publication" ? MONTH_PATTERN.exec(value) : DAY_PATTERN.exec(value);
  if (!match) return false;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return false;
  if (kind === "exam") {
    const day = Number(match[3]);
    const date = new Date(Date.UTC(Number(match[1]), month - 1, day));
    return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }
  return true;
}

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function parseNoteLinks(value: unknown): ExamNoteLink[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const links = value.flatMap((item): ExamNoteLink[] =>
    isRecord(item) && nonEmptyString(item.title) && isHttpsUrl(item.url)
      ? [{ title: item.title.trim(), url: item.url }]
      : [],
  );
  return links.length > 0 ? links : undefined;
}

/** カタログ1件を検証する。契約外の値は null（表示しない）。 */
export function parseExamCatalogEntry(value: unknown): ExamCatalogEntry | null {
  if (!isRecord(value)) return null;
  const { id, group, subject, label, date, dateKind, pdfUrl, indexUrl, answerMode, checkedAt } =
    value;
  if (typeof id !== "string" || !EXAM_ID_PATTERN.test(id)) return null;
  if (typeof group !== "string" || !(EXAM_GROUP_IDS as readonly string[]).includes(group)) {
    return null;
  }
  if (!id.startsWith(`${group}-`)) return null;
  if (!nonEmptyString(subject) || !nonEmptyString(label)) return null;
  if (dateKind !== "publication" && dateKind !== "exam") return null;
  // 免許試験（lckohyo）の日付は公表時期。実施日として扱わない。
  if (group === "lckohyo" && dateKind !== "publication") return null;
  if (typeof date !== "string" || !isValidMonthOrDay(date, dateKind)) return null;
  if (typeof pdfUrl !== "string" || !pdfUrl.startsWith(OFFICIAL_ORIGIN)) return null;
  if (typeof indexUrl !== "string" || !indexUrl.startsWith(OFFICIAL_ORIGIN)) return null;
  if (answerMode !== "official-choice" && answerMode !== "reference") return null;
  if (typeof checkedAt !== "string" || !isValidMonthOrDay(checkedAt, "exam")) return null;

  const entry: ExamCatalogEntry = {
    id,
    group: group as ExamGroupId,
    subject: subject.trim(),
    label: label.trim(),
    date,
    dateKind,
    pdfUrl,
    indexUrl,
    answerMode,
    checkedAt,
  };
  if (isNonNegativeInteger(value.questionCount)) entry.questionCount = value.questionCount;
  if (isNonNegativeInteger(value.scoredCount)) entry.scoredCount = value.scoredCount;
  const noteLinks = parseNoteLinks(value.noteLinks);
  if (noteLinks) entry.noteLinks = noteLinks;
  return entry;
}

export function parseExamCatalog(value: unknown): ExamCatalogEntry[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const entries: ExamCatalogEntry[] = [];
  for (const item of value) {
    const entry = parseExamCatalogEntry(item);
    if (!entry || seen.has(entry.id)) continue;
    seen.add(entry.id);
    entries.push(entry);
  }
  return entries;
}

function isSafeImagePath(value: unknown, examId: string): value is string {
  return (
    typeof value === "string" &&
    value.startsWith(`/exam-library/${examId}/`) &&
    !value.includes("..") &&
    !value.includes("\\") &&
    /\.(?:webp|png|jpe?g|avif)$/iu.test(value)
  );
}

/**
 * 問題1件を検証する。正答の根拠がない値は採点対象から外す（正答を作らない）。
 */
export function parseExamQuestion(value: unknown, examId: string): ExamQuestion | null {
  if (!isRecord(value)) return null;
  const { id, number, text, images, choiceCount, answerAuthority } = value;
  if (typeof id !== "string" || !id.startsWith(`${examId}-`)) return null;
  if (typeof number !== "number" || !Number.isInteger(number) || number < 1) return null;
  if (typeof text !== "string") return null;
  if (!Array.isArray(images) || images.length === 0) return null;
  if (!images.every((image) => isSafeImagePath(image, examId))) return null;
  if (!isNonNegativeInteger(choiceCount) || choiceCount > MAX_CHOICES) return null;
  if (
    answerAuthority !== "official" &&
    answerAuthority !== "unconfirmed" &&
    answerAuthority !== "descriptive"
  ) {
    return null;
  }

  const rawCorrect = value.correctChoice;
  const correctInRange =
    typeof rawCorrect === "number" &&
    Number.isInteger(rawCorrect) &&
    rawCorrect >= 1 &&
    rawCorrect <= choiceCount;
  const authority: ExamAnswerAuthority =
    answerAuthority === "official" && !correctInRange ? "unconfirmed" : answerAuthority;

  const question: ExamQuestion = {
    id,
    number,
    text,
    images: [...images],
    correctChoice: authority === "official" && correctInRange ? rawCorrect : null,
    choiceCount: authority === "descriptive" ? 0 : choiceCount,
    answerAuthority: authority,
  };
  if (nonEmptyString(value.explanation)) question.explanation = value.explanation.trim();
  if (Array.isArray(value.sourcePages)) {
    const pages = value.sourcePages.filter(
      (page): page is number => typeof page === "number" && Number.isInteger(page) && page > 0,
    );
    if (pages.length > 0) question.sourcePages = pages;
  }
  return question;
}

export function parseExamPaper(value: unknown, examId: string): ExamQuestion[] {
  if (!Array.isArray(value) || !EXAM_ID_PATTERN.test(examId)) return [];
  const seen = new Set<string>();
  const questions: ExamQuestion[] = [];
  for (const item of value) {
    const question = parseExamQuestion(item, examId);
    if (!question || seen.has(question.id)) continue;
    seen.add(question.id);
    questions.push(question);
  }
  return questions.sort((a, b) => a.number - b.number);
}

export function isScorableQuestion(question: ExamQuestion): boolean {
  return (
    question.answerAuthority === "official" &&
    question.correctChoice !== null &&
    question.correctChoice >= 1 &&
    question.correctChoice <= question.choiceCount
  );
}

/** 公式正答が登録済みの問題だけ正誤を返す。その他は必ず unscored。 */
export function gradeExamAnswer(
  question: ExamQuestion,
  choice: number | null,
): ExamAnswerResult {
  if (!isScorableQuestion(question) || choice === null) return "unscored";
  return choice === question.correctChoice ? "correct" : "incorrect";
}

export function isValidChoice(question: ExamQuestion, choice: unknown): choice is number {
  return (
    typeof choice === "number" &&
    Number.isInteger(choice) &&
    choice >= 1 &&
    choice <= question.choiceCount
  );
}

/** "2026-04" → "2026年4月"、"2026-08-19" → "2026年8月19日" */
export function formatExamDate(date: string): string {
  const day = DAY_PATTERN.exec(date);
  if (day) return `${day[1]}年${Number(day[2])}月${Number(day[3])}日`;
  const month = MONTH_PATTERN.exec(date);
  if (month) return `${month[1]}年${Number(month[2])}月`;
  return date;
}

/** 日付の意味（公表時期か実施日か）を必ず含めた表記 */
export function describeExamDate(entry: Pick<ExamCatalogEntry, "date" | "dateKind">): string {
  const formatted = formatExamDate(entry.date);
  return entry.dateKind === "publication" ? `${formatted}公表` : `${formatted}実施`;
}

export const EXAM_LIBRARY_PATH = "/e-learning/exams";

export function examPath(id: string): string {
  return `${EXAM_LIBRARY_PATH}/${id}`;
}

export function officialPdfPageUrl(pdfUrl: string, page: number | undefined): string {
  return page ? `${pdfUrl}#page=${page}` : pdfUrl;
}
