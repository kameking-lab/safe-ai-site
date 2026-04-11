import { NextResponse } from "next/server";
import Stripe from "stripe";

// 必要な環境変数:
//   STRIPE_SECRET_KEY   - Stripe ダッシュボードのシークレットキー
//   NEXT_PUBLIC_SITE_URL - サイトのベースURL (例: https://anzen-ai.vercel.app)

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2025-03-31.basil" });
}

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "決済機能は現在準備中です。（STRIPE_SECRET_KEY未設定）" },
      { status: 503 }
    );
  }

  const { priceId, planName } = (await req.json()) as {
    priceId?: string;
    planName?: string;
  };

  if (!priceId) {
    return NextResponse.json({ error: "priceIdが必要です。" }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pricing`,
      locale: "ja",
      metadata: { planName: planName ?? "" },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "決済セッションの作成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
