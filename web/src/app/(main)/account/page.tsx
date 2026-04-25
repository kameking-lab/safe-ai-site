import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ManagePlanButton } from "./manage-plan-button";

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

const STATUS_LABEL: Record<string, string> = {
  active: "利用中",
  past_due: "支払い遅延",
  canceled: "解約済み",
  unpaid: "未払い",
};

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin?callbackUrl=%2Faccount");
  }

  const userId = (session.user as { id?: string }).id;
  let planName = "free";
  let status = "active";
  let currentPeriodEnd: Date | null = null;
  let hasStripeCustomer = false;
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
    }
  }

  const planLabel = PLAN_LABEL[planName] ?? planName;
  const statusLabel = STATUS_LABEL[status] ?? status;
  const isFree = planName === "free";

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">マイページ</h1>
      <p className="mt-2 text-sm text-slate-500">{session.user.email}</p>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-800">現在のプラン</h2>
        <div className="mt-4 flex items-baseline gap-3">
          <span className="text-3xl font-bold text-slate-900">{planLabel}</span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              status === "active"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {statusLabel}
          </span>
        </div>
        {currentPeriodEnd && (
          <p className="mt-3 text-xs text-slate-500">
            次回更新日：{currentPeriodEnd.toLocaleDateString("ja-JP")}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {hasStripeCustomer ? (
            <ManagePlanButton />
          ) : (
            <Link
              href="/pricing"
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
            >
              プランをアップグレード
            </Link>
          )}
          {isFree && hasStripeCustomer && (
            <Link
              href="/pricing"
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              他のプランを見る
            </Link>
          )}
        </div>

        {!prisma && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
            データベース未設定のため、プラン情報を読み込めませんでした。
          </p>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-800">SDS検索＋RA履歴</h2>
          <Link
            href="/chemical-ra/product-search"
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            新規検索 →
          </Link>
        </div>
        {sdsHistory.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500">
            まだ履歴がありません。製品検索＋自動RAを実行すると、ここに最新10件が表示されます。
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {sdsHistory.map((h) => (
              <li key={h.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{h.productName}</p>
                  <p className="text-[11px] text-slate-500">
                    {new Date(h.createdAt).toLocaleString("ja-JP")}
                  </p>
                </div>
                {h.riskLevel && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                    {h.riskLevel}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-6 text-xs leading-6 text-slate-600">
        <p className="font-semibold text-slate-700">プラン管理について</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>プラン変更・解約・支払い方法の更新は「プラン管理」から行えます。</li>
          <li>解約後は当該請求期間の終了まで機能をご利用いただけます。</li>
          <li>領収書・請求履歴もプラン管理から確認できます。</li>
        </ul>
      </section>
    </main>
  );
}
