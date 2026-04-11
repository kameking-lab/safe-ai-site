import { NextResponse } from "next/server";
import Stripe from "stripe";

// 必要な環境変数:
//   STRIPE_SECRET_KEY        - Stripeシークレットキー
//   STRIPE_WEBHOOK_SECRET    - Stripeウェブフックシークレット (`stripe listen` で取得)

export const runtime = "nodejs";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2025-03-31.basil" });
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe未設定" }, { status: 503 });
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

  // イベント処理
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      // TODO(4-3): NextAuth連携後、session.customer_email でユーザーのサブスク状態を更新
      console.log("[stripe/webhook] checkout.session.completed:", session.id);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      // TODO(4-3): サブスク停止時にユーザーをフリープランに戻す
      console.log("[stripe/webhook] subscription.deleted:", sub.id);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      // TODO(4-4): 支払い失敗時にメール通知
      console.log("[stripe/webhook] invoice.payment_failed:", invoice.id);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
