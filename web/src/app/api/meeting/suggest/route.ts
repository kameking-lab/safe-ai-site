/**
 * Phase 6: 打合せ書の各社行AI提案。作業内容 → 予想災害・安全衛生指示事項・リスク(重大性/可能性)。
 * KY Phase5 の Gemini パイプライン（RAG＋本物Gemini＋2段フォールバック）をそのまま流用する。
 */
import { NextResponse } from "next/server";
import { suggestKyByIndustryAndWork } from "@/lib/ky-suggestion";
import {
  generateHazardsWithGemini,
  fallbackHazardSuggestions,
  isGeminiConfigured,
  KY_SUGGEST_DISCLAIMER,
  type KyHazardSuggestion,
} from "@/lib/ky/gemini-suggest";
import { withCircuitBreaker } from "@/lib/external/circuit-breaker";
import { KY_INDUSTRY_IDS, type KyIndustryId } from "@/types/ky-example";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function aggregate(suggestions: KyHazardSuggestion[], source: "gemini" | "fallback", note?: string) {
  const disasters = [...new Set(suggestions.map((s) => s.hazard).filter(Boolean))].slice(0, 6);
  const instructions = suggestions
    .map((s) => s.reduction?.trim())
    .filter((x): x is string => !!x)
    .slice(0, 6)
    .join("\n");
  const severity = Math.max(1, ...suggestions.map((s) => s.severity || 1));
  const likelihood = Math.max(1, ...suggestions.map((s) => s.likelihood || 1));
  return {
    source,
    disasters,
    instructions,
    severity,
    likelihood,
    grounded: suggestions.some((s) => s.grounded),
    disclaimer: KY_SUGGEST_DISCLAIMER,
    ...(note ? { note } : {}),
  };
}

export async function POST(request: Request) {
  const now = Date.now();
  if (isRateLimited(resolveClientIp(request), now)) {
    return NextResponse.json(
      { error: "rate_limited", message: "短時間に多数のリクエストがありました。少し待って再度お試しください。" },
      { status: 429, headers: { "Retry-After": String(RATE_LIMIT_WINDOW_MS / 1000) } }
    );
  }

  let body: { workContent?: unknown; industry?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const workContent = typeof body.workContent === "string" ? body.workContent.trim() : "";
  if (!workContent) {
    return NextResponse.json({ error: "workContent が必要です" }, { status: 400 });
  }
  const industry = isIndustry(body.industry) ? body.industry : undefined;
  const examples = suggestKyByIndustryAndWork({ freeText: workContent, industry, limit: 6 });

  if (isGeminiConfigured()) {
    try {
      const suggestions = await withCircuitBreaker(
        "gemini",
        () => generateHazardsWithGemini(workContent, examples),
        { failureThreshold: 4, cooldownMs: 60_000 }
      );
      return NextResponse.json(aggregate(suggestions, "gemini"));
    } catch {
      /* フォールバックへ */
    }
  }

  const suggestions = fallbackHazardSuggestions(workContent, industry);
  return NextResponse.json(
    aggregate(
      suggestions,
      "fallback",
      isGeminiConfigured()
        ? "AI応答が得られなかったため、定型の提案を表示しています。"
        : "AI未設定のため、定型の提案を表示しています（設定すると本物のAI提案になります）。"
    )
  );
}
