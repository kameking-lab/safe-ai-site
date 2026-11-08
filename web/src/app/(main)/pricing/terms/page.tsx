import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout";
import { FREE_DAILY_CHAT, PRO_DAILY_CHAT, PRO_MONTHLY_PRICE_YEN } from "@/lib/pro-start";

export const metadata: Metadata = {
  title: "安全AI Pro の条件・特定商取引法に基づく表示",
  robots: { index: false, follow: true },
  alternates: { canonical: "/pricing/terms" },
};

export default function ProTermsPage() {
  const price = PRO_MONTHLY_PRICE_YEN.toLocaleString("ja-JP");
  return (
    <PageContainer width="narrow" className="py-10">
      <h1 className="text-2xl font-bold text-slate-900">安全AI Pro の条件・特定商取引法に基づく表示</h1>
      <dl className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-800">
        <div><dt className="font-semibold">販売価格</dt><dd>月額{price}円（税込）。1か月ごとの自動更新。</dd></div>
        <div><dt className="font-semibold">内容</dt><dd>法令AIチャットを1日{PRO_DAILY_CHAT}回まで（無料は1日{FREE_DAILY_CHAT}回、日本時間0時に回復）。アプリでは気象警報の登録10地点と通知。ウェブとアプリで同じ会員として使えます。資料の閲覧・検索は無料のままです。</dd></div>
        <div><dt className="font-semibold">支払方法・時期</dt><dd>ウェブはクレジットカード等（Stripe）、アプリは App Store。申込時と毎月の更新日に請求します。</dd></div>
        <div><dt className="font-semibold">提供時期</dt><dd>支払確認後すぐに使えます。</dd></div>
        <div><dt className="font-semibold">解約</dt><dd>ウェブ購入はマイページの「プラン管理」、アプリ購入は iPhone の設定（Apple Account → サブスクリプション）からいつでも解約できます。解約後も支払済みの期間の終わりまで使えます。</dd></div>
        <div><dt className="font-semibold">返金</dt><dd>日割りの返金はありません。重複請求・誤請求や当方の障害で使えなかった場合は個別に確認して返金します。App Store での購入の返金は Apple の手続きによります。</dd></div>
        <div><dt className="font-semibold">販売者・連絡先</dt><dd>販売者の氏名・住所・電話番号は、ご請求があれば遅滞なく開示します（請求先: <Link href="/contact" className="underline">お問い合わせ</Link>）。</dd></div>
      </dl>
      <nav className="mt-6 flex flex-wrap gap-4 text-sm">
        <Link className="underline" href="/pricing">料金</Link>
        <Link className="underline" href="/terms">利用規約</Link>
        <Link className="underline" href="/privacy">プライバシーポリシー</Link>
      </nav>
    </PageContainer>
  );
}
