import { NextRequest, NextResponse } from "next/server";
import { summaryMockByRevisionId } from "@/data/mock/summaries";
import { getLawRevisionById } from "@/data/mock/law-revisions";
import type { SummaryApiRouteResponse } from "@/lib/types/api";
import type { LawRevision, LawRevisionSummary } from "@/lib/types/domain";
import { cdnCacheHeaders, noStoreHeaders } from "@/lib/api-cache";
import { resolveDiagnosticDelay, resolveDiagnosticError } from "@/lib/server/diagnostic-controls";

// F-005: 唯一のGETルート。revisionIdごとに固定応答 → Vercel Edge Cache実効。
// 法改正の追加は日次以下のペースなので1h保持+24h SWR。最大の削減効果が期待される。
const SUCCESS_CACHE = cdnCacheHeaders("DAILY");

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
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
    { status, headers: noStoreHeaders() }
  );
}

export async function GET(request: NextRequest) {
  const revisionId = request.nextUrl.searchParams.get("revisionId");
  const delayMs = resolveDiagnosticDelay(request.nextUrl.searchParams.get("delayMs"));
  const forceError = resolveDiagnosticError(request);

  if (forceError === "timeout") {
    await wait(6000);
    return errorResponse(504, "要約API応答がタイムアウトしました。", "NETWORK");
  }

  if (delayMs > 0) await wait(delayMs);

  if (forceError === "5xx") {
    return errorResponse(503, "要約APIが一時的に利用できません。", "UNAVAILABLE");
  }

  if (forceError === "validation") {
    return errorResponse(400, "要約APIの入力検証エラーです。", "VALIDATION", false);
  }

  if (!revisionId) {
    return errorResponse(400, "revisionId は必須です。", "VALIDATION", false);
  }

  const mockSummary = summaryMockByRevisionId[revisionId];
  if (mockSummary) {
    return NextResponse.json<SummaryApiRouteResponse>(
      {
        ok: true,
        data: { revisionId, summary: mockSummary },
      },
      { headers: SUCCESS_CACHE }
    );
  }

  // Fallback: 事前要約が未作成の場合は、収録済みの原文要約だけから抜粋する。
  // 探索は一覧表示と同じ統合リスト（sample＋e-Gov自動取込＋real＋extra）を使う。
  // realLawRevisions 単独だと、e-Gov ETL が新しい改正を先頭に積んだ時点で
  // 一覧の先頭カードの要約が 404 になる（2026-06-29〜のCI恒常failの真因）。
  const revision = getLawRevisionById(revisionId);
  if (!revision) {
    return errorResponse(404, "要約データが見つかりませんでした。", "NOT_FOUND", false);
  }
  const generated = buildSourceBoundFallback(revision);
  return NextResponse.json<SummaryApiRouteResponse>(
    {
      ok: true,
      data: { revisionId, summary: generated },
    },
    { headers: SUCCESS_CACHE }
  );
}

function buildSourceBoundFallback(revision: LawRevision): LawRevisionSummary {
  // 収録済み概要を分割するだけで、対象業種や現場措置を推測しない。
  const sentences = (revision.summary ?? "")
    .split(/[。\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 3);
  while (sentences.length < 3) sentences.push(revision.title);
  return {
    threeLineSummary: [sentences[0], sentences[1], sentences[2]] as [string, string, string],
    workplaceActions: [],
    targetIndustries: [],
  };
}
