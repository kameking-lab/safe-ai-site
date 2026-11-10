import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ExternalLink } from "lucide-react";

const TITLE = "労働安全衛生FAQの検証状況";
const DESCRIPTION =
  "旧FAQは、法令番号・資格・教育条件の一次資料照合が終わるまで公開停止しています。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/faq" },
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
};

export default function FAQHubPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <header>
        <p className="inline-flex items-center gap-2 rounded-full border border-amber-400 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-950">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          公開停止中
        </p>
        <h1 className="mt-4 text-2xl font-bold text-slate-950 sm:text-3xl">
          FAQは一次資料の再検証中です
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          法令番号や資格・教育の条件を再確認するため、FAQの公開を停止しています。
          法令や資格・教育の条件は、下のリンクから確認してください。
        </p>
      </header>

      <section className="mt-8" aria-labelledby="faq-alternatives">
        <h2 id="faq-alternatives" className="text-xl font-bold text-slate-950">
          代わりに利用できる確認経路
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            href="/law-search"
            className="flex min-h-14 items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900"
          >
            サイト内の法令検索
            <span aria-hidden="true">→</span>
          </Link>
          <Link
            href="/qualifications"
            className="flex min-h-14 items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900"
          >
            資格・教育の条件確認
            <span aria-hidden="true">→</span>
          </Link>
          <a
            href="https://elaws.e-gov.go.jp/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900"
          >
            e-Gov法令検索
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
          <Link
            href="/about/quality"
            className="flex min-h-14 items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900"
          >
            品質・訂正方針
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
