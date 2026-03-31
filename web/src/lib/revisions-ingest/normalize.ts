import type { LawRevision, RevisionCategory, RevisionKind } from "@/lib/types/domain";
import type { RevisionImportRecord, RevisionImportSource } from "@/lib/revisions-ingest/types";

function normalizeCategory(input: string | null | undefined): RevisionCategory {
  if (input === "労働安全衛生法" || input === "省令" || input === "通達") {
    return input;
  }
  return "通達";
}

function normalizeKind(input: string | null | undefined): RevisionKind {
  if (input === "law" || input === "ordinance" || input === "notice" || input === "guideline") {
    return input;
  }
  return "notice";
}

function ensureDateString(input: string, fallback = "1970-01-01"): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }
  return fallback;
}

function normalizeSource(raw: RevisionImportSource | null | undefined) {
  const sourceLabel = raw?.label?.trim() || "参照元";
  const sourceUrl = raw?.url?.trim() || "";
  return { url: sourceUrl, label: sourceLabel };
}

function normalizeCategoryFromKind(kind: RevisionKind): RevisionCategory {
  if (kind === "law") {
    return "労働安全衛生法";
  }
  if (kind === "ordinance") {
    return "省令";
  }
  return "通達";
}

export function normalizeRevisionRecord(raw: RevisionImportRecord): LawRevision {
  const kind = normalizeKind(raw.kind);
  const category = raw.category
    ? normalizeCategory(raw.category)
    : normalizeCategoryFromKind(kind);
  const issuer = raw.issuer?.trim() || "発出元未設定";

  return {
    id: raw.id.trim(),
    title: raw.title.trim(),
    publishedAt: ensureDateString(raw.publishedAt),
    revisionNumber: raw.revisionNumber?.trim() || "未設定",
    category,
    kind,
    issuer,
    summary: (raw.summary || "").trim(),
    source: normalizeSource(raw.source),
  };
}

export function normalizeRevisionRecords(records: RevisionImportRecord[]): LawRevision[] {
  return records
    .filter((record) => record.id && record.title && record.publishedAt && record.summary)
    .map(normalizeRevisionRecord);
}
