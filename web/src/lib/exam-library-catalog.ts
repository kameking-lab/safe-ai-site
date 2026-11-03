/**
 * 公表試験問題カタログ（サーバー側で参照する正本）。
 * データは web/src/data/exam-library/official-catalog.json。検証を通った回だけ扱う。
 */
import catalogJson from "@/data/exam-library/official-catalog.json";
import {
  EXAM_GROUPS,
  EXAM_LIBRARY_PATH,
  parseExamCatalog,
  type ExamCatalogEntry,
  type ExamGroupId,
} from "@/lib/exam-library-model";

export { EXAM_LIBRARY_PATH };

export const EXAM_CATALOG: readonly ExamCatalogEntry[] = parseExamCatalog(catalogJson);

const catalogById = new Map(EXAM_CATALOG.map((entry) => [entry.id, entry]));

export function findExamEntry(id: string): ExamCatalogEntry | undefined {
  return catalogById.get(id);
}

/** 試験区分の定義順 → 科目の初出順 → 日付の新しい順 */
export function sortExamEntries(
  entries: readonly ExamCatalogEntry[],
): ExamCatalogEntry[] {
  const groupOrder = new Map<ExamGroupId, number>(
    EXAM_GROUPS.map((group, index) => [group.id, index]),
  );
  const subjectOrder = new Map<string, number>();
  entries.forEach((entry) => {
    const key = `${entry.group}|${entry.subject}`;
    if (!subjectOrder.has(key)) subjectOrder.set(key, subjectOrder.size);
  });
  return [...entries].sort(
    (a, b) =>
      (groupOrder.get(a.group) ?? 0) - (groupOrder.get(b.group) ?? 0) ||
      (subjectOrder.get(`${a.group}|${a.subject}`) ?? 0) -
        (subjectOrder.get(`${b.group}|${b.subject}`) ?? 0) ||
      b.date.localeCompare(a.date),
  );
}

export function latestCheckedAt(entries: readonly ExamCatalogEntry[] = EXAM_CATALOG): string | undefined {
  return entries.reduce<string | undefined>(
    (latest, entry) => (!latest || entry.checkedAt > latest ? entry.checkedAt : latest),
    undefined,
  );
}
