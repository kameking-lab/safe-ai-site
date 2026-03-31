import sample from "@/lib/revisions-ingest/sample-revisions.json";
import { normalizeRevisionRecords } from "@/lib/revisions-ingest/normalize";
import type { RevisionImportRecord } from "@/lib/revisions-ingest/types";
import type { LawRevision } from "@/lib/types/domain";

function toImportRecord(raw: unknown): RevisionImportRecord | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const item = raw as Record<string, unknown>;
  const id = typeof item.id === "string" ? item.id : null;
  const title = typeof item.title === "string" ? item.title : null;
  const publishedAt =
    typeof item.publishedAt === "string"
      ? item.publishedAt
      : typeof item.published_at === "string"
        ? item.published_at
        : null;
  const summary = typeof item.summary === "string" ? item.summary : null;

  if (!id || !title || !publishedAt || !summary) {
    return null;
  }

  const sourceRaw =
    item.source && typeof item.source === "object" ? (item.source as Record<string, unknown>) : null;

  return {
    id,
    title,
    publishedAt,
    revisionNumber:
      typeof item.revisionNumber === "string"
        ? item.revisionNumber
        : typeof item.revision_number === "string"
          ? item.revision_number
          : null,
    category: typeof item.category === "string" ? item.category : null,
    kind: typeof item.kind === "string" ? item.kind : null,
    issuer: typeof item.issuer === "string" ? item.issuer : null,
    summary,
    source: sourceRaw
      ? {
          url: typeof sourceRaw.url === "string" ? sourceRaw.url : null,
          label: typeof sourceRaw.label === "string" ? sourceRaw.label : null,
        }
      : null,
  };
}

export function loadSampleRevisions(): LawRevision[] {
  const loaded = sample as unknown;
  const rawArray =
    Array.isArray(loaded)
      ? loaded
      : loaded &&
          typeof loaded === "object" &&
          "default" in loaded &&
          Array.isArray((loaded as { default?: unknown }).default)
        ? (loaded as { default: unknown[] }).default
        : [];

  const parsed = rawArray
    .map((entry) => toImportRecord(entry))
    .filter((entry): entry is RevisionImportRecord => entry !== null);

  return normalizeRevisionRecords(parsed);
}
