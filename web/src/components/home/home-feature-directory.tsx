import Link from "next/link";
import {
  ArrowRight,
  Bot,
  ClipboardList,
  Database,
  GraduationCap,
  LayoutGrid,
  ListChecks,
  Scale,
  ShieldCheck,
} from "lucide-react";

type FeatureLink = { href: string; label: string };
type FeatureCategory = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  visible: FeatureLink[];
  more: FeatureLink[];
  tone: string;
  iconTone: string;
};

const CATEGORIES: FeatureCategory[] = [
  {
    title: "今日使う",
    icon: ShieldCheck,
    tone: "border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/35",
    iconTone: "bg-orange-600 text-white",
    visible: [
      { href: "/risk", label: "今日の安全" },
      { href: "/heat-illness-prevention", label: "熱中症対策" },
      { href: "/signage", label: "サイネージ" },
    ],
    more: [
      { href: "/whats-new", label: "新着情報" },
      { href: "/notifications", label: "通知設定" },
    ],
  },
  {
    title: "帳票を作る",
    icon: ClipboardList,
    tone: "border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/35",
    iconTone: "bg-sky-700 text-white",
    visible: [
      { href: "/ky/paper", label: "KY用紙" },
      { href: "/safety-diary", label: "安全工程打合せ書" },
      { href: "/site-records", label: "現場帳票" },
    ],
    more: [
      { href: "/strategy/plan-generator", label: "年次安全衛生計画" },
      { href: "/work-environment-measurement", label: "作業環境測定" },
    ],
  },
  {
    title: "法令・資格",
    icon: Scale,
    tone: "border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/35",
    iconTone: "bg-indigo-700 text-white",
    visible: [
      { href: "/law-search", label: "法令検索" },
      { href: "/education-certification/finder", label: "資格Finder" },
      { href: "/law-navi", label: "法令ナビ" },
    ],
    more: [
      { href: "/laws", label: "法改正" },
      { href: "/circulars", label: "通達・判例" },
      { href: "/law-hierarchy", label: "法令体系" },
    ],
  },
  {
    title: "事故・化学物質",
    icon: Database,
    tone: "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/35",
    iconTone: "bg-amber-600 text-slate-950",
    visible: [
      { href: "/accidents", label: "事故検索" },
      { href: "/chemical-ra", label: "化学物質RA" },
      { href: "/chemical-database", label: "化学物質DB" },
    ],
    more: [
      { href: "/accidents-analytics", label: "事故統計" },
      { href: "/accident-news", label: "重大災害事例" },
    ],
  },
  {
    title: "教育・講習",
    icon: GraduationCap,
    tone: "border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/35",
    iconTone: "bg-rose-700 text-white",
    visible: [
      { href: "/training/visual-ky", label: "5分ビジュアルKYT" },
      { href: "/education-certification", label: "特別教育・技能講習" },
      { href: "/guides", label: "安全ガイド" },
    ],
    more: [
      { href: "/e-learning", label: "Eラーニング（検証状況）" },
      { href: "/glossary", label: "安全用語" },
      { href: "/faq", label: "よくある質問" },
    ],
  },
  {
    title: "計画・管理",
    icon: ListChecks,
    tone: "border-teal-300 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/35",
    iconTone: "bg-teal-700 text-white",
    visible: [
      { href: "/strategy/plan-generator", label: "年次計画" },
      { href: "/safety-ai", label: "安全AIの導入" },
      { href: "/favorites", label: "お気に入り" },
    ],
    more: [
      { href: "/industries", label: "業種別対策" },
      { href: "/mental-health-management", label: "メンタル対策" },
    ],
  },
  {
    title: "AI・自動化",
    icon: Bot,
    tone: "border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/35",
    iconTone: "bg-violet-700 text-white",
    visible: [
      { href: "/services/automation", label: "業務自動化相談" },
      { href: "/chatbot", label: "法令の根拠検索" },
      { href: "/risk-prediction", label: "リスク予測" },
    ],
    more: [
      { href: "/safety-ai", label: "安全AI" },
      { href: "/contact", label: "改善提案" },
    ],
  },
  {
    title: "全機能",
    icon: LayoutGrid,
    tone: "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/35",
    iconTone: "bg-emerald-700 text-white",
    visible: [
      { href: "/features", label: "全機能一覧" },
      { href: "/search", label: "サイト内検索" },
      { href: "/goods", label: "安全グッズ" },
    ],
    more: [
      { href: "/about", label: "運営情報" },
      { href: "/whats-new", label: "更新情報" },
    ],
  },
];

function FeatureList({ links }: { links: FeatureLink[] }) {
  return (
    <ul className="space-y-1">
      {links.map((item) => (
        <li key={`${item.href}-${item.label}`}>
          <Link
            href={item.href}
            prefetch={false}
            className="group flex min-h-11 items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 dark:text-slate-100 dark:hover:bg-emerald-950/40"
          >
            {item.label}
            <ArrowRight
              className="h-4 w-4 shrink-0 text-emerald-800 motion-safe:transition-transform motion-safe:group-hover:translate-x-1 dark:text-emerald-200"
              aria-hidden="true"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function HomeFeatureDirectory() {
  return (
    <section
      aria-labelledby="home-feature-directory"
      className="relative overflow-hidden border-t-2 border-slate-200 bg-[#f3efe5] px-4 py-12 [content-visibility:auto] [contain-intrinsic-size:auto_980px] dark:border-slate-800 dark:bg-slate-950 sm:py-16"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,.08)_1px,transparent_0)] bg-[size:22px_22px] forced-colors:hidden dark:opacity-20" aria-hidden="true" />
      <div className="mx-auto max-w-7xl">
        <p className="relative text-xs font-black tracking-[.18em] text-emerald-800 dark:text-emerald-200">
          EXPLORE THE PORTAL
        </p>
        <h2
          id="home-feature-directory"
          aria-label="カテゴリから探す"
          className="relative mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl"
        >
          目的を変えて、もっと探す
        </h2>
        <p className="relative mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
          同じ見た目の一覧ではなく、仕事の場面ごとに入口を色分けしました。
        </p>
        <div className="relative mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {CATEGORIES.map(({ title, icon: Icon, visible, more, tone, iconTone }, index) => (
            <article
              key={title}
              className={`group overflow-hidden rounded-[1.5rem] border-2 p-3 shadow-[0_20px_45px_-35px_rgba(15,23,42,.65)] transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-none ${tone}`}
            >
              <div className="flex min-h-16 items-center gap-3 px-2">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-sm ${iconTone}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="text-base font-black text-slate-950 dark:text-white">{title}</h3>
                <span className="ml-auto text-xs font-black text-slate-700 dark:text-slate-200">0{index + 1}</span>
              </div>
              <FeatureList links={visible} />
              <details className="mt-1 border-t border-slate-200 pt-1 dark:border-slate-700">
                <summary className="min-h-11 cursor-pointer rounded-lg px-3 py-3 text-sm font-black text-emerald-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 dark:text-emerald-200">
                  <span aria-hidden="true">すべて見る</span>
                  <span className="sr-only">：{title}</span>
                </summary>
                <FeatureList links={more} />
              </details>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
