import { NextRequest, NextResponse } from "next/server";
import { lawRevisionCores } from "@/data/mock/law-revisions";
import { loadRealRevisionsFromPayload, loadSampleRevisions } from "@/lib/revisions-ingest";
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

  const ingestSource = request.nextUrl.searchParams.get("ingestSource");
  const realSourcePayload = request.nextUrl.searchParams.get("realSourcePayload");
  const revisions = resolveRevisions({ ingestSource, realSourcePayload });

  const body: RevisionListApiResponse = {
    revisions: revisions.map((revision) => ({
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
  return NextResponse.json(body);
}

function resolveRevisions(options: {
  ingestSource: string | null;
  realSourcePayload: string | null;
}): LawRevision[] {
  if (options.ingestSource === "real") {
    if (!options.realSourcePayload) {
      return lawRevisionCores;
    }
    try {
      const payload = JSON.parse(options.realSourcePayload);
      const loaded = loadRealRevisionsFromPayload(payload);
      if (loaded.length > 0) {
        return loaded;
      }
      return lawRevisionCores;
    } catch {
      return lawRevisionCores;
    }
  }

  if (options.ingestSource === "sample") {
    const sampleLoaded = loadSampleRevisions();
    if (sampleLoaded.length > 0) {
      return sampleLoaded;
    }
  }

  return lawRevisionCores;
}
