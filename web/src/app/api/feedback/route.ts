import { NextResponse } from "next/server";

export type FeedbackPayload = {
  articleSlug: string;
  errorType: "law_citation" | "broken_link" | "factual_error" | "other";
  description: string;
  email?: string;
};

const ERROR_TYPE_LABELS: Record<FeedbackPayload["errorType"], string> = {
  law_citation: "法令引用誤り",
  broken_link: "リンク切れ",
  factual_error: "事実誤認",
  other: "その他",
};

function isNonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// ────────────────────────────────────────────────────────────
// In-memory rate limiter: 同一IPあたり 1分間で最大 3 リクエスト
// ────────────────────────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 3;
const rateBuckets = new Map<string, number[]>();

function resolveClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

function isRateLimited(ip: string, now: number): boolean {
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const bucket = rateBuckets.get(ip) ?? [];
  const recent = bucket.filter((ts) => ts > windowStart);
  if (recent.length >= RATE_LIMIT_MAX) {
    rateBuckets.set(ip, recent);
    return true;
  }
  recent.push(now);
  rateBuckets.set(ip, recent);
  if (rateBuckets.size > 2048) {
    for (const [key, ts] of rateBuckets) {
      if (ts.length === 0 || ts[ts.length - 1] < windowStart) {
        rateBuckets.delete(key);
      }
    }
  }
  return false;
}

// ────────────────────────────────────────────────────────────
// メール送信 (Resend / fallback: console.log)
// ────────────────────────────────────────────────────────────
async function sendFeedbackEmail(payload: FeedbackPayload, receivedAt: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = "kenshi.ycc@gmail.com";
  const subject = `[SafeAI] 記事誤り報告: ${payload.articleSlug}`;
  const html = `
<h2>記事誤り報告</h2>
<table>
  <tr><th>記事スラッグ</th><td>${payload.articleSlug}</td></tr>
  <tr><th>エラー種別</th><td>${ERROR_TYPE_LABELS[payload.errorType]}</td></tr>
  <tr><th>説明</th><td>${payload.description.replace(/\n/g, "<br>")}</td></tr>
  ${payload.email ? `<tr><th>報告者メール</th><td>${payload.email}</td></tr>` : ""}
  <tr><th>受信日時</th><td>${receivedAt}</td></tr>
</table>
`;

  if (!apiKey) {
    console.log("[feedback] RESEND_API_KEY 未設定 - メール送信スキップ");
    console.log("[feedback] 報告内容:", JSON.stringify({ subject, to, payload, receivedAt }));
    return;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL ?? "noreply@safe-ai.jp";

  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) {
    console.error("[feedback] Resend送信エラー:", error);
  }
}

// ────────────────────────────────────────────────────────────
// POST /api/feedback
// ────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const ip = resolveClientIp(request);
  const now = Date.now();
  if (isRateLimited(ip, now)) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", message: "短時間に多数の送信がありました。1分ほどおいて再度お試しください。" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)) } }
    );
  }

  let body: FeedbackPayload;
  try {
    body = (await request.json()) as FeedbackPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!isNonEmpty(body.articleSlug)) {
    return NextResponse.json({ ok: false, error: "missing_article_slug" }, { status: 400 });
  }
  if (!["law_citation", "broken_link", "factual_error", "other"].includes(body.errorType)) {
    return NextResponse.json({ ok: false, error: "invalid_error_type" }, { status: 400 });
  }
  if (!isNonEmpty(body.description)) {
    return NextResponse.json({ ok: false, error: "missing_description" }, { status: 400 });
  }
  if (body.description.length > 1000) {
    return NextResponse.json({ ok: false, error: "description_too_long" }, { status: 400 });
  }
  if (body.email && !isValidEmail(body.email.trim())) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const receivedAt = new Date().toISOString();
  console.log("[feedback]", JSON.stringify({ receivedAt, articleSlug: body.articleSlug, errorType: body.errorType }));

  await sendFeedbackEmail(body, receivedAt);

  return NextResponse.json({ ok: true, receivedAt }, { status: 200 });
}
