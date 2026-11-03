import { AccountSdsHistory } from "@/components/account-sds-history";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ManagePlanButton } from "./manage-plan-button";
import { PageContainer } from "@/components/layout";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { computeAccountConclusion } from "@/lib/account-conclusion";
import { getEntitlement } from '@/lib/mobile/billing-service';

import { PageJsonLd } from "@/components/page-json-ld";
export const metadata: Metadata = {
  title: "マイページ",
  description: "プラン状況と契約管理",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PLAN_LABEL: Record<string, string> = {
  free: "フリー",
  standard: "スタンダード",
  pro: "プロ",
};

interface Props {
  searchParams: Promise<{ portal_return?: string }>;
}

export default async function AccountPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=%2Faccount");
  }

  const { portal_return } = await searchParams;

  const userId = (session.user as { id?: string }).id;
  let planName = "free";
  let status = "active";
  let currentPeriodEnd: Date | null = null;
  let hasStripeCustomer = false;
  let appStoreMember = false;
  let subscriptionLookupFailed = false;
  let sdsHistoryFailed = false;
  let sdsHistory: Array<{
    id: string;
    productName: string;
    riskLevel: string | null;
    createdAt: Date;
  }> = [];

  if (prisma && userId) {
    try {
      const sub = await prisma.subscription.findUnique({ where: { userId } });
      if (sub) {
        planName = sub.planName;
        status = sub.status;
        currentPeriodEnd = sub.currentPeriodEnd;
        hasStripeCustomer = Boolean(sub.stripeCustomerId);
      }
    } catch (err) {
      console.error("[account] subscription lookup failed", err);
      subscriptionLookupFailed = true;
    }
    try {
      const rows = await prisma.sdsSearch.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, productName: true, riskLevel: true, createdAt: true },
      });
      sdsHistory = rows;
    } catch (err) {
      console.error("[account] sds history lookup failed", err);
      sdsHistoryFailed = true;
    }
  }

  if (userId && process.env.MOBILE_LEDGER_ENABLED === 'true') {
    try {const rights=await getEntitlement(userId);planName=rights.plan;appStoreMember=rights.source==='app_store';if(rights.expiresAt)currentPeriodEnd=new Date(rights.expiresAt);if(rights.syncState!=='verified')subscriptionLookupFailed=true;}
    catch {subscriptionLookupFailed=true;}
  }
  const planLabel = PLAN_LABEL[planName] ?? planName;
  const isFree = planName === "free";
  const isCanceled = status === "canceled";

  // 期間終了日の表示ラベル
  const periodEndLabel = currentPeriodEnd
    ? currentPeriodEnd.toLocaleDateString("ja-JP")
    : null;

  // 結論カードの1状態に集約（灰=確認失敗 > 赤=支払い要対応 > 黄=解約済み > 青=フリー > 緑=利用中）
  const conclusion = computeAccountConclusion({
    planName,
    status,
    periodEndLabel,
    lookupFailed: subscriptionLookupFailed,
  });

  return (
    <PageContainer width="narrow" paddingY="none" className="py-8">
      {/* SEO: WebPage + BreadcrumbList */}
      <PageJsonLd name="マイページ" description="プラン状況と契約管理" path="/account" />
      <h1 className="text-2xl font-bold text-slate-900">マイページ</h1>
      <p className="mt-2 text-sm text-slate-500">{session.user.email}</p>

      {/* ポータル返遷成功バナー（一時的な確認メッセージ・状態カードとは別枠） */}
      {portal_return === "1" && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          プラン情報を更新しました。反映まで数分かかる場合があります。
        </div>
      )}

      <ConclusionCard
        tone={conclusion.tone}
        value={planLabel}
        title={conclusion.title}
        description={conclusion.description}
        action={
          !subscriptionLookupFailed && !hasStripeCustomer && !appStoreMember
            ? { href: "/pricing", label: "プランをアップグレード" }
            : undefined
        }
        className="mt-8"
      >
        {appStoreMember ? <a href="https://apps.apple.com/account/subscriptions" className="inline-flex min-h-11 items-center underline">App Storeの購読管理・解約</a> : null}
        {hasStripeCustomer && (
          <>
            <ManagePlanButton />
            {/* フリープランまたは解約済みでStripe顧客あり → アップグレード誘導 */}
            {(isFree || isCanceled) && (
              <Link
                href="/pricing"
                className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {isCanceled ? "再加入する" : "他のプランを見る"}
              </Link>
            )}
          </>
        )}
      </ConclusionCard>

      {!prisma && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
          データベース未設定のため、プラン情報を読み込めませんでした。
        </p>
      )}

      <AccountSdsHistory sdsHistory={sdsHistory} sdsHistoryFailed={sdsHistoryFailed}/>

      <section className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-6 text-xs leading-6 text-slate-600">
        <p className="font-semibold text-slate-700">プラン管理について</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>プラン変更・解約・支払い方法の更新は「プラン管理」から行えます。</li>
          <li>解約後は当該請求期間の終了まで機能をご利用いただけます。</li>
          <li>領収書・請求履歴もプラン管理から確認できます。</li>
          <li>再加入時は以前の顧客情報が引き継がれます。</li>
        </ul>
      </section>
    </PageContainer>
  );
}
