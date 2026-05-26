/**
 * P0-1 事故AI注意喚起。
 * POST { workContent, category? } : 既存事故事例DBから関連ケースを抽出し、Geminiで
 * 「この作業で起きやすい事故・危険ポイント・再発防止策」を要約（参考・免責明示）。
 * env未設定なら503（UIは関連ケース一覧のみ表示にフォールバック）。IPレート制限つき。
 * 創作は禁止し、抽出した実ケースに基づく一般的注意喚起のみ生成させる。
 */
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AI_DISCLAIMER_SYSTEM_INSTRUCTION } from "@/lib/gemini";
import { accidentCasesMock } from "@/data/mock/accident-cases";
import { findRelevantAccidents } from "@/lib/accidents/ai-relevant";
import type { AccidentWorkCategory } from "@/lib/types/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "gemini-2.5-flash";
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 8;
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
与えられた「過去の労働災害事例（実データ）」と作業内容に基づき、現場向けに簡潔に助言してください。
- この作業で特に起きやすい事故の型と、その危険ポイントを箇条書きで
- 具体的な再発防止策（設備・作業手順・保護具・教育の観点）を箇条書きで
- 提示された事例の範囲を超える数値や固有名を創作しないこと。一般化した注意喚起に留めること
- 最後に免責を付すこと`;

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  let body: { workContent?: unknown; category?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }
  const workContent = typeof body.workContent === "string" ? body.workContent.trim() : "";
  const category = (typeof body.category === "string" ? body.category : "") as AccidentWorkCategory | "";
  if (!workContent && !category) {
    return NextResponse.json({ ok: false, reason: "missing_field" }, { status: 400 });
  }

  // 関連事故を抽出（実データ）。AI未設定でもこの一覧は返す。
  const hits = findRelevantAccidents({ workContent, category }, accidentCasesMock, 5);
  const relatedCases = hits.map((h) => ({
    id: h.case.id,
    title: h.case.title,
    type: h.case.type,
    severity: h.case.severity,
    workCategory: h.case.workCategory,
  }));

  if (!key) {
    return NextResponse.json({ ok: true, source: "cases_only", advice: null, relatedCases }, { status: 200 });
  }
  if (isRateLimited(resolveClientIp(request), Date.now())) {
    return NextResponse.json({ ok: true, source: "cases_only", advice: null, relatedCases, rateLimited: true }, { status: 200 });
  }

  const caseLines = hits
    .map((h, i) => `事例${i + 1}: [${h.case.workCategory}/${h.case.type}/${h.case.severity}] ${h.case.title} — ${h.case.summary}`)
    .join("\n");
  const prompt = `【作業内容】${workContent || "(指定なし)"}\n【業種】${category || "(指定なし)"}\n【関連する過去の労働災害事例（実データ）】\n${caseLines || "(該当事例なし)"}\n\n上記を踏まえ、この作業の危険ポイントと再発防止策を助言してください。`;

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: SYSTEM });
    const result = await model.generateContent(prompt);
    return NextResponse.json({ ok: true, source: "gemini", advice: result.response.text(), relatedCases });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    // AI失敗でも関連ケースは返す（フォールバック）。
    return NextResponse.json({ ok: true, source: "cases_only", advice: null, relatedCases, error: msg });
  }
}
