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
  COMING_SOON_SAFETY_SEMINARS,
  PUBLISHED_SAFETY_SEMINARS,
  SAFETY_SEMINAR_HUB_PATH,
} from "@/data/safety-seminars/themes";
import {
  withSiteOpenGraph,
  withSiteTwitter,
} from "@/lib/seo-metadata";

const TITLE = "安全研修ライブラリ｜現場で使える社内安全研修";
const DESCRIPTION =
  "統計と一次資料に基づく社内安全研修を、音声付きスライド、PowerPoint、PDFで利用できます。第一弾は墜落・転落防止とフルハーネスの実務です。";

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
  const published = PUBLISHED_SAFETY_SEMINARS[0];

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

            <article
              data-seminar-status="published"
              className="mt-5 overflow-hidden rounded-3xl border-2 border-slate-900 bg-white shadow-[7px_7px_0_#0f766e] dark:border-slate-500 dark:bg-slate-900"
            >
              <div className="grid lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="p-5 sm:p-7">
                  <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-950 dark:bg-emerald-950 dark:text-emerald-200">
                    公開中
                  </span>
                  <h3 className="mt-3 max-w-3xl text-2xl font-black leading-tight sm:text-3xl">
                    {published.title}
                  </h3>
                  <p className="mt-3 flex items-start gap-2 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
                    <Users className="mt-0.5 h-5 w-5 shrink-0 text-emerald-800 dark:text-emerald-300" aria-hidden="true" />
                    対象：{published.audience}
                  </p>
                  <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                      <dt className="flex items-center gap-2 text-xs font-black text-slate-600 dark:text-slate-300">
                        <Clock3 className="h-4 w-4" aria-hidden="true" />
                        標準時間
                      </dt>
                      <dd className="mt-1 text-sm font-black">
                        {published.standardDuration}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                      <dt className="flex items-center gap-2 text-xs font-black text-slate-600 dark:text-slate-300">
                        <Presentation className="h-4 w-4" aria-hidden="true" />
                        スライド枚数
                      </dt>
                      <dd className="mt-1 text-sm font-black">
                        {published.slideCount}枚
                      </dd>
                    </div>
                    <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                      <dt className="flex items-center gap-2 text-xs font-black text-slate-600 dark:text-slate-300">
                        <Headphones className="h-4 w-4" aria-hidden="true" />
                        音声
                      </dt>
                      <dd className="mt-1 text-sm font-black">音声あり</dd>
                    </div>
                    <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                      <dt className="flex items-center gap-2 text-xs font-black text-slate-600 dark:text-slate-300">
                        <FileDown className="h-4 w-4" aria-hidden="true" />
                        ダウンロード
                      </dt>
                      <dd className="mt-1 text-sm font-black">
                        {published.formats.join("・")}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="flex flex-col justify-between bg-slate-950 p-5 text-white sm:p-7">
                  <div>
                    <p className="text-xs font-black tracking-[.12em] text-emerald-300">
                      FIRST RELEASE
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-200">
                      現場の優先対策、フルハーネスの使い方、使用前点検、救助計画までを一つの教材で確認します。
                    </p>
                  </div>
                  <Link
                    href={published.href}
                    className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 font-black text-slate-950 hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white dark:text-slate-950"
                  >
                    今すぐ見る
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
            <p className="mt-4 text-sm font-bold leading-6 text-slate-700 dark:text-slate-200">
              この教材は社内安全研修用です。法定の特別教育等を代替するものではありません。
            </p>
          </section>

          <section
            aria-labelledby="coming-soon-title"
            className="mt-14"
            style={{ contentVisibility: "auto", containIntrinsicSize: "auto 1400px" }}
          >
            <p className="text-sm font-black text-amber-800 dark:text-amber-300">
              NEXT TOPICS
            </p>
            <h2
              id="coming-soon-title"
              className="mt-1 text-3xl font-black tracking-tight"
            >
              Coming Soon {COMING_SOON_SAFETY_SEMINARS.length}件
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {COMING_SOON_SAFETY_SEMINARS.map((seminar) => (
                <article
                  key={seminar.id}
                  data-seminar-status="coming-soon"
                  className="flex min-h-44 flex-col rounded-2xl border border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
                >
                  <h3 className="text-lg font-black leading-7">
                    {seminar.title}
                  </h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                    対象：{seminar.audience}
                  </p>
                  <span className="mt-auto pt-4 text-xs font-black tracking-[.12em] text-amber-800 dark:text-amber-300">
                    Coming Soon
                  </span>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
