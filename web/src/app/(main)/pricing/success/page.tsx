import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "お問い合わせ受付完了",
  description: "法人プランのお問い合わせを受け付けました。担当者より3営業日以内にご連絡します。",
  robots: { index: false, follow: false },
  openGraph: {
    title: "お問い合わせ受付完了｜ANZEN AI",
    description: "法人プランのお問い合わせを受け付けました。",
  },
};

export default function PricingSuccessPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle className="h-9 w-9 text-emerald-500" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-3">
        お問い合わせを受け付けました
      </h1>
      <p className="text-slate-600 text-sm leading-7 mb-8">
        法人プランへのお問い合わせを受け付けました。
        <br />
        担当者より原則3営業日以内にご連絡いたします。
        <br />
        β期間中は、下記リンクから全機能をそのままご利用いただけます。
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/chatbot"
          className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
        >
          AIチャットを使う
        </Link>
        <Link
          href="/exam-quiz"
          className="rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-white hover:bg-amber-600"
        >
          過去問クイズを解く
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          トップへ戻る
        </Link>
      </div>
    </main>
  );
}
