import type {
  RevisionImportMapper,
  RevisionImportRecord,
  RevisionImportSource,
} from "@/lib/revisions-ingest/types";

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

function mapDefaultRecord(raw: unknown): RevisionImportRecord | null {
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

function mapOfficialDbRecord(raw: unknown): RevisionImportRecord | null {
  const item = asObject(raw);
  if (!item) {
    return null;
  }

  const id = toStringOrNull(item.lawId) ?? toStringOrNull(item.id);
  const title = toStringOrNull(item.lawTitle) ?? toStringOrNull(item.title);
  if (!id || !title) {
    return null;
  }

  const sourceUrl = toStringOrNull(item.sourceUrl);
  const sourceLabel = toStringOrNull(item.sourceLabel);
  const sourceIssuer = toStringOrNull(item.sourceIssuer);

  return {
    id,
    title,
    publishedAt:
      toStringOrNull(item.promulgatedAt) ??
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
    source:
      sourceUrl || sourceLabel || sourceIssuer
        ? {
            url: sourceUrl,
            label: sourceLabel,
            issuer: sourceIssuer,
          }
        : toSource(item.source),
  };
}

export const defaultRevisionImportMapper: RevisionImportMapper = {
  sourceName: "default",
  mapRecord: mapDefaultRecord,
};

export const officialDbRevisionImportMapper: RevisionImportMapper = {
  sourceName: "official-db",
  mapRecord: mapOfficialDbRecord,
};

export const revisionImportMappers: Record<string, RevisionImportMapper> = {
  default: defaultRevisionImportMapper,
  "official-db": officialDbRevisionImportMapper,
};

export type ParseRevisionImportOptions = {
  mapper?: RevisionImportMapper;
  sourceFormat?: string;
};

export function resolveRevisionImportMapper(options: ParseRevisionImportOptions = {}): RevisionImportMapper {
  if (options.mapper) {
    return options.mapper;
  }
  if (options.sourceFormat && revisionImportMappers[options.sourceFormat]) {
    return revisionImportMappers[options.sourceFormat];
  }
  return defaultRevisionImportMapper;
}

export function parseRevisionImportPayload(
  payload: unknown,
  options: ParseRevisionImportOptions = {}
): RevisionImportRecord[] {
  const mapper = resolveRevisionImportMapper(options);
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
    .map((entry) => mapper.mapRecord(entry))
    .filter((entry): entry is RevisionImportRecord => entry !== null);
}
