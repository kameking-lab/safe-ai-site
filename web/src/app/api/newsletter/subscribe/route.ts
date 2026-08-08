import { NextResponse } from "next/server";
import { addSubscriber, type Industry } from "@/lib/newsletter";
import { sharedRateLimitGuard } from "@/lib/security/shared-state";

const VALID_INDUSTRIES: Industry[] = [
  "建設",
  "製造",
  "医療福祉",
  "運輸",
  "IT",
  "その他",
];

interface SubscribeRequest {
  email: string;
  industry?: string;
}

export async function POST(req: Request) {
  if (process.env.AUTOMATED_NOTIFICATION_DELIVERY_ENABLED !== "true") {
    return NextResponse.json(
      { ok: false, error: "delivery_not_operationally_verified" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  const limited = await sharedRateLimitGuard(req, {
    routeKey: "newsletter-subscribe",
    limit: 5,
    windowMs: 60 * 60 * 1_000,
  });
  if (limited) return limited;
  let body: SubscribeRequest;
  try {
    body = (await req.json()) as SubscribeRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { ok: false, error: "有効なメールアドレスを入力してください。" },
      { status: 400 }
    );
  }

  const industry: Industry = VALID_INDUSTRIES.includes(body.industry as Industry)
    ? (body.industry as Industry)
    : "その他";

  const result = await addSubscriber({
    email,
    industry,
    subscribedAt: new Date().toISOString(),
    active: true,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 409 });
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
