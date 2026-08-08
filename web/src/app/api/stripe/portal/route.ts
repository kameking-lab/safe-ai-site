// Stripe Customer Portal セッション作成。
// プラン管理・解約・支払い方法変更をユーザー自身が行う窓口。
//
// 必要な環境変数:
//   STRIPE_SECRET_KEY    - Stripeシークレットキー
//   NEXT_PUBLIC_SITE_URL - return_url のベース

import Stripe from "stripe";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isPaidModeReady } from "@/lib/stripe-price-policy";
import { privateJson } from "@/lib/server/cloud-owner";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function POST() {
  if (!isPaidModeReady() || !prisma) {
    return privateJson(
      { error: "決済機能は現在ご利用いただけません。" },
      503,
    );
  }
  const stripe = getStripe();
  if (!stripe) {
    return privateJson(
      { error: "決済機能は現在ご利用いただけません。" },
      503,
    );
  }
  const session = await auth();
  if (!session?.user) {
    return privateJson({ error: "ログインが必要です" }, 401);
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return privateJson({ error: "ユーザーIDを取得できません" }, 401);
  }

  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub?.stripeCustomerId) {
    return privateJson(
      { error: "Stripeカスタマー情報がありません。先にプランへお申し込みください。" },
      400,
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${siteUrl}/account?portal_return=1`,
    });
    return privateJson({ url: portal.url });
  } catch {
    console.error("[stripe/portal] session creation failed");
    return privateJson(
      { error: "ポータルの準備に失敗しました。時間をおいて再試行してください。" },
      502,
    );
  }
}
