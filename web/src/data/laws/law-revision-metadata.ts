import revisionSnapshot from "@/data/law-revisions/egov-revisions.json";
import type {
  LawAmendmentHistoryEntry,
  LawArticle,
} from "@/data/laws/law-types";

type RevisionRecord = {
  publishedAt?: unknown;
  revisionNumber?: unknown;
  publication_date?: unknown;
  enforcement_date?: unknown;
  enforcement_status?: unknown;
  source_url?: unknown;
};

type RevisionSnapshot = {
  revisions?: unknown;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const EGOV_LAW_URL = /^https:\/\/laws\.e-gov\.go\.jp\/law\/([0-9A-Z]{15})$/;
const REVISION_ID = /^(\d{8})_[0-9A-Z]{15}$/;

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function amendmentStatus(
  value: unknown,
): LawAmendmentHistoryEntry["status"] {
  return value === "enforced" ||
    value === "upcoming" ||
    value === "undetermined"
    ? value
    : undefined;
}

const revisionByLawId = new Map<string, RevisionRecord>();
const revisions = (revisionSnapshot as RevisionSnapshot).revisions;

if (Array.isArray(revisions)) {
  for (const candidate of revisions) {
    if (!candidate || typeof candidate !== "object") continue;
    const record = candidate as RevisionRecord;
    const sourceMatch =
      typeof record.source_url === "string"
        ? EGOV_LAW_URL.exec(record.source_url)
        : null;
    if (!sourceMatch || revisionByLawId.has(sourceMatch[1])) continue;
    revisionByLawId.set(sourceMatch[1], record);
  }
}

/**
 * Attach revision metadata only when the two committed e-Gov snapshots identify
 * the same law and effective revision. No date is derived from a law number or
 * revision identifier; a mismatch fails closed and leaves the fields undefined.
 */
export function withVerifiedRevisionMetadata(article: LawArticle): LawArticle {
  if (
    article.sourceKind !== "egov-fulltext-snapshot" ||
    article.verificationStatus !== "snapshot-hash-verified" ||
    article.sourceVersionKind === "historical" ||
    !article.sourceLawId ||
    !article.sourceRevisionId
  ) {
    return article;
  }

  const revisionIdMatch = REVISION_ID.exec(article.sourceRevisionId);
  const record = revisionByLawId.get(article.sourceLawId);
  if (!revisionIdMatch || !record) return article;

  const sourceUrl = record.source_url;
  const promulgatedOn = record.publication_date;
  const effectiveOn = record.enforcement_date;
  const amendmentLawNumber = record.revisionNumber;
  if (
    typeof sourceUrl !== "string" ||
    sourceUrl !== article.sourceUrl ||
    !isIsoDate(promulgatedOn) ||
    record.publishedAt !== promulgatedOn ||
    !isIsoDate(effectiveOn) ||
    revisionIdMatch[1] !== effectiveOn.replaceAll("-", "") ||
    typeof amendmentLawNumber !== "string" ||
    !amendmentLawNumber.trim()
  ) {
    return article;
  }

  const amendment: LawAmendmentHistoryEntry = {
    revisionId: article.sourceRevisionId,
    amendmentLawNumber,
    promulgatedOn,
    effectiveOn,
    status: amendmentStatus(record.enforcement_status),
    sourceUrl,
  };

  return {
    ...article,
    amendmentPromulgatedOn: promulgatedOn,
    amendmentHistory: [amendment],
  };
}
