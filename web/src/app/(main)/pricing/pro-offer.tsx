import Link from "next/link";
import { PageContainer } from "@/components/layout";
import { FREE_DAILY_CHAT, PRO_DAILY_CHAT, PRO_MONTHLY_PRICE_YEN } from "@/lib/pro-start";
import { proSalesStatus } from "@/lib/mobile/pro-sales-gate";
import { connection } from "next/server";
import { auth } from '@/auth';
import { getEntitlement } from '@/lib/mobile/billing-service';
import { prisma } from '@/lib/prisma';
import { projectEntitlement } from '@/lib/mobile/entitlement';

/** 料金ページ。主ボタンは1つ。条件は1行だけで、詳細は /pricing/terms。 */
export async function ProOffer() {
  await connection();
  const [session,sales]=await Promise.all([
    auth({identityOnly:true}),
    proSalesStatus().catch(()=>({paused:true,message:'Proの受付状況を確認できません。時間をおいてお試しください。'})),
  ]);
  const userId=(session?.user as {id?:string}|undefined)?.id;
  const rights=userId?await (process.env.MOBILE_LEDGER_ENABLED==='true'?getEntitlement(userId):
    prisma?prisma.subscription.findUnique({where:{userId}}).then(sub=>projectEntitlement('',sub,[])):Promise.reject(new Error('UNAVAILABLE'))).catch(()=>null):null;
  const paid=rights?.plan==='pro';
  const unavailable=!!userId&&(!rights || rights.syncState!=='verified'&&!paid);
  return (
    <PageContainer width="narrow" className="py-10 sm:py-14">
      <div className="mx-auto max-w-md rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">安全AI Pro</h1>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          法令AIチャットが1日{PRO_DAILY_CHAT}回（無料は1日{FREE_DAILY_CHAT}回）。アプリでは警報10地点と通知も。ウェブとアプリで共通です。
        </p>
        {paid?<p role="status" className="mt-5 font-semibold">安全AI Pro を利用中です。</p>:unavailable?<p role="status" className="mt-5 text-sm">購入状況を確認できません。時間をおいてもう一度お試しください。</p>:sales.paused?<p role="status" className="mt-5 rounded-xl bg-slate-100 p-4 text-sm font-semibold text-slate-800">{sales.message}</p>:<Link
          href="/pricing/start"
          data-pro-start=""
          className="mt-5 flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 text-base font-bold text-white hover:bg-emerald-700"
        >
          月額{PRO_MONTHLY_PRICE_YEN.toLocaleString("ja-JP")}円で続ける
        </Link>}
        <p className="mt-2 text-[11px] leading-4 text-slate-500">
          1か月ごとの自動更新・いつでも解約できます。
          <Link href="/pricing/terms" className="underline">条件・特商法表示</Link>・
          <Link href="/terms" className="underline">利用規約</Link>
        </p>
        {!paid&&!unavailable?<p className="mt-1 text-[11px] leading-4 text-slate-500">アプリで購入済みの方は、購入したときと同じ方法（Google / Apple）でログインしてください。</p>:null}
      </div>
    </PageContainer>
  );
}
