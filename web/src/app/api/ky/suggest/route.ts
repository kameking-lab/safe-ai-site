/**
 * KY全面再設計 Phase 5: 危険箇所のAI提案 API（本物のGemini接続）。
 * 作業内容 → 類似事例をRAG検索 → Gemini で構造化提案 → 失敗/未設定時は擬似AIへ二段フォールバック。
 */
import { NextResponse } from "next/server";
import { suggestKyByIndustryAndWork } from "@/lib/ky-suggestion";
import {
  generateHazardsWithGemini,
  fallbackHazardSuggestions,
  isGeminiConfigured,
  KY_SUGGEST_DISCLAIMER,
  type HazardSuggestionResponse,
} from "@/lib/ky/gemini-suggest";
import { withCircuitBreaker } from "@/lib/external/circuit-breaker";
import {
  KY_INDUSTRY_IDS,
  KY_WORK_TYPE_IDS,
  type KyIndustryId,
  type KyWorkTypeId,
} from "@/types/ky-example";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 簡易レート制限: 同一IP 1分間で最大10回（AI呼び出し費用の暴発抑止）。
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;
const rateBuckets = new Map<string, number[]>();

function resolveClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function isRateLimited(ip: string, now: number): boolean {
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const recent = (rateBuckets.get(ip) ?? []).filter((ts) => ts > windowStart);
  if (recent.length >= RATE_LIMIT_MAX) {
    rateBuckets.set(ip, recent);
    return true;
  }
  recent.push(now);
  rateBuckets.set(ip, recent);
  if (rateBuckets.size > 2048) {
    for (const [key, ts] of rateBuckets) {
      if (ts.length === 0 || ts[ts.length - 1] < windowStart) rateBuckets.delete(key);
    }
  }
  return false;
}

function isIndustry(v: unknown): v is KyIndustryId {
  return typeof v === "string" && (KY_INDUSTRY_IDS as readonly string[]).includes(v);
}
function isWorkType(v: unknown): v is KyWorkTypeId {
  return typeof v === "string" && (KY_WORK_TYPE_IDS as readonly string[]).includes(v);
}

type Body = {
  workContent?: unknown;
  industry?: unknown;
  workType?: unknown;
  industryId?: unknown;
};

export async function POST(request: Request) {
  const now = Date.now();
  if (isRateLimited(resolveClientIp(request), now)) {
    return NextResponse.json(
      { error: "rate_limited", message: "短時間に多数のリクエストがありました。少し待って再度お試しください。" },
      { status: 429, headers: { "Retry-After": String(RATE_LIMIT_WINDOW_MS / 1000) } }
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const workContent = typeof body.workContent === "string" ? body.workContent.trim() : "";
  if (!workContent) {
    return NextResponse.json({ error: "workContent が必要です" }, { status: 400 });
  }
  const industry = isIndustry(body.industry) ? body.industry : undefined;
  const workType = isWorkType(body.workType) ? body.workType : undefined;
  const industryId = typeof body.industryId === "string" ? body.industryId : undefined;

  // RAG: 過去のKY事例（150件）から類似を検索してプロンプトの根拠にする。
  const examples = suggestKyByIndustryAndWork({ freeText: workContent, industry, workType, limit: 6 });

  // 1段目: 本物の Gemini。
  if (isGeminiConfigured()) {
    try {
      const suggestions = await withCircuitBreaker(
        "gemini",
        () => generateHazardsWithGemini(workContent, examples),
        { failureThreshold: 4, cooldownMs: 60_000 }
      );
      const res: HazardSuggestionResponse = {
        source: "gemini",
        suggestions,
        disclaimer: KY_SUGGEST_DISCLAIMER,
      };
      return NextResponse.json(res);
    } catch {
      // 2段目フォールバックへ
    }
  }

  // 2段目: 擬似AI（業種プリセット）。
  const suggestions = fallbackHazardSuggestions(workContent, industryId);
  const res: HazardSuggestionResponse = {
    source: "fallback",
    suggestions,
    disclaimer: KY_SUGGEST_DISCLAIMER,
    note: isGeminiConfigured()
      ? "AI応答が得られなかったため、定型の提案を表示しています。"
      : "AI未設定のため、定型の提案を表示しています（設定すると本物のAI提案になります）。",
  };
  return NextResponse.json(res);
}
