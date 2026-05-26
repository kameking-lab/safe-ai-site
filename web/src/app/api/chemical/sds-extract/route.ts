/**
 * P2-1 SDS取込み（Gemini Vision）。
 * POST { pdfBase64, mimeType } : SDS（PDF/画像）から物質名・CAS・GHS・物理化学性質・取扱注意・適用法令・対策を抽出。
 * - env 未設定なら 503（UIはテンプレ手入力にフォールバック）。
 * - IP単位の短時間レート制限＋ファイルサイズ上限で濫用を抑止（厳密な月次上限は永続化が必要＝将来）。
 * - 抽出はAI生成のため「参考」。最終判断は公式SDS・専門家による（UIで免責明示）。
 */
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AI_DISCLAIMER_SYSTEM_INSTRUCTION } from "@/lib/gemini";
import { parseSdsExtraction } from "@/lib/chemical/sds-extraction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "gemini-2.5-flash";
const MAX_BASE64_LEN = 8 * 1024 * 1024; // 約6MBのPDF/画像まで（base64で約8MB）
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 6; // 1分あたり6件/IP（濫用抑止）
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

const SYSTEM = `あなたは化学物質の安全データシート(SDS)を読み取る専門家です。${AI_DISCLAIMER_SYSTEM_INSTRUCTION}
与えられたSDSから以下を抽出し、必ずJSONのみで返答してください（前後に説明文を付けない）:
{
  "productName": "製品名または主成分の物質名",
  "cas": "代表CAS番号（不明なら空文字）",
  "ghs": ["GHS分類の区分（例: 引火性液体 区分2）", ...],
  "physicalChemical": "引火点・沸点・外観など物理化学的性質の要約",
  "handling": "取扱い・保管上の主な注意",
  "applicableLaws": ["SDSに記載の適用法令（例: 有機則, 消防法）", ...],
  "measures": "推奨される対策・保護具の要約"
}
読み取れない項目は空文字または空配列にすること。推測で値を作らないこと。`;

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) {
    return NextResponse.json({ ok: false, reason: "ai_not_configured" }, { status: 503 });
  }

  const ip = resolveClientIp(request);
  if (isRateLimited(ip, Date.now())) {
    return NextResponse.json({ ok: false, reason: "rate_limited" }, { status: 429 });
  }

  let body: { pdfBase64?: unknown; mimeType?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }
  const pdfBase64 = typeof body.pdfBase64 === "string" ? body.pdfBase64 : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "application/pdf";
  if (!pdfBase64) {
    return NextResponse.json({ ok: false, reason: "missing_file" }, { status: 400 });
  }
  if (pdfBase64.length > MAX_BASE64_LEN) {
    return NextResponse.json({ ok: false, reason: "file_too_large" }, { status: 413 });
  }
  if (!/^(application\/pdf|image\/(png|jpeg|webp))$/.test(mimeType)) {
    return NextResponse.json({ ok: false, reason: "unsupported_type" }, { status: 415 });
  }

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: SYSTEM });
    const result = await model.generateContent([
      { inlineData: { data: pdfBase64, mimeType } },
      { text: "このSDSから指定のJSON項目を抽出してください。" },
    ]);
    const text = result.response.text();
    const extracted = parseSdsExtraction(text);
    if (!extracted) {
      return NextResponse.json({ ok: false, reason: "extract_failed" }, { status: 422 });
    }
    return NextResponse.json({ ok: true, source: "gemini", extracted });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ ok: false, reason: "ai_error", detail: msg }, { status: 502 });
  }
}
