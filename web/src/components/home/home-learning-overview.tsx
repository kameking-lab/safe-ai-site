import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  GraduationCap,
} from "lucide-react";
import { getVisualKyCategory } from "@/data/visual-ky/categories";
import { selectDailyVisualKy } from "@/lib/visual-ky/daily";

export function HomeLearningOverview() {
  const daily = selectDailyVisualKy();
  const category = getVisualKyCategory(daily.scenario.category);

  return (
    <section
      id="home-learning"
      aria-labelledby="home-learning-heading"
      className="scroll-mt-24 overflow-hidden bg-gradient-to-b from-teal-50 via-white to-white px-4 py-7 dark:from-teal-950/30 dark:via-slate-950 dark:to-slate-950"
      data-home-section="learning"
    >
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-black tracking-[.16em] text-teal-800 dark:text-teal-300">
              今日学ぶ
            </p>
            <h2
              id="home-learning-heading"
              className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl dark:text-white"
            >
              KYT・5分教材・資格を1件ずつ
            </h2>
          </div>
          <nav
            aria-label="今日学ぶの関連ページ"
            className="flex flex-wrap items-center gap-x-4"
          >
            <Link
              href="/training/safety-seminars"
              className="inline-flex min-h-11 items-center text-sm font-black text-emerald-900 underline underline-offset-4 dark:text-emerald-200"
            >
              安全研修ライブラリ
            </Link>
            <Link
              href="/training/ai-seminars"
              className="inline-flex min-h-11 items-center text-sm font-black text-sky-900 underline underline-offset-4 dark:text-sky-200"
            >
              AI実務研修
            </Link>
            <Link
              href="/education"
              className="inline-flex min-h-11 items-center text-sm font-black text-teal-900 underline underline-offset-4 dark:text-teal-200"
            >
              学習一覧
            </Link>
          </nav>
        </header>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <article className="overflow-hidden rounded-2xl border-2 border-teal-800 bg-slate-950 text-white">
            <div className="grid grid-cols-[7.5rem_1fr] lg:block">
              <div className="relative min-h-32 overflow-hidden bg-slate-800 lg:h-36">
                <Image
                  src={daily.scenario.image.src}
                  alt={daily.scenario.image.alt}
                  fill
                  sizes="(max-width: 1024px) 120px, 33vw"
                  loading="lazy"
                  className="object-cover"
                />
              </div>
              <div className="p-3">
                <div className="flex flex-wrap gap-1 text-[10px] font-black">
                  <span
                    className="rounded-full px-2 py-1 text-slate-950"
                    style={{ backgroundColor: category.paleColor }}
                  >
                    Visual KYT
                  </span>
                  <span className="rounded-full border border-white/40 px-2 py-1">
                    {daily.scenario.estimatedMinutes}分
                  </span>
                </div>
                <h3 className="mt-2 font-black">{daily.scenario.shortTitle}</h3>
                <p className="mt-1 text-xs leading-5 text-teal-100">対象：朝礼参加者</p>
                <Link
                  href={`/training/visual-ky/${daily.scenario.slug}`}
                  className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-black text-teal-200 underline underline-offset-4"
                >
                  問題に挑戦
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border-2 border-orange-500 bg-orange-50 p-4 text-slate-950">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-black text-orange-900">
                <Clock3 className="h-5 w-5" aria-hidden="true" />
                5分教材
              </span>
            </div>
            <h3 className="mt-3 text-lg font-black">
              WBGTを見て、作業をどう変えるか
            </h3>
            <p className="mt-2 text-xs font-bold leading-5 text-slate-700">
              5分 ／ 対象：職長・作業者 ／ WBGT・休憩・報告体制
            </p>
            <Link
              href="/heat-illness-prevention/elearning"
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-orange-800 px-3 text-sm font-black text-white"
            >
              5分学習を始める
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </article>

          <article className="rounded-2xl border-2 border-violet-700 bg-violet-50 p-4 text-slate-950">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-black text-violet-900">
                <GraduationCap className="h-5 w-5" aria-hidden="true" />
                注目資格
              </span>
            </div>
            <h3 className="mt-3 text-lg font-black">
              フルハーネスを用いる高所作業
            </h3>
            <p className="mt-2 text-xs font-bold leading-5 text-slate-700">
              約2分 ／ 対象：作業者・職長 ／ 区分：特別教育
            </p>
            <Link
              href="/education-certification/finder"
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-violet-900 px-3 text-sm font-black text-white"
            >
              作業条件から確認
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}
