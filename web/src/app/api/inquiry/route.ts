import { NextResponse } from "next/server";

export type InquiryPayload = {
  name?: string;
  email?: string;
  industry?: string;
  category: "question" | "improvement" | "data-error" | "feature-request" | "business" | "other";
  subject: string;
  message: string;
  publishOk?: boolean;
};

const VALID_CATEGORIES = new Set([
  "question",
  "improvement",
  "data-error",
  "feature-request",
  "business",
  "other",
]);

function isNonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateBuckets = new Map<string, number[]>();

function resolveClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() ?? "unknown";
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
      if (ts.length === 0 || ts[ts.length - 1] < windowStart) rateBuckets.delete(key);
    }
  }
  return false;
}

export async function POST(request: Request) {
  const ip = resolveClientIp(request);
  const now = Date.now();
  if (isRateLimited(ip, now)) {
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited",
        message: "短時間に多数の送信が行われました。1分ほどおいて再度お試しください。",
      },
      { status: 429, headers: { "Retry-After": String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)) } }
    );
  }

  let body: InquiryPayload;
  try {
    body = (await request.json()) as InquiryPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!isNonEmpty(body.subject) || !isNonEmpty(body.message)) {
    return NextResponse.json({ ok: false, error: "missing_required_field" }, { status: 400 });
  }

  if (!VALID_CATEGORIES.has(body.category)) {
    return NextResponse.json({ ok: false, error: "invalid_category" }, { status: 400 });
  }

  if (body.email && !isValidEmail(body.email.trim())) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const receivedAt = new Date().toISOString();
  const record = {
    receivedAt,
    name: body.name?.trim() ?? "",
    email: body.email?.trim() ?? "",
    industry: body.industry?.trim() ?? "",
    category: body.category,
    subject: body.subject.trim(),
    messageLength: body.message.length,
    publishOk: Boolean(body.publishOk),
  };

  // Resend が設定されている場合のみメール通知。それ以外はサーバーログに残す。
  const resendKey = process.env.RESEND_API_KEY;
  const inboxAddress = process.env.INQUIRY_INBOX;
  if (resendKey && inboxAddress) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: "ANZEN AI <noreply@anzen-ai.example.com>",
        to: inboxAddress,
        subject: `[ANZEN AI 相談] ${body.category} / ${body.subject.slice(0, 60)}`,
        text:
          `カテゴリ: ${body.category}\n` +
          `名前: ${record.name || "（未記入）"}\n` +
          `メール: ${record.email || "（未記入）"}\n` +
          `業種: ${record.industry || "（未記入）"}\n` +
          `公開Q&A掲載: ${record.publishOk ? "可" : "不可"}\n` +
          `件名: ${record.subject}\n\n` +
          `--- 内容 ---\n${body.message}\n`,
      });
    } catch (err) {
      console.error("[inquiry] resend error", err);
    }
  } else {
    console.log("[inquiry]", JSON.stringify(record));
  }

  return NextResponse.json(
    {
      ok: true,
      receivedAt,
      message:
        "ご意見・ご質問を受け付けました。メールアドレスをご記入いただいた場合は、原則3営業日以内に返信します。",
    },
    { status: 200 }
  );
}
