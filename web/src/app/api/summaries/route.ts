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

export async function GET(request: NextRequest) {
  const revisionId = request.nextUrl.searchParams.get("revisionId");
  const delayMs = parseDelay(request.nextUrl.searchParams.get("delayMs"), 650);
  const forceError =
    request.nextUrl.searchParams.get("forceError") ?? request.headers.get("x-force-error");

  await wait(delayMs);

  if (forceError === "5xx") {
    return NextResponse.json<SummaryApiRouteResponse>(
      {
        ok: false,
        error: {
          code: "UNAVAILABLE",
          message: "要約APIが一時的に利用できません。",
          retryable: true,
        },
      },
      { status: 503 }
    );
  }

  if (!revisionId) {
    return NextResponse.json<SummaryApiRouteResponse>(
      {
        ok: false,
        error: {
          code: "VALIDATION",
          message: "revisionId は必須です。",
          retryable: false,
        },
      },
      { status: 400 }
    );
  }

  const summary = summaryMockByRevisionId[revisionId];
  if (!summary) {
    return NextResponse.json<SummaryApiRouteResponse>(
      {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "要約データが見つかりませんでした。",
          retryable: false,
        },
      },
      { status: 404 }
    );
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
