import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ExternalLink,
  ListChecks,
  Users,
} from "lucide-react";
import {
  HOME_ADDITIONAL_LAW_REFORMS,
  HOME_FEATURED_LAW_REFORM,
} from "@/lib/home/effect-first-data";

export function HomeFeaturedLawReform() {
  const reform = HOME_FEATURED_LAW_REFORM;
  return (
    <section
      aria-labelledby="home-law-reform-title"
      className="overflow-hidden bg-[#f5f1e8] px-4 py-10 text-slate-950 sm:py-12"
      data-home-section="law-reform"
    >
      <div className="mx-auto max-w-7xl">
        <header className="max-w-3xl">
          <p className="text-xs font-black tracking-[.16em] text-violet-800">
            注目の法改正
          </p>
          <h2
            id="home-law-reform-title"
            className="mt-2 text-3xl font-black tracking-[-.03em] sm:text-4xl"
          >
            施行日より先に、「今やること」を見る
          </h2>
          <p className="mt-2 text-sm text-slate-700">
            施行の近さ・影響・一次資料確認を基準に1件を選定しています。
          </p>
        </header>

        <article
          className="mt-5 grid overflow-hidden rounded-[2rem] border-2 border-slate-900 bg-white shadow-[8px_8px_0_#0f172a] lg:grid-cols-[minmax(0,.72fr)_minmax(0,1.28fr)]"
          data-law-source-state={reform.sourceState}
        >
          <div className="bg-violet-950 p-5 text-white sm:p-7">
            <div className="flex flex-wrap gap-2 text-xs font-black">
              <span className="rounded-full bg-yellow-300 px-3 py-1 text-slate-950">
                {reform.status}
              </span>
              <span className="rounded-full border border-white/50 px-3 py-1">
                {reform.sourceState}
              </span>
            </div>
            <p className="mt-5 text-xs font-bold text-violet-200">
              目玉改正
            </p>
            <h3 className="mt-2 text-2xl font-black leading-tight">
              {reform.title}
            </h3>
            <dl className="mt-5 grid gap-2 text-sm">
              <div className="rounded-xl bg-white/10 p-3">
                <dt className="text-xs font-bold text-violet-200">公布日</dt>
                <dd className="mt-1 font-black">{reform.promulgatedAt}</dd>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <dt className="text-xs font-bold text-violet-200">施行日</dt>
                <dd className="mt-1 text-2xl font-black">
                  {reform.effectiveAt}
                </dd>
              </div>
            </dl>
          </div>
          <div className="p-5 sm:p-7">
            <dl className="grid gap-4">
              <div>
                <dt className="flex items-center gap-2 text-xs font-black text-violet-800">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  対象者
                </dt>
                <dd className="mt-1 text-lg font-black">{reform.target}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 text-xs font-black text-violet-800">
                  <CalendarClock className="h-4 w-4" aria-hidden="true" />
                  何が変わるか
                </dt>
                <dd className="mt-1 text-sm font-bold leading-6 text-slate-700">
                  {reform.change}
                </dd>
              </div>
              <div className="rounded-2xl border-2 border-yellow-500 bg-yellow-50 p-4">
                <dt className="flex items-center gap-2 text-xs font-black text-slate-800">
                  <ListChecks className="h-4 w-4" aria-hidden="true" />
                  今やること
                </dt>
                <dd className="mt-2 text-lg font-black leading-7">
                  {reform.action}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-slate-600">
              一次資料確認日 {reform.checkedAt} JST
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/laws#${reform.id}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-900 px-4 text-sm font-black text-white"
              >
                改正内容を確認する
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href={reform.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-violet-900 bg-white px-4 text-sm font-black text-violet-950"
              >
                原文を開く
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </article>

        <div className="mt-7 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <h3 className="text-lg font-black">続けて確認する改正</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {HOME_ADDITIONAL_LAW_REFORMS.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-slate-400 bg-white/70 p-4"
                >
                  <div className="flex flex-wrap justify-between gap-2 text-xs font-black">
                    <span className="text-violet-800">{item.status}</span>
                    <span>施行 {item.effectiveAt}</span>
                  </div>
                  <h4 className="mt-2 font-black">{item.title}</h4>
                  <p className="mt-2 text-xs leading-5 text-slate-700">
                    対象：{item.target}
                  </p>
                  <p className="mt-1 text-xs font-bold leading-5">
                    今やること：{item.action}
                  </p>
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-black text-violet-900 underline underline-offset-4"
                  >
                    一次資料
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <nav className="flex flex-wrap gap-2">
            <Link href="/law-search" className="portal-button-secondary">
              関連法令を検索する
            </Link>
            <Link href="/laws" className="portal-button-primary">
              法改正一覧を見る
            </Link>
          </nav>
        </div>
      </div>
    </section>
  );
}
