import { NextRequest, NextResponse } from "next/server";
import { lawRevisionCores } from "@/data/mock/law-revisions";
import { loadRealRevisionsWithMeta } from "@/lib/revisions-ingest/load-real";
import { loadSampleRevisions } from "@/lib/revisions-ingest/load-sample";
import type { RevisionListApiResponse, ServiceErrorResponse } from "@/lib/types/api";
import type { LawRevision } from "@/lib/types/domain";

function parseDelay(value: string | null, fallbackMs: number): number {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallbackMs;
  }
  return parsed;
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function errorResponse(
  status: number,
  message: string,
  code: "UNAVAILABLE" | "VALIDATION" | "NETWORK",
  retryable = status >= 500
) {
  return NextResponse.json<ServiceErrorResponse>(
    {
      error: {
        code,
        message,
        retryable,
      },
    },
    { status }
  );
}

export async function GET(request: NextRequest) {
  const delayMs = parseDelay(request.nextUrl.searchParams.get("delayMs"), 0);
  const forceError =
    request.nextUrl.searchParams.get("forceError") ?? request.headers.get("x-force-error");

  if (forceError === "timeout") {
    await wait(5000);
    return errorResponse(504, "法改正一覧API応答がタイムアウトしました。", "NETWORK", true);
  }

  if (delayMs > 0) {
    await wait(delayMs);
  }

  if (forceError === "5xx") {
    return errorResponse(503, "法改正一覧APIが一時的に利用できません。", "UNAVAILABLE", true);
  }

  if (forceError === "validation") {
    return errorResponse(400, "法改正一覧APIの入力検証エラーです。", "VALIDATION", false);
  }

  const ingestSource = resolveIngestSource(request.nextUrl.searchParams.get("ingestSource"));
  const realSourcePayload = request.nextUrl.searchParams.get("realSourcePayload");
  const realSourceFormat =
    request.nextUrl.searchParams.get("realSourceFormat") ??
    process.env.REVISIONS_REAL_SOURCE_FORMAT ??
    "default";
  const realSourceUrl = request.nextUrl.searchParams.get("realSourceUrl") ?? process.env.REVISIONS_REAL_SOURCE_URL;
  const revisionsResult = await resolveRevisions({
    ingestSource,
    realSourcePayload,
    realSourceFormat,
    realSourceUrl,
  });

  const body: RevisionListApiResponse = {
    revisions: revisionsResult.revisions.map((revision) => ({
      id: revision.id,
      title: revision.title,
      publishedAt: revision.publishedAt,
      summary: revision.summary,
      kind: revision.kind,
      category: revision.category,
      revisionNumber: revision.revisionNumber,
      issuer: revision.issuer,
      source: revision.source,
    })),
  };
  const response = NextResponse.json(body);
  if (revisionsResult.source === "real") {
    response.headers.set("x-revisions-ingest-source", "real");
    response.headers.set("x-revisions-ingest-status", revisionsResult.meta.status);
    response.headers.set("x-revisions-ingest-record-count", String(revisionsResult.meta.recordCount));
    response.headers.set("x-revisions-ingest-source-format", revisionsResult.meta.sourceFormat);
    if (revisionsResult.meta.reason) {
      response.headers.set("x-revisions-ingest-fallback-reason", revisionsResult.meta.reason);
    }
  } else {
    response.headers.set("x-revisions-ingest-source", "sample");
  }
  return response;
}

async function resolveRevisions(options: {
  ingestSource: "sample" | "real";
  realSourcePayload: string | null;
  realSourceFormat: string;
  realSourceUrl?: string;
}): Promise<{
  revisions: LawRevision[];
  source: "sample" | "real";
  meta: {
    status: "ok" | "fallback";
    reason: string | null;
    recordCount: number;
    sourceFormat: string;
  };
}> {
  if (options.ingestSource === "real") {
    const payload = options.realSourcePayload ? safeJsonParse(options.realSourcePayload) : undefined;
    const loaded = await loadRealRevisionsWithMeta(
      payload !== undefined
        ? {
            payload,
            sourceFormat: options.realSourceFormat,
          }
        : {
            endpoint: options.realSourceUrl,
            sourceFormat: options.realSourceFormat,
          }
    );
    if (loaded.revisions.length > 0) {
      return {
        revisions: loaded.revisions,
        source: "real",
        meta: {
          status: loaded.meta.status,
          reason: loaded.meta.reason,
          recordCount: loaded.meta.recordCount,
          sourceFormat: loaded.meta.sourceFormat,
        },
      };
    }
    return {
      revisions: lawRevisionCores,
      source: "real",
      meta: {
        status: "fallback",
        reason: loaded.meta.reason,
        recordCount: lawRevisionCores.length,
        sourceFormat: loaded.meta.sourceFormat,
      },
    };
  }

  if (options.ingestSource === "sample") {
    const sampleLoaded = loadSampleRevisions();
    if (sampleLoaded.length > 0) {
      return {
        revisions: sampleLoaded,
        source: "sample",
        meta: {
          status: "ok",
          reason: null,
          recordCount: sampleLoaded.length,
          sourceFormat: "default",
        },
      };
    }
  }

  return {
    revisions: lawRevisionCores,
    source: "sample",
    meta: {
      status: "fallback",
      reason: "sample_fallback",
      recordCount: lawRevisionCores.length,
      sourceFormat: "default",
    },
  };
}

function safeJsonParse(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return undefined;
  }
}

function resolveIngestSource(value: string | null): "sample" | "real" {
  if (value === "real" || value === "sample") {
    return value;
  }
  return process.env.NEXT_PUBLIC_REVISIONS_INGEST_SOURCE === "real" ? "real" : "sample";
}
