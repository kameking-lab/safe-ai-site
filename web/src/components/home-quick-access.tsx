import Link from "next/link";

/**
 * トップ最上部の「現場ですぐ使う」直接導線（exp-r8）。
 * 社長の不満「すぐ機能に行かない」への是正＝トップを開いて0スクロールで主要機能へ1タップ。
 * モバイル(390px)で3列＝主要機能がファーストビューに収まる。Heroのキャッチ/h1/統計(SEO)はこの下に温存。
 */
type Tool = { href: string; icon: string; label: string; sub: string };

const TOOLS: Tool[] = [
  { href: "/ky/paper", icon: "📝", label: "KY用紙", sub: "3分で起票" },
  { href: "/safety-diary", icon: "📋", label: "打合せ書", sub: "各社を1枚に" },
  { href: "/chemical-ra", icon: "⚗️", label: "化学物質RA", sub: "物質→記録" },
  { href: "/chatbot", icon: "💬", label: "AIに質問", sub: "条文・出典付" },
  { href: "/accidents", icon: "🚨", label: "事故事例DB", sub: "業種で検索" },
  { href: "/laws", icon: "📚", label: "法改正", sub: "施行日・要約" },
  { href: "/signage", icon: "📺", label: "サイネージ", sub: "朝礼掲示" },
  { href: "/court-cases", icon: "⚖️", label: "労災裁判例", sub: "判例＋出典" },
  { href: "/whats-new", icon: "🆕", label: "新着", sub: "法改正・速報" },
  { href: "/site-records", icon: "🗂️", label: "現場記録", sub: "今日やること" },
];

export function HomeQuickAccess() {
  return (
    <section aria-label="現場ですぐ使う主要機能" className="mx-auto max-w-5xl px-4 pt-4 sm:pt-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">現場ですぐ使う</h2>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">タップですぐ起動・登録不要</span>
      </div>
      <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-10">
        {TOOLS.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              className="flex h-full min-h-[78px] flex-col items-center justify-center gap-0.5 rounded-xl border border-emerald-200 bg-white px-1.5 py-2 text-center shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-slate-900 dark:hover:bg-emerald-500/10"
            >
              <span className="text-xl leading-none" aria-hidden="true">{t.icon}</span>
              <span className="text-[12px] font-bold leading-tight text-slate-800 dark:text-slate-100">{t.label}</span>
              <span className="text-[10px] leading-tight text-slate-500 dark:text-slate-400">{t.sub}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
