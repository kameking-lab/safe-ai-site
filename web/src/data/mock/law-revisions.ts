import { egovLawRevisions } from "@/data/law-revisions/egov-revisions-loaded";
import type { LawRevisionCore } from "@/lib/types/domain";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 公開可能な法改正一覧の最小境界。
 *
 * 旧 `real-law-revisions*.ts` と sample payload には、改正番号と説明が一次資料に
 * 対応しないレコードが複数確認されたため公開統合しない。ここでは e-Gov 法令APIの
 * 構造データから生成され、法令ID・改正法令番号・日付を持つレコードだけを通す。
 * URLは現行法令ページであり、改正箇所を支持する個別改正文URLではないことをUIで明示する。
 */
export function isPublishableEgovRevision(
  revision: LawRevisionCore,
): boolean {
  if (!revision.id.startsWith("lr-egov-")) return false;
  if (!YMD.test(revision.publishedAt)) return false;
  if (!revision.revisionNumber?.trim()) return false;
  if (!revision.title.trim() || !revision.summary.trim()) return false;
  const sourceUrl = revision.source_url ?? revision.source?.url ?? "";
  try {
    const parsed = new URL(sourceUrl);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "laws.e-gov.go.jp" &&
      parsed.pathname.startsWith("/law/")
    );
  } catch {
    return false;
  }
}

export const lawRevisionCores: LawRevisionCore[] = egovLawRevisions
  .filter(isPublishableEgovRevision)
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

export function getLawRevisionById(revisionId: string) {
  return lawRevisionCores.find((revision) => revision.id === revisionId) ?? null;
}
