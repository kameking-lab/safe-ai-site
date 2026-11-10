import Link from "next/link";
import { getEntitlement } from "@/lib/mobile/billing-service";
import { PRO_MONTHLY_PRICE_YEN, proStartHref } from "@/lib/pro-start";
import { ManagePlanButton } from "./manage-plan-button";
import { prisma } from "@/lib/prisma";

/** 安全AI Pro の状態（ウェブ・アプリ共通の台帳から）。無料なら主ボタン1つだけ。 */
export async function ProMembership({ userId }: { userId: string }) {
  // Contract management must survive a failed entitlement refresh or paused new sales.
  const subscription = await prisma?.subscription.findUnique({where:{userId},select:{stripeCustomerId:true}});
  const management = subscription?.stripeCustomerId ? <div className="mt-4"><ManagePlanButton /></div> : null;
  let rights: Awaited<ReturnType<typeof getEntitlement>> | null = null;
  try {
    rights = await getEntitlement(userId);
  } catch {
    rights = null;
  }
  if (!rights || rights.syncState !== "verified") {
    return (
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
        <p className="font-semibold">会員の権利を確認できませんでした。</p>
        <p className="mt-1">二重請求を避けるため購入は止めています。時間をおいて再読み込みしてください。</p>
        {management}
      </section>
    );
  }
  if (rights.plan === "pro") {
    const until = rights.expiresAt ? new Date(rights.expiresAt).toLocaleDateString("ja-JP") : null;
    return (
      <section className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-slate-800">
        <p className="text-lg font-bold">安全AI Pro</p>
        {until ? <p className="mt-1">次回更新・有効期限：{until}</p> : null}
        {rights.source === "stripe" ? (
          management
        ) : (
          <p className="mt-3">App Store で購読中です。解約は iPhone の設定（Apple Account → サブスクリプション）から行えます。</p>
        )}
      </section>
    );
  }
  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-800">
      <p className="text-lg font-bold">無料会員</p>
      {management}
      <Link
        href={proStartHref("/account")}
        data-pro-start=""
        className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 text-base font-bold text-white hover:bg-emerald-700"
      >
        月額{PRO_MONTHLY_PRICE_YEN.toLocaleString("ja-JP")}円で続ける
      </Link>
      <p className="mt-2 text-[11px] leading-4 text-slate-500">
        法令AIチャット1日50回・自動更新・いつでも解約。<Link href="/pricing/terms" className="underline">条件・特商法表示</Link>
      </p>
    </section>
  );
}
