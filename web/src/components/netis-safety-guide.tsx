import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Boxes, ShieldCheck } from "lucide-react";
import { NetisSafetyExplorer } from "./netis-safety-explorer";
import {
  FEATURED_NETIS_TECHNOLOGIES,
  NETIS_CHECKED_AT,
  NETIS_SAFETY_CATEGORIES,
  netisDetailUrl,
} from "./netis-safety-data";

export { FEATURED_NETIS_TECHNOLOGIES } from "./netis-safety-data";

function ExplorerFallback() {
  return (
    <section aria-labelledby="netis-category-title" className="py-1">
      <p className="text-xs font-black tracking-[.14em] text-sky-800 dark:text-sky-300">
        危険から1クリックで絞り込み
      </p>
      <h2
        id="netis-category-title"
        className="mt-1 text-xl font-black text-slate-950 sm:text-2xl dark:text-white"
      >
        現場の課題を画像で選ぶ
      </h2>
      <div
        className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4"
        aria-hidden="true"
      >
        {NETIS_SAFETY_CATEGORIES.map((category) => (
          <div
            key={category.id}
            className="min-h-44 animate-pulse rounded-2xl border-2 border-slate-200 bg-white sm:min-h-56 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="h-24 rounded-t-xl bg-slate-200 sm:h-36 dark:bg-slate-800" />
            <p className="px-3 py-4 text-sm font-black text-slate-950 dark:text-white">
              {category.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function NetisSafetyGuide({ compact = false }: { compact?: boolean }) {
  if (!compact) {
    return (
      <Suspense fallback={<ExplorerFallback />}>
        <NetisSafetyExplorer />
      </Suspense>
    );
  }

  return (
    <section
      aria-labelledby="netis-cross-link-title"
      className="rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-5 dark:border-sky-900 dark:from-sky-950/30 dark:via-slate-950 dark:to-emerald-950/30"
    >
      <p className="inline-flex items-center gap-2 text-xs font-black tracking-[.14em] text-sky-800 dark:text-sky-300">
        <Boxes className="h-4 w-4" aria-hidden="true" />
        国土交通省 NETIS
      </p>
      <h2
        id="netis-cross-link-title"
        className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white"
      >
        安全課題から新技術を探す
      </h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
        危険の画像を選び、検証済み5技術を課題別に絞れます。
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {FEATURED_NETIS_TECHNOLOGIES.map((technology) => (
          <a
            key={technology.registrationNumber}
            href={netisDetailUrl(technology.registrationNumber)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${technology.name} ${technology.registrationNumber}をNETIS公式で確認`}
            className="group rounded-xl border border-sky-200 bg-white px-3 py-3 transition hover:border-sky-400 hover:shadow-sm dark:border-sky-900 dark:bg-slate-900"
          >
            <span className="block text-[11px] font-black text-emerald-800 dark:text-emerald-300">
              {technology.categoryIds
                .map(
                  (id) =>
                    NETIS_SAFETY_CATEGORIES.find(
                      (category) => category.id === id,
                    )!.label,
                )
                .join("・")}
            </span>
            <span className="mt-1 block text-xs font-black leading-5 text-slate-950 dark:text-white">
              {technology.name}
            </span>
            <span className="mt-1 block font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {technology.registrationNumber}
            </span>
          </a>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-slate-600 dark:text-slate-300">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck
            className="h-4 w-4 text-emerald-700 dark:text-emerald-300"
            aria-hidden="true"
          />
          {NETIS_CHECKED_AT}。NETIS掲載は安全性の自動保証ではありません
        </span>
        <Link
          href="/resources/netis-safety"
          className="inline-flex min-h-11 items-center gap-1 font-black text-sky-900 underline underline-offset-4 dark:text-sky-200"
        >
          画像から安全技術を探す
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
