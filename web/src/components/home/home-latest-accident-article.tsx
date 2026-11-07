"use client";

import Link from "next/link";
import type { HomeLatestAccidentNews } from "@/lib/home/home-accident-server";
import { useLatestAccidentNews } from "@/lib/home/use-latest-accident-news";

const focus = "focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#638332]";
const quietLink = `inline-flex min-h-11 min-w-11 items-center gap-2 underline underline-offset-4 ${focus}`;
const dateFormatter = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" });

/** Latest report card. Client-side so the iOS app (static export) can show the live headline. */
export function HomeLatestAccidentArticle({ latestNews: initial }: { latestNews: HomeLatestAccidentNews }) {
  const latestNews = useLatestAccidentNews(initial);
  const report = latestNews.status === "live" ? latestNews.items[0] : undefined;
  return (
          <article data-lp-news="accident" className="border-t border-[#19251F]/30 pt-5">
            <p className="text-sm">労災事故速報 · 報道見出し・原因未確認</p>
            {report ? <><h3 className="mt-3 text-lg font-bold leading-relaxed"><a href={report.href} className={quietLink}>{report.title}</a></h3><p className="mt-3 text-sm leading-7"><time dateTime={report.publishedAt}>{dateFormatter.format(new Date(report.publishedAt))}</time> · {report.publisher}</p></> : <p className="mt-3 leading-7">直近の報道は現在取得できません。事故がなかったことを示すものではありません。</p>}
            <p className="mt-3 text-sm leading-7">出典：{latestNews.sourceLabel} · {latestNews.checkedAt ? <>確認日 <time dateTime={latestNews.checkedAt}>{dateFormatter.format(new Date(latestNews.checkedAt))}</time></> : "確認日未取得"}</p>
            <Link href="/accident-news" className={`${quietLink} text-sm`}>事故速報の一覧を見る</Link>
          </article>
  );
}
