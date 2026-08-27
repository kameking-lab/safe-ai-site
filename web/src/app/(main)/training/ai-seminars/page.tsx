import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileDown,
  Headphones,
  Presentation,
  Users,
} from "lucide-react";
import { PageJsonLd } from "@/components/page-json-ld";
import { TrainingLibrarySwitcher } from "@/components/training/training-library-switcher";
import {
  AI_SEMINAR_HUB_PATH,
  COMING_SOON_AI_SEMINARS,
  PUBLISHED_AI_SEMINARS,
} from "@/data/ai-seminars/themes";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";

const TITLE = "AI実務研修｜生成AIを仕事で安全に使う社内研修";
const DESCRIPTION =
  "質問、調査、文書作成、検証、個人情報・著作権を学ぶAI実務研修。第一弾「AIチャット仕事術」を音声、PowerPoint、PDF付きで無料公開しています。";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const query = await searchParams;
  const hasQuery = Object.keys(query).length > 0;
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: AI_SEMINAR_HUB_PATH },
    robots: hasQuery ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: withSiteOpenGraph(AI_SEMINAR_HUB_PATH, {
      title: TITLE,
      description: DESCRIPTION,
    }),
    twitter: withSiteTwitter({ title: TITLE, description: DESCRIPTION }),
  };
}

export default function AiSeminarLibraryPage() {
  const published = PUBLISHED_AI_SEMINARS[0];

  return (
    <>
      <PageJsonLd
        name="AI実務研修"
        description={DESCRIPTION}
        path={AI_SEMINAR_HUB_PATH}
        keywords={["AI研修", "生成AI", "社内研修", "AIリテラシー"]}
      />
      <div className="overflow-hidden bg-[#f8f5ed] text-slate-950 dark:bg-slate-950 dark:text-white">
        <header className="border-b-2 border-slate-900 px-4 py-9 sm:px-6 sm:py-12 dark:border-slate-600">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-black tracking-[.14em] text-sky-800 dark:text-sky-300">
              AI PRACTICAL TRAINING
            </p>
            <h1 className="mt-2 max-w-4xl text-4xl font-black tracking-[-.04em] sm:text-5xl">
              AI実務研修
            </h1>
            <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-slate-700 dark:text-slate-200">
              生成AIを仕事で安全に使うための、音声・演習付き社内研修です。
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-sky-800 bg-white px-4 text-sm font-black text-sky-950 dark:bg-slate-900 dark:text-sky-200">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                公開中教材 {PUBLISHED_AI_SEMINARS.length}件
              </span>
              <Link
                href="/services/automation?consultationType=training-materials#consult-form"
                prefetch={false}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-700/30 dark:bg-sky-400 dark:text-slate-950"
              >
                カスタマイズ相談
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <TrainingLibrarySwitcher current="ai" />

          <section aria-labelledby="published-ai-seminars" className="mt-10">
            <p className="text-sm font-black text-sky-800 dark:text-sky-300">AVAILABLE NOW</p>
            <h2 id="published-ai-seminars" className="mt-1 text-3xl font-black tracking-tight">
              公開中 {PUBLISHED_AI_SEMINARS.length}件
            </h2>
            <article
              data-ai-seminar-status="published"
              className="mt-5 overflow-hidden rounded-3xl border-2 border-slate-900 bg-white shadow-[7px_7px_0_#0369a1] dark:border-slate-500 dark:bg-slate-900"
            >
              <div className="grid lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="p-5 sm:p-7">
                  <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-950 dark:bg-sky-950 dark:text-sky-200">
                    公開中
                  </span>
                  <h3 className="mt-3 text-2xl font-black sm:text-3xl">{published.title}</h3>
                  <p className="mt-3 flex items-start gap-2 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
                    <Users className="mt-0.5 h-5 w-5 shrink-0 text-sky-800 dark:text-sky-300" aria-hidden="true" />
                    対象：{published.audience}
                  </p>
                  <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                    {[
                      [Clock3, "標準時間", published.standardDuration],
                      [Presentation, "スライド", `${published.slideCount}枚`],
                      [Headphones, "音声", "音声あり"],
                      [FileDown, "ダウンロード", published.formats?.join("・")],
                    ].map(([Icon, label, value]) => {
                      const MetricIcon = Icon as typeof Clock3;
                      return (
                        <div key={String(label)} className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                          <dt className="flex items-center gap-2 text-xs font-black text-slate-600 dark:text-slate-300">
                            <MetricIcon className="h-4 w-4" aria-hidden="true" />
                            {String(label)}
                          </dt>
                          <dd className="mt-1 text-sm font-black">{String(value)}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
                <div className="flex flex-col justify-between bg-slate-950 p-5 text-white sm:p-7">
                  <p className="text-sm leading-6 text-slate-200">
                    質問・調査・文書作成・検証・安全な使い方を、60分で実践します。
                  </p>
                  <Link
                    href={published.href ?? "/training/ai-seminars"}
                    className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-300 px-5 py-3 font-black text-slate-950 hover:bg-sky-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
                  >
                    今すぐ見る
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
            <p className="mt-4 text-sm font-bold leading-6 text-slate-700 dark:text-slate-200">
              資格・認定講座ではありません。公開・送信・意思決定前に、人が内容を確認してください。
            </p>
          </section>

          <section aria-labelledby="ai-coming-soon" className="mt-14">
            <details className="rounded-2xl border-2 border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
              <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-5 py-3 font-black">
                <span id="ai-coming-soon">Coming Soon {COMING_SOON_AI_SEMINARS.length}件</span>
                <span className="text-xs text-slate-600 dark:text-slate-300">テーマ一覧を開く</span>
              </summary>
              <ul className="divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-700 dark:border-slate-700">
                {COMING_SOON_AI_SEMINARS.map((seminar) => (
                  <li
                    key={seminar.id}
                    data-ai-seminar-status="coming-soon"
                    className="grid gap-1 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_14rem_auto] sm:items-center sm:gap-4"
                  >
                    <span className="font-black">{seminar.title}</span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">対象：{seminar.audience}</span>
                    <span className="text-xs font-black tracking-[.08em] text-amber-800 dark:text-amber-300">Coming Soon</span>
                  </li>
                ))}
              </ul>
            </details>
          </section>
        </div>
      </div>
    </>
  );
}
