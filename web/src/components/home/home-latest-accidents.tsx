import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { buildHomeAccidentPreview } from "@/lib/home/effect-first-data";
import type { HomeLatestAccidentNews } from "@/lib/home/home-accident-server";

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function HomeLatestAccidents({
  latestNews,
}: {
  latestNews: HomeLatestAccidentNews;
}) {
  const data = buildHomeAccidentPreview();
  const featured = data.featured;
  return (
    <section
      aria-labelledby="home-accidents-title"
      className="bg-slate-950 px-4 py-10 text-white sm:py-12"
      data-home-section="accidents"
    >
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black tracking-[.16em] text-rose-300">
              労災・事故情報
            </p>
            <h2
              id="home-accidents-title"
              className="mt-2 text-3xl font-black tracking-tight sm:text-4xl"
            >
              まず、直近確認できた事故情報を読む
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              厚労省速報と直近報道を分け、報道内容の未確認状態も表示します。
            </p>
          </div>
        </header>

        <article
          className="mt-5 overflow-hidden rounded-3xl border border-rose-300/40 bg-gradient-to-br from-rose-950 via-slate-900 to-slate-950"
          data-accident-origin="official"
        >
          <div className="grid lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
            <div className="border-b border-white/15 p-5 lg:border-b-0 lg:border-r sm:p-7">
              <div className="flex flex-wrap gap-2 text-xs font-black">
                <span className="rounded-full bg-rose-500 px-3 py-1 text-slate-950">
                  直近確認の全国速報
                </span>
                <span className="rounded-full border border-white/40 px-3 py-1">
                  厚生労働省速報
                </span>
              </div>
              <h3 className="mt-4 text-2xl font-black">
                {featured.period}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                確定値ではない累計速報です。更新取得に失敗した場合に備え、最終確認日を表示しています。
              </p>
              <dl className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <dt className="text-xs font-bold text-slate-300">
                    死亡災害
                  </dt>
                  <dd className="mt-1 text-3xl font-black tabular-nums">
                    {featured.deaths === null
                      ? "未確認"
                      : `${featured.deaths.toLocaleString("ja-JP")}件`}
                  </dd>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <dt className="text-xs font-bold text-slate-300">
                    休業4日以上等
                  </dt>
                  <dd className="mt-1 text-3xl font-black tabular-nums">
                    {featured.injuries === null
                      ? "未確認"
                      : `${featured.injuries.toLocaleString("ja-JP")}件`}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-300">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                最終確認 {featured.checkedAt} JST
              </p>
            </div>
            <div className="p-5 sm:p-7">
              <h4 className="text-sm font-black text-rose-200">
                死亡災害の件数が多い業種（速報・累計）
              </h4>
              <ol className="mt-3 grid gap-2">
                {featured.topFatalIndustries.map((row, index) => (
                  <li
                    key={row.name}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3"
                  >
                    <span className="text-sm font-bold">
                      {index + 1}. {row.name}
                    </span>
                    <span className="shrink-0 text-xl font-black tabular-nums">
                      {row.total}件
                    </span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={featured.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-slate-950"
                >
                  一次資料
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
                <Link
                  href="/accident-news"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/50 px-4 text-sm font-black"
                >
                  事故ニュースをもっと見る
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </article>

        <div className="mt-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h3 className="text-lg font-black">
              直近14日以内の労災報道
            </h3>
            <p className="text-xs text-slate-400">
              取得確認{" "}
              <time dateTime={latestNews.checkedAt}>
                {dateFormatter.format(new Date(latestNews.checkedAt))}
              </time>{" "}
              JST・公表日時順
            </p>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-300">
            {latestNews.message}
          </p>
          {latestNews.items.length > 0 ? (
            <ul className="mt-3 grid gap-3 lg:grid-cols-2">
            {latestNews.items.slice(0, 2).map((record) => (
              <li
                key={record.id}
                className="flex flex-col rounded-2xl border border-white/20 bg-white/5 p-4"
                data-accident-origin="reported-unverified"
              >
                <div className="flex flex-wrap gap-2 text-[11px] font-black">
                  <span className="rounded-full bg-white/10 px-2 py-1">
                    公表{" "}
                    <time dateTime={record.publishedAt}>
                      {dateFormatter.format(new Date(record.publishedAt))}
                    </time>
                  </span>
                  <span className="rounded-full bg-white/10 px-2 py-1">
                    {record.industry}
                  </span>
                  <span className="rounded-full bg-rose-500/20 px-2 py-1 text-rose-100">
                    {record.accidentType}
                  </span>
                </div>
                <h4 className="mt-3 font-black leading-6">
                  <a
                    href={record.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-white/40 underline-offset-4"
                  >
                    {record.title}
                  </a>
                </h4>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-200">
                  {record.summary}
                </p>
                <p className="mt-3 rounded-xl bg-emerald-950/70 p-3 text-xs font-bold leading-5 text-emerald-100">
                  関連対策：{record.measure}
                </p>
                <p className="mt-2 inline-flex items-start gap-1 text-[11px] leading-5 text-amber-200">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  報道・内容未確認 ／ 出典：{record.publisher}
                </p>
              </li>
            ))}
            </ul>
          ) : (
            <div
              role="status"
              className="mt-3 rounded-2xl border border-amber-300/60 bg-amber-950/50 p-4 text-sm font-bold leading-6 text-amber-100"
            >
              取得不能を「事故なし」へ変換していません。上の厚労省速報と、
              <a
                href={latestNews.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mx-1 underline underline-offset-4"
              >
                報道RSS
              </a>
              または事故データベースを確認してください。
            </div>
          )}
        </div>

        <nav
          aria-label="事故情報から次の行動へ"
          className="mt-5 flex flex-wrap gap-2"
        >
          <Link href="/accidents" className="portal-button-secondary">
            類似事故を検索する
          </Link>
          <Link href="/ky/paper" className="portal-button-secondary">
            空のKYを作る
          </Link>
          <Link href="/law-search" className="portal-button-secondary">
            関連法令を見る
          </Link>
        </nav>
      </div>
    </section>
  );
}
