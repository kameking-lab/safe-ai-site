// Stripe Checkout Session作成エンドポイント。
// 認証必須。Stripe Customerを自動作成しSubscription.stripeCustomerIdへ紐付け。
//
// 必要な環境変数:
//   STRIPE_SECRET_KEY    - Stripeシークレットキー
//   NEXT_PUBLIC_SITE_URL - サイトのベースURL
//   DATABASE_URL         - 必須。未設定時は決済をfail-closed

import Stripe from "stripe";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isPaidModeReady, resolveStripePlan } from "@/lib/stripe-price-policy";
import { privateJson, readBoundedJson } from "@/lib/server/cloud-owner";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function POST(req: Request) {
  if (!isPaidModeReady() || !prisma) {
    return privateJson({ error: "決済機能は現在ご利用いただけません。" }, 503);
  }
  const stripe = getStripe();
  if (!stripe) {
    return privateJson({ error: "決済機能は現在ご利用いただけません。" }, 503);
  }

  const session = await auth();
  if (!session?.user) {
    return privateJson({ error: "ログインが必要です" }, 401);
  }
  const userId = (session.user as { id?: string }).id;
  const email = session.user.email ?? undefined;
  const name = session.user.name ?? undefined;
  if (!userId) {
    return privateJson({ error: "ユーザーIDを取得できません" }, 401);
  }

  const parsed = await readBoundedJson(req, 8 * 1024);
  if (!parsed.ok) {
    return privateJson({ error: "リクエスト形式が不正です。" }, parsed.reason === "payload_too_large" ? 413 : 400);
  }
  const { priceId } = parsed.value as { priceId?: unknown };
  const planName = typeof priceId === "string" ? resolveStripePlan(priceId) : null;
  if (!planName || typeof priceId !== "string") {
    return privateJson({ error: "選択されたプランは利用できません。" }, 400);
  }

  let customerId: string | undefined;
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
  } catch {
    console.error("[stripe/checkout] customer mapping failed");
    return privateJson({ error: "決済の準備に失敗しました。時間をおいて再試行してください。" }, 503);
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
      metadata: { userId, planName },
      subscription_data: {
        metadata: { userId, planName },
      },
    });

    return privateJson({ url: checkoutSession.url });
  } catch {
    return privateJson({ error: "決済セッションの作成に失敗しました。" }, 502);
  }
}
