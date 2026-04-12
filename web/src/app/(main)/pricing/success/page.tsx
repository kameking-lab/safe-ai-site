import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "お申し込み完了",
  description: "プレミアムプランへのお申し込みが完了しました。",
  openGraph: {
    title: "お申し込み完了｜ANZEN AI",
    description: "プレミアムプランへのお申し込みが完了しました。",
  },
};

export default function PricingSuccessPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle className="h-9 w-9 text-emerald-500" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-3">
        お申し込みありがとうございます！
      </h1>
      <p className="text-slate-600 text-sm leading-7 mb-8">
        ご登録のメールアドレスに領収書をお送りしました。
        <br />
        プレミアム機能がすぐにご利用いただけます。
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
