import { NextRequest, NextResponse } from "next/server";
import { summaryMockByRevisionId } from "@/data/mock/summaries";
import type { SummaryApiResponse, SummaryApiRouteResponse } from "@/lib/types/api";

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

function resolveForceError(request: NextRequest) {
  return request.nextUrl.searchParams.get("forceError") ?? request.headers.get("x-force-error");
}

function errorResponse(
  status: number,
  message: string,
  code: "UNAVAILABLE" | "VALIDATION" | "NETWORK" | "NOT_FOUND",
  retryable = status >= 500
) {
  return NextResponse.json<SummaryApiRouteResponse>(
    {
      ok: false,
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
  const revisionId = request.nextUrl.searchParams.get("revisionId");
  const delayMs = parseDelay(request.nextUrl.searchParams.get("delayMs"), 650);
  const forceError = resolveForceError(request);

  if (forceError === "timeout") {
    await wait(6000);
    return errorResponse(504, "要約API応答がタイムアウトしました。", "NETWORK");
  }

  await wait(delayMs);

  if (forceError === "5xx") {
    return errorResponse(503, "要約APIが一時的に利用できません。", "UNAVAILABLE");
  }

  if (forceError === "validation") {
    return errorResponse(400, "要約APIの入力検証エラーです。", "VALIDATION", false);
  }

  if (!revisionId) {
    return errorResponse(400, "revisionId は必須です。", "VALIDATION", false);
  }

  const summary = summaryMockByRevisionId[revisionId];
  if (!summary) {
    return errorResponse(404, "要約データが見つかりませんでした。", "NOT_FOUND", false);
  }

  const payload: SummaryApiResponse = {
    revisionId,
    summary,
  };

  return NextResponse.json<SummaryApiRouteResponse>({
    ok: true,
    data: payload,
  });
}
