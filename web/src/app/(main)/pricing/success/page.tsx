import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { billingDb, getEntitlement, lockMember } from "@/lib/mobile/billing-service";
import { resumeStripeIntent } from "@/lib/mobile/stripe-purchase";
import { safeReturnPath } from "@/lib/pro-sales";

export const metadata: Metadata = { title: "決済完了", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ session_id?: string; returnTo?: string; n?: string }>;
}

/**
 * Stripe から戻った所。Webhook を待たずに、この会員の決済セッションを Stripe に直接
 * 問い合わせて権利を確定し、Pro になっていれば元の画面へそのまま戻す。
 */
async function confirm(userId: string): Promise<"pro" | "free" | "unknown"> {
  try {
    await billingDb().$transaction(async (tx) => {
      await lockMember(tx, userId);
      const intent = await tx.mobilePurchaseIntent.findUnique({ where: { userId } });
      if (intent && intent.status === "pending" && intent.source === "stripe" && intent.providerSessionId) {
        await resumeStripeIntent(tx, intent);
      }
    }, { timeout: 20_000 });
  } catch {
    // Webhook 側でも確定する。ここでは表示のための確認だけ。
  }
  try {
    return (await getEntitlement(userId)).plan;
  } catch {
    return "unknown";
  }
}

export default async function PricingSuccessPage({ searchParams }: Props) {
  const { returnTo, n } = await searchParams;
  const back = safeReturnPath(returnTo);
  const session = await auth({identityOnly:true});
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect(`/auth/signin?callbackUrl=${encodeURIComponent("/account")}`);
  const plan = await confirm(userId);
  if (plan === "pro") redirect(back ?? "/chatbot");
  const tries = Math.min(Number(n) || 0, 10);
  const next = `/pricing/success?n=${tries + 1}${back ? `&returnTo=${encodeURIComponent(back)}` : ""}`;
  return (
    <div className="mx-auto max-w-md px-4 py-14 text-center" aria-live="polite">
      {tries < 10 ? <meta httpEquiv="refresh" content={`3;url=${next}`} /> : null}
      <h1 className="text-xl font-bold text-slate-900">お支払いを確認しています…</h1>
      <p className="mt-3 text-sm text-slate-600">
        {tries < 10
          ? "数秒で自動的に元の画面へ戻ります。"
          : "確認に時間がかかっています。マイページで状態をご確認ください。二重に支払う必要はありません。"}
      </p>
      <Link href="/account" className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-5 text-sm font-semibold">
        マイページ
      </Link>
    </div>
  );
}
