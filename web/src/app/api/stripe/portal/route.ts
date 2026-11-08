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

const MANAGE_ONLY_TAG = "anzen-pro-manage-only-v1";
/**
 * 契約管理（解約・支払方法・請求書）だけを許す Customer Portal 設定。プラン変更は不可にして、
 * 旧料金の価格へ切り替えられないようにする。環境変数で指定が無ければ、同じ印の設定を
 * Stripe から探し、無ければ1つ作る（オーナーが管理画面で ID を拾う作業を無くす）。
 */
async function manageOnlyPortalConfiguration(stripe: Stripe, siteUrl: string): Promise<string> {
  const existing = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
  const found = existing.data.find((c) => c.metadata?.purpose === MANAGE_ONLY_TAG);
  if (found) return found.id;
  const created = await stripe.billingPortal.configurations.create({
    business_profile: { headline: "安全AI Pro の契約管理", privacy_policy_url: `${siteUrl}/privacy`, terms_of_service_url: `${siteUrl}/terms` },
    features: {
      subscription_cancel: { enabled: true, mode: "at_period_end" },
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      customer_update: { enabled: false },
      subscription_update: { enabled: false },
    },
    metadata: { purpose: MANAGE_ONLY_TAG },
  });
  return created.id;
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
  let nativeManagementConfiguration=process.env.STRIPE_MANAGE_ONLY_PORTAL_CONFIGURATION_ID;
  if(process.env.MOBILE_LEDGER_ENABLED==='true' && !nativeManagementConfiguration){
    try{nativeManagementConfiguration=await manageOnlyPortalConfiguration(stripe,siteUrl);}
    catch{return privateJson({error:'購読管理の設定を確認できません。'},503);}
  }
  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${siteUrl}/account?portal_return=1`,
      ...(process.env.MOBILE_LEDGER_ENABLED==='true'?{configuration:nativeManagementConfiguration}:{}),
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
