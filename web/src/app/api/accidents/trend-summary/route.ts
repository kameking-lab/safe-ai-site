/**
 * P1-4 最近の労災トレンドAI要約。
 * GET ?months=12 : 既存事故事例から期間集計し、Geminiで自然言語のトレンド要約を返す（参考）。
 * env未設定/AI失敗時は集計データのみ返す（フォールバック）。IPレート制限つき。
 * 推測は禁止し、提示した集計の範囲で傾向を述べさせる。
 */
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AI_DISCLAIMER_SYSTEM_INSTRUCTION } from "@/lib/gemini";
import { accidentCasesMock } from "@/data/mock/accident-cases";
import { computeAccidentTrend } from "@/lib/accidents/trend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "gemini-2.5-flash";
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 6;
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

const SYSTEM = `あなたは労働安全の専門家です。${AI_DISCLAIMER_SYSTEM_INSTRUCTION}
提示された「事故事例の集計データ（実データ）」の範囲内で、最近の労働災害の傾向を現場向けに簡潔に要約してください。
- 事故型・業種の上位を踏まえ、特に注意すべき点を箇条書きで
- 集計に無い数値や固有名を創作しないこと。サンプル件数が少ない場合はその旨を述べること
- 最後に免責を付すこと`;

export async function GET(request: Request) {
  const monthsRaw = new URL(request.url).searchParams.get("months");
  const months = monthsRaw === "1" || monthsRaw === "3" || monthsRaw === "12" ? Number(monthsRaw) : 12;
  const trend = computeAccidentTrend(accidentCasesMock, months);

  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key || isRateLimited(resolveClientIp(request), Date.now())) {
    return NextResponse.json({ ok: true, source: "data_only", trend, summary: null });
  }

  const typeLines = trend.byType.map((b) => `${b.label}: ${b.count}件`).join("、");
  const indLines = trend.byIndustry.map((b) => `${b.label}: ${b.count}件`).join("、");
  const prompt = `【期間】${trend.periodLabel}（事例DBサンプル ${trend.total}件）\n【事故型別】${typeLines || "なし"}\n【業種別】${indLines || "なし"}\n\nこの集計を踏まえ、最近の労災傾向と注意点を要約してください。`;

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: SYSTEM });
    const result = await model.generateContent(prompt);
    return NextResponse.json({ ok: true, source: "gemini", trend, summary: result.response.text() });
  } catch {
    return NextResponse.json({ ok: true, source: "data_only", trend, summary: null });
  }
}
