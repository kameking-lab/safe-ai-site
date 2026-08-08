// Stripe webhookイベント処理のヘルパー。
// prismaがnull（DATABASE_URL未設定）の場合は呼び出し側でskipする想定。

import type Stripe from "stripe";
import type { Prisma, PrismaClient } from "@prisma/client";
import { resolveStripePlan } from "@/lib/stripe-price-policy";

type StripeDb = PrismaClient | Prisma.TransactionClient;

// 最大3回、指数バックオフでリトライ（DBの一時障害に対応）
async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelayMs = 200,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** i));
      }
    }
  }
  throw lastErr;
}

function periodEnd(sub: Stripe.Subscription): Date | null {
  // Stripe APIバージョンによりcurrent_period_end位置が異なる可能性に対応
  const top = (sub as unknown as { current_period_end?: number }).current_period_end;
  if (typeof top === "number") return new Date(top * 1000);
  const item = sub.items?.data?.[0] as { current_period_end?: number } | undefined;
  if (item && typeof item.current_period_end === "number") {
    return new Date(item.current_period_end * 1000);
  }
  return null;
}

export async function handleCheckoutCompleted(
  prisma: StripeDb,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.metadata?.userId;
  if (!userId) {
    console.warn("[stripe/webhook] checkout.completed without userId metadata");
    return;
  }

  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  let priceId: string | null = null;
  let currentPeriodEnd: Date | null = null;

  if (subscriptionId) {
    try {
      const Stripe = (await import("stripe")).default;
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (stripeKey) {
        const stripe = new Stripe(stripeKey);
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        priceId = sub.items.data[0]?.price.id ?? null;
        currentPeriodEnd = periodEnd(sub);
      }
    } catch {
      console.error("[stripe/webhook] failed to retrieve subscription");
      throw new Error("Stripe subscription lookup failed");
    }
  }

  const planName = resolveStripePlan(priceId);
  if (!planName) throw new Error("unrecognized Stripe price");

  await withRetry(() =>
    prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId: customerId ?? null,
        stripeSubscriptionId: subscriptionId ?? null,
        stripePriceId: priceId,
        planName,
        status: "active",
        currentPeriodEnd,
      },
      update: {
        stripeCustomerId: customerId ?? undefined,
        stripeSubscriptionId: subscriptionId ?? undefined,
        stripePriceId: priceId ?? undefined,
        planName,
        status: "active",
        currentPeriodEnd: currentPeriodEnd ?? undefined,
      },
    }),
  );
}

export async function handleSubscriptionUpdated(
  prisma: StripeDb,
  sub: Stripe.Subscription,
): Promise<void> {
  const priceId = sub.items.data[0]?.price.id ?? null;
  const planName = resolveStripePlan(priceId);
  if (!planName) throw new Error("unrecognized Stripe price");
  const currentPeriodEnd = periodEnd(sub);

  const result = await withRetry(() =>
    prisma.subscription.updateMany({
      where: { stripeSubscriptionId: sub.id },
      data: {
        stripePriceId: priceId,
        planName,
        status: sub.status,
        currentPeriodEnd: currentPeriodEnd ?? undefined,
      },
    }),
  );

  // 自己修復: subscriptionIdで見つからない場合、customerId経由で紐付けを修正
  if (result.count === 0) {
    const customerId =
      typeof sub.customer === "string" ? sub.customer : (sub.customer as { id: string } | null)?.id ?? null;
    if (!customerId) {
      console.warn("[stripe/webhook] subscription not found and cannot recover");
      return;
    }
    const recovered = await withRetry(() =>
      prisma.subscription.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          stripeSubscriptionId: sub.id,
          stripePriceId: priceId,
          planName,
          status: sub.status,
          currentPeriodEnd: currentPeriodEnd ?? undefined,
        },
      }),
    );
    if (recovered.count === 0) {
      console.warn("[stripe/webhook] self-heal found no matching record");
    } else {
      console.info("[stripe/webhook] self-healed subscription mapping");
    }
  }
}

export async function handleSubscriptionDeleted(
  prisma: StripeDb,
  sub: Stripe.Subscription,
): Promise<void> {
  await withRetry(() =>
    prisma.subscription.updateMany({
      where: { stripeSubscriptionId: sub.id },
      data: {
        planName: "free",
        status: "canceled",
      },
    }),
  );
}

export async function handleInvoicePaymentFailed(
  prisma: StripeDb,
  invoice: Stripe.Invoice,
): Promise<void> {
  const subId =
    (invoice as unknown as { subscription?: string | { id: string } | null }).subscription;
  const stripeSubscriptionId = typeof subId === "string" ? subId : subId?.id;
  if (!stripeSubscriptionId) return;

  await withRetry(() =>
    prisma.subscription.updateMany({
      where: { stripeSubscriptionId },
      data: { status: "past_due" },
    }),
  );
}

// 支払い回復時にactive状態へ復元（past_due → active の自己修復）
export async function handleInvoicePaymentSucceeded(
  prisma: StripeDb,
  invoice: Stripe.Invoice,
): Promise<void> {
  const subId =
    (invoice as unknown as { subscription?: string | { id: string } | null }).subscription;
  const stripeSubscriptionId = typeof subId === "string" ? subId : subId?.id;
  if (!stripeSubscriptionId) return;

  await withRetry(() =>
    prisma.subscription.updateMany({
      where: { stripeSubscriptionId },
      data: { status: "active" },
    }),
  );
}
