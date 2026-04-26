// Stripe Webhook統合エンドポイント。署名検証→冪等性チェック→DB同期。
// 必要な環境変数:
//   STRIPE_SECRET_KEY        - Stripeシークレットキー
//   STRIPE_WEBHOOK_SECRET    - エンドポイントの署名シークレット
//   DATABASE_URL             - 省略可。未設定時は503

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import {
  handleCheckoutCompleted,
  handleInvoicePaymentFailed,
  handleInvoicePaymentSucceeded,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from "@/lib/stripe-webhook-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe未設定" }, { status: 503 });
  }
  if (!prisma) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "署名なし" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "署名検証失敗";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // 冪等性チェック: 同じイベントIDが既に処理済みならスキップ
  try {
    const existing = await prisma.stripeEvent.findUnique({
      where: { stripeEventId: event.id },
    });
    if (existing) {
      return NextResponse.json({ received: true, idempotent: true });
    }
  } catch (err) {
    // StripeEventテーブルが未作成の場合は警告のみ（DB push前）
    console.warn("[stripe/webhook] idempotency check failed (table not ready?)", err);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(prisma, event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(prisma, event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(prisma, event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(prisma, event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(prisma, event.data.object as Stripe.Invoice);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error("[stripe/webhook] handler error:", event.type, err);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  // 処理済みイベントIDを記録（冪等性保証）
  try {
    await prisma.stripeEvent.create({
      data: { stripeEventId: event.id, eventType: event.type },
    });
  } catch (err) {
    // 重複INSERT（競合）は無視、その他は警告
    const code = (err as { code?: string }).code;
    if (code !== "P2002") {
      console.warn("[stripe/webhook] failed to record event id", event.id, err);
    }
  }

  return NextResponse.json({ received: true });
}
