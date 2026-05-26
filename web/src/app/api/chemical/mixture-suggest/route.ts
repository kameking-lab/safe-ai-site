/**
 * P2-4 混合物RA のAI支援（Gemini）。
 * POST { components: [{name, cas, weightPercent}], lawFamilies, hazards }
 *  → 混合時に特に注意すべき相互作用・換気・防護具・教育の提案（参考）を返す。
 * env 未設定なら 503（UIは定性集約のみで継続）。IPレート制限つき。創作的な数値断定はさせない。
 */
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AI_DISCLAIMER_SYSTEM_INSTRUCTION } from "@/lib/gemini";

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

const SYSTEM = `あなたは労働衛生の専門家です。${AI_DISCLAIMER_SYSTEM_INSTRUCTION}
複数の化学物質を混合・併用する作業について、混合時に特に注意すべき点を簡潔に助言してください。
- 成分間の相互作用（混触危険・発熱・有毒ガス発生の可能性等）があれば一般論として指摘
- 換気・局所排気の要否、推奨される保護具、教育・表示の要点
- 数値（ばく露限界値・濃度等）を断定しないこと。不明な点は「公式SDSで確認」とすること
- 箇条書き中心で、最後に免責を付すこと`;

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) return NextResponse.json({ ok: false, reason: "ai_not_configured" }, { status: 503 });

  if (isRateLimited(resolveClientIp(request), Date.now())) {
    return NextResponse.json({ ok: false, reason: "rate_limited" }, { status: 429 });
  }

  let body: { components?: unknown; lawFamilies?: unknown; hazards?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }
  const components = Array.isArray(body.components) ? body.components : [];
  if (components.length < 2) {
    return NextResponse.json({ ok: false, reason: "need_two_components" }, { status: 400 });
  }

  const lines = components
    .slice(0, 10)
    .map((c) => {
      const o = c as { name?: unknown; cas?: unknown; weightPercent?: unknown };
      const name = typeof o.name === "string" ? o.name : "?";
      const cas = typeof o.cas === "string" && o.cas ? `(CAS ${o.cas})` : "";
      const pct = typeof o.weightPercent === "number" ? ` ${o.weightPercent}%` : "";
      return `- ${name}${cas}${pct}`;
    })
    .join("\n");
  const lawFamilies = Array.isArray(body.lawFamilies) ? body.lawFamilies.filter((x) => typeof x === "string") : [];
  const hazards = Array.isArray(body.hazards) ? body.hazards.filter((x) => typeof x === "string") : [];

  const prompt = `次の成分を混合・併用する作業の注意点を助言してください。\n【成分】\n${lines}\n【関連法令(参考)】${lawFamilies.join("、") || "不明"}\n【既知の有害性(参考)】${hazards.join("、") || "不明"}`;

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: SYSTEM });
    const result = await model.generateContent(prompt);
    return NextResponse.json({ ok: true, source: "gemini", advice: result.response.text() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ ok: false, reason: "ai_error", detail: msg }, { status: 502 });
  }
}
