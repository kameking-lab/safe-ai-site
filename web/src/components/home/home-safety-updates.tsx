import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { UsageNotesLink } from "@/components/usage-notes-link";
import {
  HOME_ADDITIONAL_LAW_REFORMS,
  HOME_FEATURED_LAW_REFORM,
  buildHomeAccidentPreview,
} from "@/lib/home/effect-first-data";
import type { HomeLatestAccidentNews } from "@/lib/home/home-accident-server";

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function HomeSafetyUpdates({
  latestNews,
}: {
  latestNews: HomeLatestAccidentNews;
}) {
  const aggregate = buildHomeAccidentPreview().featured;
  const featuredAccident = latestNews.items[0] ?? null;
  const additionalAccident = latestNews.items[1] ?? null;
  const reform = HOME_FEATURED_LAW_REFORM;
  return (
    <section
      id="home-updates"
      aria-labelledby="home-updates-title"
      className="scroll-mt-24 bg-slate-950 px-4 py-5 text-white sm:py-9"
      data-home-section="updates"
    >
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-black tracking-[.16em] text-cyan-300">
              安全の新着
            </p>
            <h2
              id="home-updates-title"
              className="mt-0.5 text-xl font-black tracking-tight sm:mt-1 sm:text-3xl"
            >
              事故と法改正
            </h2>
          </div>
        </header>

        <div className="mt-3 grid gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-2">
          <article
            className="rounded-2xl border border-rose-300/50 bg-white/5 p-3 sm:p-5"
            data-home-update="accidents"
          >
            <h3 className="text-lg font-black">最新事故</h3>

            {featuredAccident ? (
              <div
                className="mt-2 rounded-xl bg-rose-950/55 p-3 sm:mt-3 sm:p-4"
                data-accident-origin="reported-unverified"
              >
                <p className="text-[11px] font-black leading-5 text-rose-100">
                  公表{" "}
                  <time dateTime={featuredAccident.publishedAt}>
                    {dateFormatter.format(new Date(featuredAccident.publishedAt))}
                  </time>{" "}
                  ／ {featuredAccident.accidentType}
                </p>
                <h4 className="mt-1 text-base font-black leading-5 sm:mt-3 sm:text-lg sm:leading-6">
                  <a
                    href={featuredAccident.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-white/40 underline-offset-4"
                  >
                    {featuredAccident.title}
                  </a>
                </h4>
                <p className="mt-1 line-clamp-2 text-xs leading-4 text-slate-200 sm:mt-2 sm:leading-5">
                  {featuredAccident.summary}
                </p>
                <p data-accident-source="" className="mt-1 text-[11px] text-slate-300">
                  出典：{featuredAccident.publisher}
                </p>
              </div>
            ) : (
              <div
                role="status"
                className="mt-3 rounded-xl border border-amber-300 bg-amber-950/50 p-3 text-sm font-bold leading-6 text-amber-100"
              >
                直近の事故報道を取得できません。
              </div>
            )}

            <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-3">
            <details className="rounded-xl border border-white/20 bg-white/5 px-2 sm:px-3">
              <summary className="flex min-h-11 cursor-pointer items-center text-xs font-black focus-visible:ring-4 focus-visible:ring-rose-300 sm:text-sm">
                速報・追加2件
              </summary>
              <div
                className="border-t border-white/15 py-3 text-xs leading-5"
                data-accident-origin="official"
              >
                <p className="font-black">厚生労働省・全国速報</p>
                <p className="mt-1">
                  {aggregate.period}：死亡災害{" "}
                  {aggregate.deaths === null
                    ? "未確認"
                    : `${aggregate.deaths.toLocaleString("ja-JP")}件`}
                  、休業4日以上等{" "}
                  {aggregate.injuries === null
                    ? "未確認"
                    : `${aggregate.injuries.toLocaleString("ja-JP")}件`}
                </p>
                <p className="mt-1 font-bold text-amber-200">
                  全国速報（暫定値）
                </p>
                <a
                  href={aggregate.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex min-h-11 items-center gap-1 font-black underline underline-offset-4"
                >
                  一次資料
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
              {additionalAccident ? (
                <div
                  className="border-t border-white/15 py-3"
                  data-accident-origin="reported-unverified"
                >
                  <p className="text-[11px] font-black text-rose-200">
                    追加事故／
                    <time dateTime={additionalAccident.publishedAt}>
                      {dateFormatter.format(new Date(additionalAccident.publishedAt))}
                    </time>
                  </p>
                  <a
                    href={additionalAccident.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block text-sm font-black leading-5 underline underline-offset-4"
                  >
                    {additionalAccident.title}
                  </a>
                  <p data-accident-source="" className="mt-1 text-[11px] text-slate-300">
                    出典：{additionalAccident.publisher}
                  </p>
                </div>
              ) : null}
            </details>
            <Link
              href="/accident-news"
              className="inline-flex min-h-11 items-center justify-center gap-1 text-xs font-black underline underline-offset-4 sm:text-sm"
            >
              関連事故を見る
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            </div>
          </article>

          <article
            className="rounded-2xl border border-violet-300/60 bg-[#f5f1e8] p-3 text-slate-950 sm:p-5"
            data-home-update="law-reform"
            data-law-source-state={reform.sourceState}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-black">注目法改正</h3>
              <span data-status-badge className="rounded-full bg-violet-950 px-2 py-1 text-[11px] font-black text-white">
                {reform.status}
              </span>
            </div>
            <div className="mt-2 rounded-xl border-2 border-violet-900 bg-white p-3 sm:mt-3 sm:p-4">
              <div className="flex flex-wrap gap-1 text-[11px] font-black text-violet-900 sm:gap-2">
                <span>施行 {reform.effectiveAt}</span>
              </div>
              <h4 className="mt-1 text-base font-black leading-5 sm:mt-2 sm:text-lg sm:leading-6">
                {reform.title}
              </h4>
              <p className="mt-1 line-clamp-2 text-xs leading-4 text-slate-700 sm:mt-2 sm:leading-5">
                対象：{reform.target}
              </p>
              <p className="mt-1 line-clamp-2 rounded-lg bg-yellow-50 p-1.5 text-xs font-black leading-4 sm:mt-2 sm:p-2 sm:leading-5">
                {reform.action}
              </p>
              <p className="mt-1 line-clamp-1 text-[11px] text-slate-600 sm:mt-2">
                出典：{reform.sourceLabel}（{reform.checkedAt}確認）
              </p>
              <div className="mt-2 flex flex-wrap gap-2 sm:mt-3">
                <Link
                  href={`/laws#${reform.id}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-violet-900 px-3 text-sm font-black text-white"
                >
                  改正内容を確認
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <a
                  href={reform.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-black text-violet-950 underline underline-offset-4"
                >
                  原文
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-3">
            <details className="rounded-xl border border-slate-400 bg-white/70 px-2 sm:px-3">
              <summary className="flex min-h-11 cursor-pointer items-center text-xs font-black focus-visible:ring-4 focus-visible:ring-violet-300 sm:text-sm">
                追加2件を確認
              </summary>
              <ul className="border-t border-slate-300 py-2">
                {HOME_ADDITIONAL_LAW_REFORMS.map((item) => (
                  <li
                    key={item.id}
                    className="border-b border-slate-200 py-2 last:border-0"
                    data-law-source-state="primary-source"
                  >
                    <p className="text-[11px] font-black text-violet-900">
                      {item.status}／施行 {item.effectiveAt}
                    </p>
                    <p className="mt-1 text-sm font-black">{item.title}</p>
                    <p className="mt-1 text-xs leading-5">
                      {item.action}
                    </p>
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-1 text-xs font-black text-violet-950 underline underline-offset-4"
                    >
                      一次資料
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </details>
              <Link href="/laws" className="inline-flex min-h-11 items-center justify-center text-xs font-black text-violet-950 underline underline-offset-4 sm:text-sm">
                法改正一覧を見る
              </Link>
            </div>
          </article>
        </div>
        <UsageNotesLink className="mt-1 text-slate-300" />
      </div>
    </section>
  );
}
