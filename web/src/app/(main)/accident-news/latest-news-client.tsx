"use client";

import { CalendarDays, ExternalLink, ShieldAlert } from "lucide-react";
import type { HomeLatestAccidentNews } from "@/lib/home/home-accident-server";
import { useLatestAccidentNews } from "@/lib/home/use-latest-accident-news";

const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function LatestNewsMeta({ latestNews }: { latestNews: HomeLatestAccidentNews }) {
  const news = useLatestAccidentNews(latestNews);
  return (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-rose-600" aria-hidden="true" />
              取得確認 {dateTimeFormatter.format(new Date(news.checkedAt))} JST
            </span>
            <a
              href={news.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-compact-text="true"
              className="inline-flex min-h-11 items-center gap-1 text-sky-800 underline underline-offset-4"
            >
              {news.sourceLabel}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
  );
}

export function LatestNewsSection({ latestNews }: { latestNews: HomeLatestAccidentNews }) {
  const news = useLatestAccidentNews(latestNews);
  return (
        <section
          aria-labelledby="latest-report-heading"
          className="mt-7 pb-10"
          data-primary-task
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="latest-report-heading" className="text-xl font-black text-slate-950 sm:text-2xl">
                直近の報道
              </h2>
              {news.items.length === 0 ? (
                <p className="mt-1 text-xs leading-5 text-slate-600">{news.message}</p>
              ) : null}
            </div>
            <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-black text-slate-700">
              掲載 {news.items.length}記事
            </span>
          </div>

          {news.items.length > 0 ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-950">
              <p className="flex items-start gap-2 font-bold">
                <ShieldAlert className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>報道・内容未確認。公表日時は記事の掲載日時であり、事故発生日ではありません。発生経緯・原因・法的評価は一次資料で未確認です。</span>
              </p>
              <p className="mt-1 pl-6">掲載件数は報道記事の数です。同じ事故の続報を含む場合があり、全国の事故発生件数ではありません。</p>
            </div>
          ) : null}

          {news.items.length > 0 ? (
            <ol
              className="mt-4 grid gap-4 md:grid-cols-2"
              data-accident-news-results
              data-result-count={news.items.length}
            >
              {news.items.map((report) => (
                <li
                  key={report.publicId}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  data-accident-origin="reported-unverified"
                >
                  <p className="text-xs font-bold text-slate-600">
                    記事公表 <time dateTime={report.publishedAt}>{dateTimeFormatter.format(new Date(report.publishedAt))}</time> JST
                  </p>
                  <h3 className="mt-3 text-lg font-black leading-7 text-slate-950">
                    <a
                      href={report.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="decoration-slate-300 underline-offset-4 hover:underline"
                    >
                      {report.title}
                      <span className="sr-only">（外部サイト）</span>
                    </a>
                  </h3>
                  <p className="mt-2 text-sm font-bold text-slate-700">報道媒体：{report.publisher}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-800">{report.industry}</span>
                    <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-800">{report.accidentType}</span>
                  </div>
                  <div className="mt-auto pt-3">
                    <details className="rounded-xl bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-950">
                      <summary className="min-h-8 cursor-pointer font-bold">一般的な関連対策</summary>
                      <p className="pb-1">{report.measure}</p>
                    </details>
                    <a
                      href={report.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-black text-sky-800 underline underline-offset-4"
                    >
                      元記事で確認する
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div role="status" className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
              取得できない状態を「事故なし」とは表示していません。時間をおいて再確認するか、下の死亡事故データベース・公式統計を確認してください。
            </div>
          )}
        </section>
  );
}
