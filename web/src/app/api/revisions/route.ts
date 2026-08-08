import { NextRequest, NextResponse } from "next/server";
import { lawRevisionCores } from "@/data/mock/law-revisions";
import type {
  RevisionListApiResponse,
  ServiceErrorResponse,
} from "@/lib/types/api";
import {
  resolveDiagnosticDelay,
  resolveDiagnosticError,
} from "@/lib/server/diagnostic-controls";

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function errorResponse(
  status: number,
  message: string,
  code: "UNAVAILABLE" | "VALIDATION" | "NETWORK",
  retryable = status >= 500,
) {
  return NextResponse.json<ServiceErrorResponse>(
    { error: { code, message, retryable } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * 公開一覧はコミット済みe-Gov構造データの品質ゲート通過分だけを返す。
 * request/env指定の任意payload・sample・手入力レガシーデータへはフォールバックしない。
 */
export async function GET(request: NextRequest) {
  const delayMs = resolveDiagnosticDelay(
    request.nextUrl.searchParams.get("delayMs"),
  );
  const forceError = resolveDiagnosticError(request);

  if (forceError === "timeout") {
    await wait(5000);
    return errorResponse(
      504,
      "法改正一覧API応答がタイムアウトしました。",
      "NETWORK",
      true,
    );
  }
  if (delayMs > 0) await wait(delayMs);
  if (forceError === "5xx") {
    return errorResponse(
      503,
      "法改正一覧APIが一時的に利用できません。",
      "UNAVAILABLE",
      true,
    );
  }
  if (forceError === "validation") {
    return errorResponse(
      400,
      "法改正一覧APIの入力検証エラーです。",
      "VALIDATION",
      false,
    );
  }

  const body: RevisionListApiResponse = {
    revisions: lawRevisionCores.map((revision) => ({
      id: revision.id,
      title: revision.title,
      publishedAt: revision.publishedAt,
      summary: revision.summary,
      kind: revision.kind,
      category: revision.category,
      revisionNumber: revision.revisionNumber,
      issuer: revision.issuer,
      source: revision.source,
      impact: revision.impact,
      official_notice_number: revision.official_notice_number,
      enforcement_date: revision.enforcement_date,
      source_url: revision.source_url,
      publication_date: revision.publication_date,
    })),
  };
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=3600",
      "x-revisions-ingest-source": "egov-structured",
      "x-revisions-verification-state": "machine-validated-human-review-pending",
      "x-revisions-record-count": String(lawRevisionCores.length),
    },
  });
}
