// Stripe Customer Portal セッション作成。
// プラン管理・解約・支払い方法変更をユーザー自身が行う窓口。
//
// 必要な環境変数:
//   STRIPE_SECRET_KEY    - Stripeシークレットキー
//   NEXT_PUBLIC_SITE_URL - return_url のベース

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function POST() {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "決済機能未設定" }, { status: 503 });
  }
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
  if (!prisma) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "ユーザーIDを取得できません" }, { status: 401 });
  }

  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub?.stripeCustomerId) {
    return NextResponse.json(
      { error: "Stripeカスタマー情報がありません。先にプランへお申し込みください。" },
      { status: 400 },
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${siteUrl}/account`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ポータルURL生成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
