type AccidentHubNavProps = {
  current: "accidents" | "accidents-reports" | "accidents-analytics" | "accident-news";
};

// exp-02 (autonomous-loop 2026-05-30): 事故系4ルートが「どれが何のためのツールか」
// 初見で分からない問題を、LawHubNav と同じ section sub-nav パターンで解消する。
// 各ページ最上部に配置し、現在ページを強調＋他3ツールの役割を1行で提示する。
const NAV_ITEMS = [
  {
    id: "accidents" as const,
    href: "/accidents",
    label: "事故DB検索",
    description: "厚労省データ統合 約5,000件を業種・原因・作業区分で全件検索",
  },
  {
    id: "accidents-reports" as const,
    href: "/accidents-reports",
    label: "業種別 分析レポート",
    description: "5業種の事故型・原因・対策・関連法令を自動集計したレポート",
  },
  {
    id: "accidents-analytics" as const,
    href: "/accidents-analytics",
    label: "統計ダッシュボード",
    description: "事故型・業種・経年の傾向をグラフで把握（提案資料の根拠に）",
  },
  {
    id: "accident-news" as const,
    href: "/accident-news",
    label: "重大災害事例",
    description: "死亡災害を業種・事故型・原因で類型検索（公表事実・匿名・出典付き）",
  },
];

/** 事故情報まわりの section サブナビ（4ルートの役割を明示し現在地を強調） */
export function AccidentHubNav({ current }: AccidentHubNavProps) {
  const active = NAV_ITEMS.find((it) => it.id === current);
  return (
    <nav aria-label="事故情報ナビ" className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60">
        <div className="flex flex-wrap gap-2">
          <span className="mr-1 self-center text-[11px] font-bold text-slate-500 dark:text-slate-400">
            事故情報：
          </span>
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={item.href}
              aria-current={item.id === current ? "page" : undefined}
              title={`${item.label} — ${item.description}`}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
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
