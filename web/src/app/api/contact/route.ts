import { NextResponse } from "next/server";

export type ContactPayload = {
  company: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  category: string;
  budget: string;
  contactMethod: string;
  features: string[];
  plan?: string;
};

function isNonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// ────────────────────────────────────────────────────────────
// In-memory rate limiter: 同一IPあたり 1分間で最大 5 リクエスト
// 本番ではプロセスごとにカウントが独立するため厳密ではないが、
// 単一のお問い合わせAPIに対する素朴なスパム/連投抑制には十分。
// ────────────────────────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 5;
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
  // バケット数爆発を防ぐ簡易GC
  if (rateBuckets.size > 2048) {
    for (const [key, ts] of rateBuckets) {
      if (ts.length === 0 || ts[ts.length - 1] < windowStart) {
        rateBuckets.delete(key);
      }
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
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)),
        },
      }
    );
  }

  let body: ContactPayload;
  try {
    body = (await request.json()) as ContactPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (
    !isNonEmpty(body.company) ||
    !isNonEmpty(body.name) ||
    !isNonEmpty(body.email) ||
    !isNonEmpty(body.message)
  ) {
    return NextResponse.json({ ok: false, error: "missing_required_field" }, { status: 400 });
  }

  if (!isValidEmail(body.email.trim())) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const receivedAt = new Date().toISOString();
  const record = {
    receivedAt,
    company: body.company.trim(),
    name: body.name.trim(),
    email: body.email.trim(),
    phone: body.phone?.trim() ?? "",
    category: body.category,
    budget: body.budget,
    contactMethod: body.contactMethod,
    plan: body.plan ?? "",
    features: Array.isArray(body.features) ? body.features : [],
    messageLength: body.message.length,
  };

  // 現段階はサーバーログへの記録のみ。将来は Resend / Slack Webhook 連携を追加。
  console.log("[contact]", JSON.stringify(record));

  return NextResponse.json(
    {
      ok: true,
      receivedAt,
      message:
        "お問い合わせを受け付けました。2〜3営業日以内にご入力のメールアドレスへご返信いたします。",
    },
    { status: 200 }
  );
}
