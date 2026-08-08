import { NextResponse } from "next/server";
import { noStoreHeaders } from "@/lib/api-cache";
import {
  aiOutboundBlockedJson,
  inspectAiOutbound,
} from "@/lib/server/ai-outbound-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const MEETING_SUGGESTIONS_ENABLED = false;

/**
 * 各主張の出典・採否・確認時刻を帳票へ保持できるまでは、生成候補を返さない。
 * 旧実装の aggregate grounded は一部一致を全候補の根拠ありと誤認させ得たため廃止した。
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "入力形式を確認できません。" },
      { status: 400, headers: noStoreHeaders() },
    );
  }
  const outboundSafety = inspectAiOutbound({
    purpose: "meeting-suggestion",
    texts: [
      body.workContent ?? "",
      body.workLocation ?? "",
      body.machines ?? "",
      String(body.plannedCount ?? ""),
      body.weather ?? "",
      body.changes ?? "",
    ],
    consent: true,
    maxChars: 5_000,
    contextPolicy: "no-context",
  });
  if (!outboundSafety.allowed) {
    return NextResponse.json(aiOutboundBlockedJson(outboundSafety), {
      status: outboundSafety.status,
      headers: {
        ...noStoreHeaders(),
        "X-AI-Used": "false",
        "X-Suggestion-Status": "blocked",
      },
    });
  }
  return NextResponse.json(
    {
      error: "suggestion_provenance_unavailable",
      message:
        "候補ごとの出典と確認履歴を帳票に保持できないため、自動提案を停止しています。予想災害と指示事項を入力し、一次資料と現場条件で確認してください。",
      suggestions: [],
      source: "withheld",
      aiUsed: false,
      requiresHumanReview: true,
    },
    {
      status: 422,
      headers: {
        ...noStoreHeaders(),
        "X-AI-Used": "false",
        "X-Suggestion-Status": "withheld",
      },
    },
  );
}
