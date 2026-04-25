// Stripe webhookイベント処理のヘルパー。
// prismaがnull（DATABASE_URL未設定）の場合は呼び出し側でskipする想定。

import type Stripe from "stripe";
import type { PrismaClient } from "@prisma/client";

function priceToPlanName(priceId: string | null | undefined): string {
  if (!priceId) return "free";
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM) return "standard";
  return "standard";
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
  prisma: PrismaClient,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.metadata?.userId;
  if (!userId) {
    console.warn("[stripe/webhook] checkout.completed without userId metadata", session.id);
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
    } catch (err) {
      console.error("[stripe/webhook] failed to retrieve subscription", err);
    }
  }

  const planName = priceToPlanName(priceId);

  await prisma.subscription.upsert({
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
  });
}

export async function handleSubscriptionUpdated(
  prisma: PrismaClient,
  sub: Stripe.Subscription,
): Promise<void> {
  const priceId = sub.items.data[0]?.price.id ?? null;
  const planName = priceToPlanName(priceId);
  const currentPeriodEnd = periodEnd(sub);

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: sub.id },
    data: {
      stripePriceId: priceId,
      planName,
      status: sub.status,
      currentPeriodEnd: currentPeriodEnd ?? undefined,
    },
  });
}

export async function handleSubscriptionDeleted(
  prisma: PrismaClient,
  sub: Stripe.Subscription,
): Promise<void> {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: sub.id },
    data: {
      planName: "free",
      status: "canceled",
    },
  });
}

export async function handleInvoicePaymentFailed(
  prisma: PrismaClient,
  invoice: Stripe.Invoice,
): Promise<void> {
  const subId =
    (invoice as unknown as { subscription?: string | { id: string } | null }).subscription;
  const stripeSubscriptionId = typeof subId === "string" ? subId : subId?.id;
  if (!stripeSubscriptionId) return;

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId },
    data: { status: "past_due" },
  });
}
