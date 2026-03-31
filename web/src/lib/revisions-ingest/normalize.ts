import type { LawRevision, RevisionCategory, RevisionKind } from "@/lib/types/domain";
import type { RevisionImportRecord, RevisionImportSource } from "@/lib/revisions-ingest/types";

function normalizeCategory(input: string | null | undefined): RevisionCategory {
  const trimmed = input?.trim();
  if (
    trimmed === "労働安全衛生法" ||
    trimmed === "省令" ||
    trimmed === "通達" ||
    trimmed === "告示" ||
    trimmed === "指針" ||
    trimmed === "ガイドライン"
  ) {
    return trimmed;
  }
  if (trimmed) {
    return trimmed;
  }
  return "通達";
}

function normalizeKind(input: string | null | undefined): RevisionKind {
  const trimmed = input?.trim();
  if (
    trimmed === "law" ||
    trimmed === "ordinance" ||
    trimmed === "notice" ||
    trimmed === "guideline" ||
    trimmed === "other"
  ) {
    return trimmed;
  }
  return "other";
}

function ensureDateString(input: string | null | undefined, fallback = "1970-01-01"): string {
  const value = input?.trim() ?? "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  return fallback;
}

function isLikelyHttpUrl(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeSource(raw: RevisionImportSource | null | undefined, issuer: string) {
  const sourceLabel = raw?.label?.trim() || raw?.issuer?.trim() || issuer || "参照元";
  const sourceUrl = raw?.url?.trim() || "";
  return {
    url: isLikelyHttpUrl(sourceUrl) ? sourceUrl : "",
    label: sourceLabel,
  };
}

function normalizeCategoryFromKind(kind: RevisionKind): RevisionCategory {
  if (kind === "law") {
    return "労働安全衛生法";
  }
  if (kind === "ordinance") {
    return "省令";
  }
  if (kind === "guideline") {
    return "ガイドライン";
  }
  return "通達";
}

function normalizeIssuer(rawIssuer: string | null | undefined, source: RevisionImportSource | null | undefined) {
  const issuer = rawIssuer?.trim();
  if (issuer) {
    return issuer;
  }
  const sourceIssuer = source?.issuer?.trim();
  if (sourceIssuer) {
    return sourceIssuer;
  }
  return "発出元未設定";
}

function normalizeRevisionNumber(
  rawRevisionNumber: string | null | undefined,
  kind: RevisionKind,
  publishedAt: string
) {
  const revisionNumber = rawRevisionNumber?.trim();
  if (revisionNumber) {
    return revisionNumber;
  }
  return `${publishedAt} ${kind} 未設定`;
}

export function normalizeRevisionRecord(raw: RevisionImportRecord): LawRevision {
  const kind = normalizeKind(raw.kind);
  const category = raw.category ? normalizeCategory(raw.category) : normalizeCategoryFromKind(kind);
  const publishedAt = ensureDateString(raw.publishedAt);
  const issuer = normalizeIssuer(raw.issuer, raw.source);
  const revisionNumber = normalizeRevisionNumber(raw.revisionNumber, kind, publishedAt);
  const title = raw.title.trim() || "名称未設定";
  const summary = (raw.summary || "").trim() || "概要未設定";

  return {
    id: raw.id.trim(),
    title,
    publishedAt,
    revisionNumber,
    category,
    kind,
    issuer,
    summary,
    source: normalizeSource(raw.source, issuer),
  };
}

export function normalizeRevisionRecords(records: RevisionImportRecord[]): LawRevision[] {
  return records
    .filter((record) => record.id && record.title)
    .map(normalizeRevisionRecord);
}
