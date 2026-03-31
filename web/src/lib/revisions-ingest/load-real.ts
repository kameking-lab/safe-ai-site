import { normalizeRevisionRecords } from "@/lib/revisions-ingest/normalize";
import { parseRevisionImportPayload } from "@/lib/revisions-ingest/parse";
import type { ParseRevisionImportOptions } from "@/lib/revisions-ingest/parse";
import type { RevisionImportPayload } from "@/lib/revisions-ingest/types";
import type { LawRevision } from "@/lib/types/domain";

export type RealRevisionsLoaderConfig = {
  endpoint?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  payload?: unknown;
  sourceFormat?: string;
};

export type RealRevisionsLoadStatus = "ok" | "fallback";

export type RealRevisionsLoadReason =
  | "endpoint_missing"
  | "fetch_failed"
  | "invalid_payload"
  | "empty_records"
  | "normalized_empty";

export type RealRevisionsLoadMeta = {
  status: RealRevisionsLoadStatus;
  reason: RealRevisionsLoadReason | null;
  endpointUsed: boolean;
  recordCount: number;
  sourceFormat: string;
};

async function fetchJsonWithTimeout(
  fetchImpl: typeof fetch,
  endpoint: string,
  timeoutMs = 5000
): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(endpoint, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch revisions: status=${response.status}`);
    }
    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timeoutId);
  }
}

function resolvePayloadFromInline(payload: unknown): RevisionImportPayload | RevisionImportPayload["records"] | null {
  if (Array.isArray(payload)) {
    return payload as RevisionImportPayload["records"];
  }
  if (payload && typeof payload === "object" && "records" in payload) {
    return payload as RevisionImportPayload;
  }
  return null;
}

export function loadRealRevisionsFromPayload(payload: unknown, sourceFormat = "default"): LawRevision[] {
  const normalizedPayload = resolvePayloadFromInline(payload);
  if (!normalizedPayload) {
    return [];
  }
  const parsed = parseRevisionImportPayload(normalizedPayload, { sourceFormat });
  return normalizeRevisionRecords(parsed);
}

export async function loadRealRevisions(config: RealRevisionsLoaderConfig = {}): Promise<LawRevision[]> {
  const endpoint = config.endpoint ?? process.env.REVISIONS_REAL_SOURCE_URL ?? "";
  const fetchImpl = config.fetchImpl ?? fetch;
  const timeoutMs = config.timeoutMs ?? 5000;

  if (config.payload !== undefined) {
    return loadRealRevisionsFromPayload(config.payload, config.sourceFormat ?? "default");
  }

  if (!endpoint) {
    return [];
  }

  let payload: unknown = null;
  try {
    payload = await fetchJsonWithTimeout(fetchImpl, endpoint, timeoutMs);
  } catch {
    return [];
  }

  const parseOptions: ParseRevisionImportOptions = {
    sourceFormat: config.sourceFormat,
  };
  const parsed = parseRevisionImportPayload(payload, parseOptions);
  return normalizeRevisionRecords(parsed);
}

export async function loadRealRevisionsWithMeta(
  config: RealRevisionsLoaderConfig = {}
): Promise<{ revisions: LawRevision[]; meta: RealRevisionsLoadMeta }> {
  const endpoint = config.endpoint ?? process.env.REVISIONS_REAL_SOURCE_URL ?? "";
  const sourceFormat = config.sourceFormat ?? "default";

  if (config.payload !== undefined) {
    const parsed = parseRevisionImportPayload(config.payload, { sourceFormat });
    if (parsed.length === 0) {
      return {
        revisions: [],
        meta: {
          status: "fallback",
          reason: "invalid_payload",
          endpointUsed: false,
          recordCount: 0,
          sourceFormat,
        },
      };
    }
    const normalized = normalizeRevisionRecords(parsed);
    if (normalized.length === 0) {
      return {
        revisions: [],
        meta: {
          status: "fallback",
          reason: "normalized_empty",
          endpointUsed: false,
          recordCount: 0,
          sourceFormat,
        },
      };
    }
    return {
      revisions: normalized,
      meta: {
        status: "ok",
        reason: null,
        endpointUsed: false,
        recordCount: normalized.length,
        sourceFormat,
      },
    };
  }

  if (!endpoint) {
    return {
      revisions: [],
      meta: {
        status: "fallback",
        reason: "endpoint_missing",
        endpointUsed: false,
        recordCount: 0,
        sourceFormat,
      },
    };
  }

  let payload: unknown = null;
  try {
    const fetchImpl = config.fetchImpl ?? fetch;
    const timeoutMs = config.timeoutMs ?? 5000;
    payload = await fetchJsonWithTimeout(fetchImpl, endpoint, timeoutMs);
  } catch {
    return {
      revisions: [],
      meta: {
        status: "fallback",
        reason: "fetch_failed",
        endpointUsed: true,
        recordCount: 0,
        sourceFormat,
      },
    };
  }

  const parsed = parseRevisionImportPayload(payload, { sourceFormat });
  if (parsed.length === 0) {
    return {
      revisions: [],
      meta: {
        status: "fallback",
        reason: "empty_records",
        endpointUsed: true,
        recordCount: 0,
        sourceFormat,
      },
    };
  }

  const normalized = normalizeRevisionRecords(parsed);
  if (normalized.length === 0) {
    return {
      revisions: [],
      meta: {
        status: "fallback",
        reason: "normalized_empty",
        endpointUsed: true,
        recordCount: 0,
        sourceFormat,
      },
    };
  }

  return {
    revisions: normalized,
    meta: {
      status: "ok",
      reason: null,
      endpointUsed: true,
      recordCount: normalized.length,
      sourceFormat,
    },
  };
}
