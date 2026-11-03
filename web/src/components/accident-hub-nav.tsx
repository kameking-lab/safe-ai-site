import { isPublicRouteAvailable } from "@/lib/public-content-policy";

type AccidentHubNavProps = {
  current:
    | "accidents"
    | "accidents-reports"
    | "accidents-analytics"
    | "accident-news"
    | "fatal-accidents";
};

// 公開確認済みの速報と統計分析を相互に移動できるようにする。
const NAV_ITEMS = [
  {
    id: "accident-news" as const,
    href: "/accident-news",
    label: "国内の死亡事故速報",
    description: "直近14日以内の日本国内の労働中の死亡事故報道を表示",
  },
  {
    id: "fatal-accidents" as const,
    href: "/fatal-accidents",
    label: "死亡事故データベース",
    description: "厚労省の死亡災害を業種・事故型・起因物・年で類型検索",
  },
  {
    id: "accidents-analytics" as const,
    href: "/accidents-analytics",
    label: "事故分析ダッシュボード",
    description: "全国公式統計と収録事例を分け、業種・事故型・経年傾向を確認",
  },
];

/** 公開確認済みの事故情報だけを示す section サブナビ。 */
export function AccidentHubNav({ current }: AccidentHubNavProps) {
  const publicItems = NAV_ITEMS.filter((item) =>
    isPublicRouteAvailable(item.href),
  );
  const active = publicItems.find((it) => it.id === current);
  return (
    <nav aria-label="事故情報ナビ" className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60">
        <div className="flex flex-wrap gap-2">
          <span className="mr-1 self-center text-[11px] font-bold text-slate-500 dark:text-slate-400">
            事故情報：
          </span>
          {publicItems.map((item) => (
            <a
              key={item.id}
              href={item.href}
              aria-current={item.id === current ? "page" : undefined}
              title={`${item.label} — ${item.description}`}
              className={`inline-flex min-h-[44px] items-center rounded-full px-3 py-1 text-xs font-semibold transition ${
                item.id === current
                  ? "bg-rose-600 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:border-rose-300 hover:text-rose-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-rose-500 dark:hover:text-rose-300"
              }`}
            >
              {item.label}
            </a>
          ))}
        </div>
        {active && (
          <p className="mt-2 text-[11px] leading-snug text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-700 dark:text-slate-200">{active.label}：</span>
            {active.description}
          </p>
        )}
      </div>
    </nav>
  );
}
