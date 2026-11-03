"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { selectDailyVisualKy } from "@/lib/visual-ky/daily";
import { getVisualKyCategory } from "@/data/visual-ky";
import { useNativeNow } from "@/lib/use-native-now";
const HUB_PATH="/training/visual-ky";
export function VisualKyDailyHero({initialTimestamp}:{initialTimestamp:string}) {
  const now=useNativeNow(initialTimestamp);
  const daily = selectDailyVisualKy({date:now});
  const dateLabel = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(now);
  const category = getVisualKyCategory(daily.scenario.category);

  return (
        <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-5 text-white shadow-2xl sm:px-8 sm:py-8 lg:px-12">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(circle at 12% 20%, #14b8a6 0, transparent 32%), radial-gradient(circle at 88% 70%, #f97316 0, transparent 28%)",
            }}
          />
          <div className="relative grid items-center gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8">
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                画像で学ぶ
                <span className="block text-teal-300">危険予知</span>
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
                現場イラストを見て、危険と対策を選びます。
              </p>
              <p
                data-visual-ky-daily-meta=""
                data-scenario-id={daily.scenario.id}
                data-category-label={category.label}
                data-estimated-minutes={daily.scenario.estimatedMinutes}
                className="mt-2 text-xs font-bold text-teal-100"
              >
                {dateLabel} ・ {daily.scenario.estimatedMinutes}分 ・ {category.label}
              </p>
            </div>

            <article
              aria-labelledby="daily-visual-ky-title"
              className="overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-2xl"
            >
              <div className="relative aspect-video overflow-hidden">
                <Image
                  src={daily.scenario.image.src}
                  alt={daily.scenario.image.alt}
                  fill
                  priority
                  loading="eager"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
                <span className="portal-light-ink absolute left-3 top-3 rounded-full bg-rose-300 px-3 py-2 text-xs font-black text-slate-950 shadow-lg">
                  今日の5分KYT
                </span>
              </div>
              <div className="p-5">
                <h2 id="daily-visual-ky-title" className="text-xl font-black text-white">
                  {daily.scenario.shortTitle}
                </h2>
                <p
                  data-visual-ky-opening-question=""
                  className="mt-2 text-sm font-bold leading-6 text-slate-100"
                >
                  {daily.scenario.facilitator.openingQuestion}
                </p>
                <Link
                  href={`${HUB_PATH}/${daily.scenario.slug}`}
                  data-primary-action="true"
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-400 px-5 py-3 font-black text-slate-950 hover:bg-teal-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
                >
                  回答する
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
                <Link
                  href="#categories"
                  data-secondary-action="true"
                  className="mt-2 inline-flex min-h-11 items-center text-sm font-bold text-teal-100 underline underline-offset-4"
                >
                  別の分野を選ぶ
                </Link>
              </div>
            </article>
          </div>
        </section>
  );
}
export function VisualKyTodayBadge({scenarioId,initialTimestamp}:{scenarioId:string;initialTimestamp:string}) {
  const now=useNativeNow(initialTimestamp);
  return selectDailyVisualKy({date:now}).scenario.id===scenarioId?"今日の5分KYT · ":null;
}
