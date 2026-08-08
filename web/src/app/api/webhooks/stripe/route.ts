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
import { sharedRateLimitGuard } from "@/lib/security/shared-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_WEBHOOK_BYTES = 1024 * 1024;

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function GET() {
  return json({ error: "Method Not Allowed" }, 405);
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return json({ error: "Stripe未設定" }, 503);
  }
  if (!prisma) {
    return json({ error: "Database not configured" }, 503);
  }
  const limited = await sharedRateLimitGuard(req, {
    routeKey: "stripe-webhook",
    limit: 600,
    windowMs: 10 * 60 * 1_000,
  });
  if (limited) return limited;

  const declaredSize = Number(req.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_WEBHOOK_BYTES) {
    return json({ error: "payload too large" }, 413);
  }
  const body = await req.text();
  if (new TextEncoder().encode(body).byteLength > MAX_WEBHOOK_BYTES) {
    return json({ error: "payload too large" }, 413);
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return json({ error: "署名なし" }, 400);
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return json({ error: "署名検証失敗" }, 400);
  }

  // 冪等性チェック: 同じイベントIDが既に処理済みならスキップ
  try {
    const existing = await prisma.stripeEvent.findUnique({
      where: { stripeEventId: event.id },
    });
    if (existing) {
      return json({ received: true, idempotent: true });
    }
  } catch {
    // 冪等性を確認できない状態で副作用を実行しない。
    console.error("[stripe/webhook] idempotency check unavailable");
    return json({ error: "temporarily unavailable" }, 503);
  }

  try {
    // イベント記録と副作用を同じトランザクションへ入れ、並行配送でも
    // unique制約に負けた側の更新をロールバックする。
    await prisma.$transaction(
      async (tx) => {
        switch (event.type) {
          case "checkout.session.completed":
            await handleCheckoutCompleted(tx, event.data.object as Stripe.Checkout.Session);
            break;
          case "customer.subscription.created":
          case "customer.subscription.updated":
            await handleSubscriptionUpdated(tx, event.data.object as Stripe.Subscription);
            break;
          case "customer.subscription.deleted":
            await handleSubscriptionDeleted(tx, event.data.object as Stripe.Subscription);
            break;
          case "invoice.payment_failed":
            await handleInvoicePaymentFailed(tx, event.data.object as Stripe.Invoice);
            break;
          case "invoice.payment_succeeded":
            await handleInvoicePaymentSucceeded(tx, event.data.object as Stripe.Invoice);
            break;
          default:
            break;
        }
        await tx.stripeEvent.create({
          data: { stripeEventId: event.id, eventType: event.type },
        });
      },
      { maxWait: 5_000, timeout: 15_000 },
    );
  } catch (err) {
    // unique競合は、別トランザクションが同じイベントを完了済み。
    const code = (err as { code?: string }).code;
    if (code === "P2002") return json({ received: true, idempotent: true });
    console.error("[stripe/webhook] processing failed", { eventType: event.type });
    return json({ error: "temporarily unavailable" }, 503);
  }

  return json({ received: true });
}
