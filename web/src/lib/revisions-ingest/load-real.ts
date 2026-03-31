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
  allowHosts?: string[];
};

export type RealRevisionsLoadStatus = "ok" | "fallback";

export type RealRevisionsLoadReason =
  | "endpoint_missing"
  | "endpoint_invalid"
  | "endpoint_not_allowed"
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
  endpointHost: string | null;
};

export type RevisionsEndpointValidationResult =
  | { ok: true; endpoint: string; host: string | null }
  | { ok: false; reason: "endpoint_missing" | "endpoint_invalid" | "endpoint_not_allowed"; host: string | null };

function parseAllowHosts(input?: string): string[] {
  if (!input) {
    return [];
  }
  return input
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
}

function normalizeHosts(input?: string[]): string[] {
  return (input ?? []).map((item) => item.trim().toLowerCase()).filter((item) => item.length > 0);
}

function isHostAllowed(host: string, allowedHosts: string[]) {
  if (allowedHosts.length === 0) {
    return false;
  }
  return allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export function validateRealSourceEndpoint(
  endpoint: string | undefined,
  allowHostsInput?: string[]
): RevisionsEndpointValidationResult {
  if (!endpoint) {
    return { ok: false, reason: "endpoint_missing", host: null };
  }
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    return { ok: false, reason: "endpoint_invalid", host: null };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, reason: "endpoint_invalid", host: parsed.hostname || null };
  }
  const allowedHosts = normalizeHosts(allowHostsInput);
  const host = parsed.hostname.toLowerCase();
  if (!isHostAllowed(host, allowedHosts)) {
    return { ok: false, reason: "endpoint_not_allowed", host };
  }
  return { ok: true, endpoint: parsed.toString(), host };
}

export function resolveRealSourceAllowHosts(configAllowHosts?: string[]): string[] {
  const envHosts = parseAllowHosts(process.env.REVISIONS_REAL_SOURCE_ALLOW_HOSTS);
  if (configAllowHosts && configAllowHosts.length > 0) {
    return normalizeHosts(configAllowHosts);
  }
  return envHosts;
}

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
  const allowHosts = resolveRealSourceAllowHosts(config.allowHosts);

  if (config.payload !== undefined) {
    return loadRealRevisionsFromPayload(config.payload, config.sourceFormat ?? "default");
  }

  const endpointValidation = validateRealSourceEndpoint(endpoint, allowHosts);
  if (!endpointValidation.ok) {
    return [];
  }

  let payload: unknown = null;
  try {
    payload = await fetchJsonWithTimeout(fetchImpl, endpointValidation.endpoint, timeoutMs);
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
  const allowHosts = resolveRealSourceAllowHosts(config.allowHosts);

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
          endpointHost: null,
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
          endpointHost: null,
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
        endpointHost: null,
      },
    };
  }

  const endpointValidation = validateRealSourceEndpoint(endpoint, allowHosts);
  if (!endpointValidation.ok) {
    return {
      revisions: [],
      meta: {
        status: "fallback",
        reason: endpointValidation.reason,
        endpointUsed: false,
        recordCount: 0,
        sourceFormat,
        endpointHost: endpointValidation.host,
      },
    };
  }

  let payload: unknown = null;
  try {
    const fetchImpl = config.fetchImpl ?? fetch;
    const timeoutMs = config.timeoutMs ?? 5000;
    payload = await fetchJsonWithTimeout(fetchImpl, endpointValidation.endpoint, timeoutMs);
  } catch {
    return {
      revisions: [],
      meta: {
        status: "fallback",
        reason: "fetch_failed",
        endpointUsed: true,
        recordCount: 0,
        sourceFormat,
        endpointHost: endpointValidation.host,
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
        endpointHost: endpointValidation.host,
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
        endpointHost: endpointValidation.host,
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
      endpointHost: endpointValidation.host,
    },
  };
}
