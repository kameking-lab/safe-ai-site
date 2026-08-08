/**
 * KY全面再設計 Phase 5: 危険箇所のAI提案 API（本物のGemini接続）。
 * 作業内容 → 類似事例をRAG検索 → Gemini で構造化提案 → 失敗/未設定時は擬似AIへ二段フォールバック。
 */
import { NextResponse } from "next/server";
import { suggestVerifiedKyEvidence } from "@/lib/ky-suggestion";
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
import {
  buildKySuggestionPromptContext,
  flattenKySuggestionContextInput,
  parseKySuggestionContext,
  type KySuggestionContextInput,
} from "@/lib/ky/suggestion-context";
import {
  aiOutboundBlockedJson,
  inspectAiOutbound,
} from "@/lib/server/ai-outbound-safety";
import { consumeRequestRateLimit } from "@/lib/security/shared-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 簡易レート制限: 同一IP 1分間で最大10回（AI呼び出し費用の暴発抑止）。
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;

function isIndustry(v: unknown): v is KyIndustryId {
  return (
    typeof v === "string" && (KY_INDUSTRY_IDS as readonly string[]).includes(v)
  );
}
function isWorkType(v: unknown): v is KyWorkTypeId {
  return (
    typeof v === "string" && (KY_WORK_TYPE_IDS as readonly string[]).includes(v)
  );
}

type Body = KySuggestionContextInput & {
  industry?: unknown;
  workType?: unknown;
  industryId?: unknown;
  aiProviderConsent?: unknown;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const flattenedContext = flattenKySuggestionContextInput(body);
  const outboundSafety = inspectAiOutbound({
    purpose: "ky-suggestion",
    texts: Object.values(flattenedContext),
    consent: body.aiProviderConsent === true,
    maxChars: 4_000,
    contextPolicy: "approved-server-corpus",
  });
  if (!outboundSafety.allowed) {
    return NextResponse.json(aiOutboundBlockedJson(outboundSafety), {
      status: outboundSafety.status,
      headers: { "Cache-Control": "no-store" },
    });
  }
  let rateLimit;
  try {
    rateLimit = await consumeRequestRateLimit(request, {
      routeKey: "ky-suggest",
      limit: RATE_LIMIT_MAX,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
  } catch {
    return NextResponse.json(
      {
        error: "shared_rate_limit_unavailable",
        message:
          "混雑防止機能を確認できないため、AI候補の生成を一時停止しています。",
      },
      { status: 503, headers: { "Retry-After": "60" } },
    );
  }
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message:
          "短時間に多数のリクエストがありました。少し待って再度お試しください。",
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSec) },
      },
    );
  }
  const parsedContext = parseKySuggestionContext({
    ...body,
    context: flattenedContext,
  });
  if (!parsedContext.context) {
    return NextResponse.json(
      {
        error: "missing_conditions",
        message: "AI候補を作成するための作業条件が不足しています。",
        missing: parsedContext.missing,
      },
      { status: 422 },
    );
  }
  const workContent = buildKySuggestionPromptContext(parsedContext.context);
  const industry = isIndustry(body.industry) ? body.industry : undefined;
  const workType = isWorkType(body.workType) ? body.workType : undefined;
  const industryId =
    typeof body.industryId === "string" ? body.industryId : undefined;

  // 個別一次資料URL・人手確認・利用許可が揃った事例だけをAIへ渡す。
  // 現在の150モデルケースは全件synthetic/未確認のため対象外（0件）。
  const examples = suggestVerifiedKyEvidence({
    freeText: workContent,
    industry,
    workType,
    limit: 6,
  });

  // 1段目: 本物の Gemini。
  if (isGeminiConfigured()) {
    try {
      const suggestions = await withCircuitBreaker(
        "gemini",
        () => generateHazardsWithGemini(workContent, examples),
        { failureThreshold: 4, cooldownMs: 60_000 },
      );
      const generatedAt = new Date().toISOString();
      const res: HazardSuggestionResponse = {
        source: "gemini",
        suggestions: suggestions.map((suggestion) => ({
          ...suggestion,
          generatedAt,
        })),
        disclaimer: KY_SUGGEST_DISCLAIMER,
      };
      return NextResponse.json(res);
    } catch {
      // 2段目フォールバックへ
    }
  }

  // 2段目: 擬似AI（業種プリセット）。
  const generatedAt = new Date().toISOString();
  const suggestions = fallbackHazardSuggestions(workContent, industryId).map(
    (suggestion) => ({ ...suggestion, generatedAt }),
  );
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
