import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { PageJsonLd } from "@/components/page-json-ld";
import { PublishedSeminarList } from "./published-seminar-list";
import { TrainingLibrarySwitcher } from "@/components/training/training-library-switcher";
import {
  COMING_SOON_SAFETY_CORE_20,
  PUBLISHED_SAFETY_SEMINARS,
  SAFETY_SEMINAR_HUB_PATH,
} from "@/data/safety-seminars/themes";
import {
  withSiteOpenGraph,
  withSiteTwitter,
} from "@/lib/seo-metadata";
import { FeatureMascotCompanion } from "@/components/feature-mascot-companion";

const TITLE = "安全研修ライブラリ｜現場で使える社内安全研修";
const DESCRIPTION =
  "統計と一次資料に基づく社内安全研修を、スライド、PowerPoint、PDFで利用できます。安全管理の基本から個別災害の防止まで、公開教材を無料で活用できます。";

type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const query = await searchParams;
  const hasQuery = Object.keys(query).length > 0;

  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: SAFETY_SEMINAR_HUB_PATH },
    robots: hasQuery
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: withSiteOpenGraph(SAFETY_SEMINAR_HUB_PATH, {
      title: TITLE,
      description: DESCRIPTION,
    }),
    twitter: withSiteTwitter({
      title: TITLE,
      description: DESCRIPTION,
    }),
  };
}

export default function SafetySeminarLibraryPage() {
  return (
    <>
      <PageJsonLd
        name="安全研修ライブラリ"
        description={DESCRIPTION}
        path={SAFETY_SEMINAR_HUB_PATH}
        keywords={["社内安全研修", "安全教育", "労働災害防止"]}
      />

      <div className="overflow-hidden bg-[#f8f5ed] text-slate-950 dark:bg-slate-950 dark:text-white">
        <section
          aria-labelledby="safety-seminar-library-title"
          className="border-b-2 border-slate-900 px-4 py-9 sm:px-6 sm:py-12 dark:border-slate-600"
        >
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-black tracking-[.14em] text-emerald-800 dark:text-emerald-300">
              SAFETY TRAINING LIBRARY
            </p>
            <h1
              id="safety-seminar-library-title"
              className="mt-2 max-w-4xl text-4xl font-black tracking-[-.04em] sm:text-5xl"
            >
              安全研修ライブラリ
            </h1>
            <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-slate-700 dark:text-slate-200">
              統計と一次資料から、現場で確認するポイントを学ぶ社内安全研修です。
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-emerald-800 bg-white px-4 text-sm font-black text-emerald-950 dark:bg-slate-900 dark:text-emerald-200">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                公開中教材 {PUBLISHED_SAFETY_SEMINARS.length}件
              </span>
              <Link
                href="/services/automation?consultationType=training-materials#consult-form"
                prefetch={false}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-700/30 dark:bg-emerald-700 dark:text-slate-950 dark:hover:bg-emerald-600"
              >
                カスタマイズ相談
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <FeatureMascotCompanion
              variant="teacher"
              eyebrow="安全講師チワワ"
              title="そのまま朝礼で使える教材から始めよう。"
              message="見る・配る・問い直す。現場に合う方法で使えます。"
              tone="cream"
              compact
              className="mt-6 max-w-2xl"
            />
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <TrainingLibrarySwitcher current="safety" />
          <section aria-labelledby="published-seminars-title">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-sm font-black text-emerald-800 dark:text-emerald-300">
                  AVAILABLE NOW
                </p>
                <h2
                  id="published-seminars-title"
                  className="mt-1 text-3xl font-black tracking-tight"
                >
                  公開中 {PUBLISHED_SAFETY_SEMINARS.length}件
                </h2>
              </div>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                無料で閲覧・ダウンロード
              </p>
            </div>

            <PublishedSeminarList seminars={PUBLISHED_SAFETY_SEMINARS} />
            <p className="mt-4 text-sm font-bold leading-6 text-slate-700 dark:text-slate-200">
              この教材は社内安全研修用です。法定の特別教育等を代替するものではありません。
            </p>
          </section>

          <section aria-labelledby="coming-soon-title" className="mt-14">
            <details className="rounded-2xl border-2 border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
              <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-5 py-3 font-black">
                <span id="coming-soon-title">準備中のテーマ目次（{COMING_SOON_SAFETY_CORE_20.length}件）</span>
                <span className="text-xs text-slate-600 dark:text-slate-300">目次を開く</span>
              </summary>
              <ul className="divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-700 dark:border-slate-700">
                {COMING_SOON_SAFETY_CORE_20.map((seminar) => (
                  <li key={seminar.id} data-seminar-status="coming-soon" className="grid gap-1 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_14rem_auto] sm:items-center sm:gap-4">
                    <span className="font-black">{seminar.title}</span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">対象：{seminar.audience}</span>
                    <span className="text-xs font-black tracking-[.08em] text-amber-800 dark:text-amber-300">準備中</span>
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
