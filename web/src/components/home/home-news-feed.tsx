import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import {
  NEWS_HUB_CATEGORY_LABEL,
  type NewsHubItem,
} from "@/lib/news-hub-types";

type HomeFeedItem =
  | { kind: "news"; item: NewsHubItem }
  | {
      kind: "education";
      id: string;
      title: string;
      date: string;
      href: string;
      source: string;
    };

export function HomeNewsFeed({ items }: { items: NewsHubItem[] }) {
  const feed: HomeFeedItem[] = [
    ...items.slice(0, 4).map((item) => ({ kind: "news" as const, item })),
    {
      kind: "education" as const,
      id: "education-resource-2026-07-30",
      title: "教育資料を、対象者と分野から選べます",
      date: "2026-07-30",
      href: "/resources",
      source: "公的資料リンク・編集資料",
    },
  ];

  return (
    <section
      aria-labelledby="home-news-heading"
      className="border-y border-portal-border bg-portal-surface-emphasis px-4 py-10"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="portal-section-kicker">LATEST / SOURCES</p>
            <h2
              id="home-news-heading"
              className="mt-2 text-2xl font-black text-brand-secondary sm:text-3xl dark:text-white"
            >
              事故・法改正・教育の新着
            </h2>
          </div>
          <Link href="/whats-new" className="portal-button-secondary">
            新着をすべて見る
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <ol className="mt-5 divide-y divide-portal-border border-y border-portal-border">
          {feed.map((entry, index) => {
            if (entry.kind === "education") {
              return (
                <li key={entry.id}>
                  <Link
                    href={entry.href}
                    className="grid min-h-16 gap-1 py-3 hover:bg-portal-surface sm:grid-cols-[112px_minmax(0,1fr)_160px_24px] sm:items-center sm:gap-3 sm:px-3"
                  >
                    <span className="portal-status w-fit">教育</span>
                    <span className="min-w-0 break-words font-bold text-brand-secondary dark:text-white">
                      {entry.title}
                    </span>
                    <span className="min-w-0 break-words text-xs text-portal-muted">
                      {entry.date}・{entry.source}
                    </span>
                    <ArrowRight className="hidden h-[16px] w-[16px] text-brand-primary sm:block" aria-hidden="true" />
                  </Link>
                </li>
              );
            }
            const item = entry.item;
            const href = item.internalHref ?? item.url;
            const external = !item.internalHref;
            return (
              <li key={item.id}>
                <a
                  href={href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  className="grid min-h-16 gap-1 py-3 hover:bg-portal-surface sm:grid-cols-[112px_minmax(0,1fr)_160px_24px] sm:items-center sm:gap-3 sm:px-3"
                >
                  <span className="portal-status w-fit">
                    {NEWS_HUB_CATEGORY_LABEL[item.category]}
                  </span>
                  <span className="min-w-0 break-words font-bold text-brand-secondary dark:text-white">
                    {item.title}
                  </span>
                  <span className="min-w-0 break-words text-xs text-portal-muted">
                    {item.date}・出典あり
                  </span>
                  {external ? (
                    <ExternalLink className="hidden h-[16px] w-[16px] text-brand-primary sm:block" aria-hidden="true" />
                  ) : (
                    <ArrowRight className="hidden h-[16px] w-[16px] text-brand-primary sm:block" aria-hidden="true" />
                  )}
                  {index === 0 ? <span className="sr-only">最新項目</span> : null}
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
