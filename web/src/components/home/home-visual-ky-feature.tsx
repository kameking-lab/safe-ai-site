import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3, Presentation, Sparkles } from "lucide-react";
import { getVisualKyCategory } from "@/data/visual-ky/categories";
import { selectDailyVisualKy } from "@/lib/visual-ky/daily";

export function HomeVisualKyFeature() {
  const daily = selectDailyVisualKy();
  const category = getVisualKyCategory(daily.scenario.category);

  return (
    <section
      aria-labelledby="home-visual-ky-heading"
      className="bg-gradient-to-b from-white to-teal-50/70 py-8 dark:from-slate-950 dark:to-teal-950/20"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-teal-200 bg-white shadow-lg dark:border-teal-900 dark:bg-slate-950">
          <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="p-6 sm:p-8 lg:p-10">
              <p className="inline-flex items-center gap-2 text-xs font-black tracking-[0.15em] text-teal-800 uppercase dark:text-teal-300">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                今日の5分KYT
              </p>
              <h2
                id="home-visual-ky-heading"
                className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl"
              >
                イラストから、今日の危険を1つ見つける
              </h2>
              <p className="mt-3 leading-7 text-slate-700 dark:text-slate-200">
                見る、選ぶ、理由を知る、対策を決める。ログイン不要で、個人でも朝礼でも使えます。
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-3 py-2 text-teal-950 dark:bg-teal-950 dark:text-teal-100">
                  <Clock3 className="h-4 w-4" aria-hidden="true" />
                  {daily.scenario.estimatedMinutes}分
                </span>
                <span
                  className="portal-light-ink rounded-full px-3 py-2 text-slate-950"
                  style={{
                    backgroundColor: category.paleColor,
                    borderColor: category.color,
                    borderWidth: 1,
                  }}
                >
                  {category.label}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-2 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  {daily.scenario.difficulty}
                </span>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link
                  href={`/training/visual-ky/${daily.scenario.slug}`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-800 px-5 py-3 font-black text-white hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300"
                >
                  今日の問題を始める
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
                <Link
                  href="/training/visual-ky"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-teal-800 bg-white px-5 py-3 font-bold text-teal-900 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 dark:bg-slate-950 dark:text-teal-100"
                >
                  分野別問題を見る
                </Link>
                <Link
                  href={`/training/visual-ky/${daily.scenario.slug}/facilitator`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-5 py-3 font-bold text-slate-800 hover:border-teal-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white sm:col-span-2"
                >
                  <Presentation className="h-5 w-5" aria-hidden="true" />
                  朝礼で使う
                </Link>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {daily.dateKey} JST。同じ日は同じ問題です。個人情報や回答本文を保存しません。
              </p>
            </div>
            <Link
              href={`/training/visual-ky/${daily.scenario.slug}`}
              className="relative min-h-64 overflow-hidden bg-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-teal-300 lg:min-h-full"
            >
              <Image
                src={daily.scenario.image.src}
                alt={daily.scenario.image.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover"
              />
              <span className="absolute bottom-4 left-4 right-4 rounded-xl bg-slate-950/85 p-4 font-black text-white backdrop-blur-sm">
                {daily.scenario.shortTitle}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
