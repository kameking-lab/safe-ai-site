/* eslint-disable @next/next/no-html-link-for-pages -- Safety-learning entries intentionally use document navigation so the public offline cache receives HTML. */
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink, ShieldCheck } from "lucide-react";
import { JsonLd, breadcrumbSchema, webPageSchema } from "@/components/json-ld";
import { PageContainer } from "@/components/layout";
import { UsageNotesLink } from "@/components/usage-notes-link";
import { SITE_URL } from "@/lib/seo-metadata";

const TITLE = "安全衛生Eラーニング";
const DESCRIPTION =
  "第一種・第二種衛生管理者、労働安全・労働衛生コンサルタントの根拠付き問題演習、5分KYT、公式教育情報を利用できます。学習履歴は保存しません。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/e-learning" },
  robots: { index: false, follow: true },
};

export default function ELearningPage() {
  const url = `${SITE_URL}/e-learning`;

  return (
    <PageContainer width="wide">
      <JsonLd
        schema={[
          webPageSchema({ name: TITLE, description: DESCRIPTION, url }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: TITLE, url },
          ]),
        ]}
      />
      <header>
        <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          安全衛生Eラーニング
        </h1>
        <p data-page-description className="mt-2 text-sm leading-6 text-slate-700">
          安全資格の根拠付き問題演習、5分KYT、資格検索、厚生労働省の教育情報を利用できます。回答・学習時間・長期進捗は保存しません。
        </p>
        <nav aria-label="学習メニュー" className="mt-5 flex flex-wrap gap-3">
          <a
            href="/e-learning/safety"
            data-primary-action="true"
            className="inline-flex min-h-11 items-center rounded-xl bg-emerald-800 px-5 py-3 text-sm font-black text-white"
          >
            安全資格の問題演習を始める
          </a>
          <Link
            href="/education-certification/finder"
            prefetch={false}
            data-secondary-action="true"
            className="inline-flex min-h-11 items-center text-sm font-bold text-brand-primary underline underline-offset-4"
          >
            必要な資格・教育を探す
          </Link>
          <a
            href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/anzen/anzeneisei05.html"
            target="_blank"
            rel="noopener noreferrer"
            data-secondary-action="true"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-primary underline underline-offset-4"
          >
            厚生労働省の教育情報
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </nav>
        <UsageNotesLink className="mt-2 text-brand-primary" />
      </header>
      <section
        aria-labelledby="safety-qualification-learning-title"
        className="mt-8 rounded-3xl border-2 border-emerald-800 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-50 forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText] sm:p-7"
      >
        <ShieldCheck className="h-8 w-8" aria-hidden="true" />
        <h2 id="safety-qualification-learning-title" className="mt-3 text-2xl font-black">
          安全資格・一次根拠付き問題演習
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-7">
          協会問題を転載せず、e-Gov法令などの一次情報から作成した独自問題です。誤答を含む全選択肢に根拠リンクがあり、間違えた問題は正答するまでやり直せます。
        </p>
        <a
          href="/e-learning/safety"
          className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 font-black text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 forced-colors:border-2 forced-colors:border-[LinkText] forced-colors:bg-[Canvas] forced-colors:text-[LinkText]"
        >
          4コースを見る
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </a>
      </section>
      <section
        aria-labelledby="visual-ky-learning-title"
        className="mt-6 rounded-3xl border border-slate-300 bg-white p-5 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 sm:p-7"
      >
        <h2 id="visual-ky-learning-title" className="text-xl font-black">
          5分KYTも利用できます
        </h2>
        <p className="mt-2 text-sm leading-7">
          現場の危険ポイントを、短いケースで確認できます。学習時間や長期進捗は記録しません。
        </p>
        <Link
          href="/training/visual-ky"
          prefetch={false}
          className="mt-3 inline-flex min-h-11 items-center font-bold text-brand-primary underline underline-offset-4"
        >
          5分KYTを開く
        </Link>
      </section>
    </PageContainer>
  );
}
