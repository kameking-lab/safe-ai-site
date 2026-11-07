import verification from "@/data/laws/current-revision-verification.json";
import primaryVerification from "@/data/laws/primary-current-verification.json";
import type { LawArticle } from "@/data/laws";

/** A recent fetch/hash alone does not prove that the captured revision is in force. */
export function verifiedCurrentRevisionDate(article: LawArticle, now: Date): string | null {
  if (article.sourceVersionKind === "historical") return null;
  const record = verification.records.find((entry) =>
    entry.lawId === article.sourceLawId &&
    entry.revisionId === article.sourceRevisionId &&
    entry.snapshotHash === article.sourceHash &&
    entry.status === "CurrentEnforced",
  );
  if (!record || article.verificationStatus !== "snapshot-hash-verified") return null;
  if (!Number.isFinite(Date.parse(record.checkedAt)) || !Number.isFinite(now.getTime())) return null;
  const checkedOn = new Date(Date.parse(record.checkedAt) + 9 * 3_600_000).toISOString().slice(0, 10);
  const target = new Date(now.getTime() + 9 * 3_600_000).toISOString().slice(0, 10);
  const ageDays = (Date.parse(target) - Date.parse(checkedOn)) / 86_400_000;
  return record.effectiveOn <= target && ageDays >= 0 && ageDays <= 31 ? checkedOn : null;
}

/** A publication-text comparison is distinct from an expert legal interpretation. */
export function verifiedCurrentPrimaryDate(article: LawArticle, now: Date): string | null {
  if (article.sourceVersionKind === "historical" || article.verificationStatus !== "primary-source-verified") return null;
  const record = primaryVerification.records.find((entry) =>
    entry.lawShort === article.lawShort && entry.articleNum === article.articleNum &&
    entry.sourceUrl === article.sourceUrl && entry.sourceHash === article.sourceHash &&
    entry.revisionId === (article.sourceRevisionId ?? null),
  );
  if (!record || !Number.isFinite(now.getTime()) || !Number.isFinite(Date.parse(record.checkedAt))) return null;
  const checkedOn = new Date(Date.parse(record.checkedAt) + 9 * 3_600_000).toISOString().slice(0, 10);
  const target = new Date(now.getTime() + 9 * 3_600_000).toISOString().slice(0, 10);
  const ageDays = (Date.parse(target) - Date.parse(checkedOn)) / 86_400_000;
  return ageDays >= 0 && ageDays <= 31 ? checkedOn : null;
}
