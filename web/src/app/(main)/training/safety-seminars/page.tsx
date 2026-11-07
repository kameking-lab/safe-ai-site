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

          <section aria-labelledby="safety-training-usage" className="mt-14 rounded-2xl border border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h2 id="safety-training-usage" className="text-2xl font-black">現場に合わせて教材を使う手順</h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7">
              <li>受講者の作業と経験に合う公開教材を選び、担当者がスライドの出典と確認時点を読みます。現場の設備・作業手順との違いを先に書き出します。</li>
              <li>教材の事例を見て「自分たちの作業ならどこで起きるか」を話し合います。災害の名前を覚えるだけで終わらせず、作業開始前に確かめる条件を一つ選びます。</li>
              <li>確認クイズがある教材は、答えだけでなく理由を振り返ります。理解が分かれた点は教材の出典へ戻り、現場で誰が何を確認するかを決めます。</li>
            </ol>
            <p className="mt-4 text-sm leading-7 text-slate-700 dark:text-slate-200">
              朝礼では全編を急いで読むより、作業に関係するスライドを選び、最後に確認行動を共有する使い方ができます。配布する場合は各教材ページで提供形式と利用条件を確認してください。
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
