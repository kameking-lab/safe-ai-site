import type { RevisionImportRecord, RevisionImportSource } from "@/lib/revisions-ingest/types";

function asObject(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  return raw as Record<string, unknown>;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toSource(raw: unknown): RevisionImportSource | null {
  const source = asObject(raw);
  if (!source) {
    return null;
  }
  return {
    url: toStringOrNull(source.url),
    label: toStringOrNull(source.label),
    issuer: toStringOrNull(source.issuer),
  };
}

export function toImportRecord(raw: unknown): RevisionImportRecord | null {
  const item = asObject(raw);
  if (!item) {
    return null;
  }

  const id = toStringOrNull(item.id);
  const title = toStringOrNull(item.title);
  if (!id || !title) {
    return null;
  }

  return {
    id,
    title,
    publishedAt:
      toStringOrNull(item.publishedAt) ??
      toStringOrNull(item.published_at) ??
      null,
    revisionNumber:
      toStringOrNull(item.revisionNumber) ??
      toStringOrNull(item.revision_number) ??
      null,
    category: toStringOrNull(item.category),
    kind: toStringOrNull(item.kind),
    issuer: toStringOrNull(item.issuer),
    summary: toStringOrNull(item.summary),
    source: toSource(item.source),
  };
}

export function parseRevisionImportPayload(payload: unknown): RevisionImportRecord[] {
  const payloadObject = asObject(payload);
  const rawArray =
    Array.isArray(payload)
      ? payload
      : payloadObject && Array.isArray(payloadObject.records)
        ? payloadObject.records
        : payloadObject && Array.isArray(payloadObject.default)
          ? payloadObject.default
          : [];

  return rawArray
    .map((entry) => toImportRecord(entry))
    .filter((entry): entry is RevisionImportRecord => entry !== null);
}
