// Stripe Checkout Session作成エンドポイント。
// 認証必須。Stripe Customerを自動作成しSubscription.stripeCustomerIdへ紐付け。
//
// 必要な環境変数:
//   STRIPE_SECRET_KEY    - Stripeシークレットキー
//   NEXT_PUBLIC_SITE_URL - サイトのベースURL
//   DATABASE_URL         - 必須。未設定時は決済をfail-closed

import Stripe from "stripe";
import { createHash } from "node:crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isPaidModeReady, resolveStripePlan } from "@/lib/stripe-price-policy";
import { privateJson, readBoundedJson } from "@/lib/server/cloud-owner";
import { reservePurchase, billingDb, lockMember } from "@/lib/mobile/billing-service";
import { resumeStripeIntent } from "@/lib/mobile/stripe-purchase";
import { Prisma } from "@prisma/client";
import { safeReturnPath } from "@/lib/pro-start";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { timeout: 8_000, maxNetworkRetries: 0 });
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
  const body = parsed.value as { priceId?: unknown; plan?: unknown; returnTo?: unknown };
  const back = safeReturnPath(body.returnTo);
  const ledger = process.env.MOBILE_LEDGER_ENABLED === "true";
  const priceId = ledger && body.plan === "pro" ? process.env.STRIPE_ANZEN_PRO_MONTHLY_PRICE_ID : body.priceId;
  const planName = typeof priceId === "string" ? resolveStripePlan(priceId) : null;
  if (!planName || typeof priceId !== "string") {
    return privateJson({ error: "選択されたプランは利用できません。" }, 400);
  }

  // With the shared ledger on, iOS and web reserve against the same member,
  // preventing concurrent double checkout. Without it the legacy web flow stays as is.
  let purchaseIntentId: string | undefined;
  if (ledger) {
    if (priceId !== process.env.STRIPE_ANZEN_PRO_MONTHLY_PRICE_ID) {
      return privateJson({ error: "選択されたプランは利用できません。" }, 400);
    }
    try {
      purchaseIntentId = (await reservePurchase(userId, "stripe")).id;
    } catch (e) {
      const code = e instanceof Error ? e.message : "ENTITLEMENT_SYNC_PENDING";
      return privateJson({ error: { code } }, code === "ALREADY_SUBSCRIBED" || code === "PURCHASE_PENDING" ? 409 : 503);
    }
  }

  let customerId: string | undefined;
  try {
    customerId = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`stripe-member:${userId}`}, 0))`;
      const sub = await tx.subscription.findUnique({ where: { userId } });
      if (sub?.stripeCustomerId) {
        return sub.stripeCustomerId;
      }
      const idempotencyKey = createHash("sha256").update(`stripe-customer:${userId}`).digest("hex");
        const customer = await stripe.customers.create({
          email,
          name,
          metadata: { userId },
        }, { idempotencyKey });
        await tx.subscription.upsert({
          where: { userId },
          create: {
            userId,
            stripeCustomerId: customer.id,
            planName: "free",
            status: "active",
          },
          update: { stripeCustomerId: customer.id },
        });
      return customer.id;
    }, { maxWait: 5_000, timeout: 15_000 });
  } catch {
    console.error("[stripe/checkout] customer mapping failed");
    return privateJson({ error: "決済の準備に失敗しました。時間をおいて再試行してください。" }, 503);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  try {
    const parameters: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer: customerId,
      customer_email: customerId ? undefined : email,
      // 支払い後は元の画面へ戻す（/pricing/success が権利を確定してから転送する）。
      success_url: `${siteUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}${back ? `&returnTo=${encodeURIComponent(back)}` : ""}`,
      cancel_url: `${siteUrl}${back ?? "/pricing"}`,
      locale: "ja",
      custom_text: { submit: { message: "1か月ごとの自動更新です。解約はマイページの「プラン管理」からいつでもできます。" } },
      metadata: { userId, planName, ...(purchaseIntentId ? { purchaseIntentId } : {}) },
      subscription_data: {
        metadata: { userId, planName, ...(purchaseIntentId ? { purchaseIntentId } : {}) },
      },
    };
    if (!purchaseIntentId) {
      const checkoutSession = await stripe.checkout.sessions.create(parameters);
      return privateJson({ url: checkoutSession.url });
    }
    // Commit exact creation parameters BEFORE calling Stripe. Retries after a crash reuse them.
    await billingDb().$transaction(async (tx) => {
      await lockMember(tx, userId);
      const intent = await tx.mobilePurchaseIntent.findUnique({ where: { userId } });
      if (!intent || intent.id !== purchaseIntentId || intent.status !== "pending" || intent.source !== "stripe") throw new Error("PURCHASE_PENDING");
      if (!intent.providerRequest) {
        await tx.mobilePurchaseIntent.update({ where: { userId }, data: { stage: "creating", providerRequest: parameters as unknown as Prisma.InputJsonValue } });
      }
    });
    const result = await billingDb().$transaction(async (tx) => {
      await lockMember(tx, userId);
      const intent = await tx.mobilePurchaseIntent.findUnique({ where: { userId } });
      if (!intent || intent.id !== purchaseIntentId || intent.status !== "pending" || intent.source !== "stripe") throw new Error("PURCHASE_PENDING");
      return resumeStripeIntent(tx, intent);
    }, { timeout: 20_000 });
    return privateJson(result, result.state === "open" ? 200 : 409);
  } catch {
    return privateJson({ error: "決済セッションの作成に失敗しました。" }, 502);
  }
}
