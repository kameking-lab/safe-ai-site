import { normalizeRevisionRecords } from "@/lib/revisions-ingest/normalize";
import { parseRevisionImportPayload } from "@/lib/revisions-ingest/parse";
import type { RevisionImportPayload } from "@/lib/revisions-ingest/types";
import type { LawRevision } from "@/lib/types/domain";

export type RealRevisionsLoaderConfig = {
  endpoint?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  payload?: unknown;
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

export function loadRealRevisionsFromPayload(payload: unknown): LawRevision[] {
  const normalizedPayload = resolvePayloadFromInline(payload);
  if (!normalizedPayload) {
    return [];
  }
  const parsed = parseRevisionImportPayload(normalizedPayload);
  return normalizeRevisionRecords(parsed);
}

export async function loadRealRevisions(config: RealRevisionsLoaderConfig = {}): Promise<LawRevision[]> {
  const endpoint = config.endpoint ?? process.env.REVISIONS_REAL_SOURCE_URL ?? "";
  const fetchImpl = config.fetchImpl ?? fetch;
  const timeoutMs = config.timeoutMs ?? 5000;

  if (config.payload !== undefined) {
    return loadRealRevisionsFromPayload(config.payload);
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

  const parsed = parseRevisionImportPayload(payload);
  return normalizeRevisionRecords(parsed);
}
