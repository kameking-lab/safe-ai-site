// Stripe Checkout Session作成エンドポイント。
// 認証必須。Stripe Customerを自動作成しSubscription.stripeCustomerIdへ紐付け。
//
// 必要な環境変数:
//   STRIPE_SECRET_KEY    - Stripeシークレットキー
//   NEXT_PUBLIC_SITE_URL - サイトのベースURL
//   DATABASE_URL         - 省略可。未設定時はDB保存をスキップ

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "決済機能は現在準備中です。（STRIPE_SECRET_KEY未設定）" },
      { status: 503 },
    );
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;
  const email = session.user.email ?? undefined;
  const name = session.user.name ?? undefined;
  if (!userId) {
    return NextResponse.json({ error: "ユーザーIDを取得できません" }, { status: 401 });
  }

  const { priceId, planName } = (await req.json()) as {
    priceId?: string;
    planName?: string;
  };
  if (!priceId) {
    return NextResponse.json({ error: "priceIdが必要です。" }, { status: 400 });
  }

  let customerId: string | undefined;
  if (prisma) {
    try {
      const sub = await prisma.subscription.findUnique({ where: { userId } });
      if (sub?.stripeCustomerId) {
        customerId = sub.stripeCustomerId;
      } else {
        const customer = await stripe.customers.create({
          email,
          name,
          metadata: { userId },
        });
        customerId = customer.id;
        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            stripeCustomerId: customerId,
            planName: "free",
            status: "active",
          },
          update: { stripeCustomerId: customerId },
        });
      }
    } catch (err) {
      console.error("[stripe/checkout] customer mapping failed", err);
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer: customerId,
      customer_email: customerId ? undefined : email,
      success_url: `${siteUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pricing`,
      locale: "ja",
      metadata: { userId, planName: planName ?? "" },
      subscription_data: {
        metadata: { userId, planName: planName ?? "" },
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "決済セッションの作成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
