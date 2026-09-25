import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bot, FileClock, FlaskConical, Newspaper, Presentation } from "lucide-react";
import { HomeDirectChatClient } from "@/components/home-safety-cockpit/home-chat-quick-ask";
import { HomeDirectChemicalClient } from "@/components/home-safety-cockpit/home-chemical-quick-search";
import { SAFETY_MANAGEMENT_BASICS_OSH_LAW_SEMINAR_PATH, SAFETY_SEMINARS } from "@/data/safety-seminars/themes";
import { HOME_FEATURED_LAW_REFORM } from "@/lib/home/effect-first-data";
import type { HomeLatestAccidentNews } from "@/lib/home/home-accident-server";

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const linkClass = "inline-flex min-h-11 items-center gap-1 rounded-lg text-base font-black text-slate-950 underline decoration-emerald-600/50 underline-offset-4 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";
const cardClass = "min-w-0 rounded-2xl border border-white/40 bg-[#fffdf8] p-3 text-slate-950 shadow-lg sm:p-4";

export function HomeMascotToolbox({ latestNews }: { latestNews: HomeLatestAccidentNews }) {
  const report = latestNews.items[0] ?? null;
  const seminar = SAFETY_SEMINARS.find((item) => item.id === "safety-management-basics-osh-law" && item.status === "published");
  const reform = HOME_FEATURED_LAW_REFORM;

  return (
    <section aria-label="チワワと試す5機能" className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-6" data-home-mascot-five-tools>
      <article id="mascot-chat" className={`${cardClass} col-span-2 lg:col-span-3 scroll-mt-24`}>
        <h2 className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-emerald-800" aria-hidden="true" />
          <Link href="/chatbot" prefetch={false} className={linkClass}>安衛法AI <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </h2>
        <p className="mb-2 text-sm leading-5 text-slate-700">現場の疑問をここから質問できます。</p>
        <HomeDirectChatClient />
      </article>

      <article id="mascot-chemical" className={`${cardClass} col-span-2 lg:col-span-3 scroll-mt-24`}>
        <h2 className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-amber-800" aria-hidden="true" />
          <Link href="/chemical-ra" prefetch={false} className={linkClass}>化学物質RA <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </h2>
        <p className="mb-2 text-sm leading-5 text-slate-700">物質名やCAS番号から確認を始めます。</p>
        <HomeDirectChemicalClient />
      </article>

      <article id="mascot-accident" className={`${cardClass} scroll-mt-24 lg:col-span-2`}>
        <h2 className="flex items-center gap-1">
          <Newspaper className="h-5 w-5 shrink-0 text-rose-800" aria-hidden="true" />
          <Link href="/accident-news" prefetch={false} className={linkClass}>死亡事故速報 <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /></Link>
        </h2>
        {report ? (
          <div className="mt-1 text-sm leading-5" data-mascot-accident="reported-unverified">
            <p className="text-xs font-bold text-slate-600">報道見出し・公表 <time dateTime={report.publishedAt}>{dateFormatter.format(new Date(report.publishedAt))}</time>・{report.publisher}</p>
            <p className="mt-1 line-clamp-2 font-bold">{report.title}</p>
          </div>
        ) : (
          <p className="mt-1 text-sm leading-5 text-slate-700" data-mascot-accident="unavailable">直近の国内死亡事故報道は未取得です。</p>
        )}
      </article>

      <article id="mascot-slides" className={`${cardClass} scroll-mt-24 lg:col-span-2`}>
        <h2 className="flex items-center gap-1">
          <Presentation className="h-5 w-5 shrink-0 text-sky-800" aria-hidden="true" />
          <Link href={`${SAFETY_MANAGEMENT_BASICS_OSH_LAW_SEMINAR_PATH}#seminar-player`} prefetch={false} className={linkClass}>安全スライド <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /></Link>
        </h2>
        {seminar?.status === "published" ? (
          <div className="mt-1 flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
            <Image src="/training/safety-seminars/safety-management-basics-osh-law/safe-site-hero.webp" alt="" width={80} height={60} loading="lazy" className="h-12 w-16 shrink-0 rounded-md object-cover" />
            <p className="text-sm font-bold leading-5">{seminar.title}<span className="block text-xs text-slate-600">公開中・全{seminar.slideCount}枚</span></p>
          </div>
        ) : <p className="mt-1 text-sm text-slate-700">公開中の教材を確認する</p>}
      </article>

      <article id="mascot-laws" className={`${cardClass} col-span-2 scroll-mt-24 lg:col-span-2`}>
        <h2 className="flex items-center gap-1">
          <FileClock className="h-5 w-5 shrink-0 text-violet-800" aria-hidden="true" />
          <Link href={`/laws#${reform.id}`} prefetch={false} className={linkClass}>法改正 <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /></Link>
        </h2>
        <p className="mt-1 text-xs font-bold text-violet-800">{reform.status}・施行 {reform.effectiveAt}</p>
        <p className="mt-1 line-clamp-2 text-sm font-bold leading-5">{reform.title}</p>
      </article>
    </section>
  );
}
