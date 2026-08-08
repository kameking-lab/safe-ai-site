type AccidentHubNavProps = {
  current: "accidents" | "accidents-reports" | "accidents-analytics" | "accident-news";
};

// 一次資料との本文一致を再検証中の事故DB・分析系ルートはここへ置かない。
// 公開中の重大災害情報だけを明示し、隔離機能への復活導線を作らない。
const NAV_ITEMS = [
  {
    id: "accident-news" as const,
    href: "/accident-news",
    label: "重大災害事例",
    description: "死亡災害を業種・事故型・原因で類型検索（公表事実・匿名・出典付き）",
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
import { isPublicRouteAvailable } from "@/lib/public-content-policy";
