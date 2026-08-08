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
          quarantine・人手確認待ち
        </p>
        <h1 className="mt-4 text-2xl font-bold text-slate-950 sm:text-3xl">
          FAQは一次資料の再検証中です
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          旧FAQには、法令番号、資格試験、教育区分、適用条件の誤りが含まれていました。
          個別修正だけでは見逃しを防げないため、全件を検索、構造化データ、サイトマップから除外しています。
          「見つからない」ことを、義務なし・資格不要という意味では扱いません。
        </p>
      </header>

      <section
        aria-labelledby="faq-reopen"
        className="mt-6 rounded-2xl border-2 border-amber-400 bg-amber-50 p-5"
      >
        <h2 id="faq-reopen" className="text-lg font-bold text-amber-950">
          再公開の条件
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-amber-950">
          <li>質問ごとに一次資料URL、文書番号、対象時点を確認する</li>
          <li>法令、通達、指針、サイト解説を分離する</li>
          <li>必要条件が不足する場合は判定不能とする</li>
          <li>人手確認済みの回答だけをallowlistで公開する</li>
        </ul>
      </section>

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
