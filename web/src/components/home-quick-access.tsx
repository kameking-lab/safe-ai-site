import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Database,
  Scale,
} from "lucide-react";

const TASKS = [
  {
    title: "今日の安全",
    description: "地域と作業を選び、朝礼要点を確認",
    href: "/risk",
    cta: "今日の安全を見る",
    icon: AlertTriangle,
    secondary: null,
    number: "01",
    kicker: "NOW / MORNING",
    surface: "border-orange-300 bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 dark:border-orange-700 dark:from-orange-950/60 dark:via-slate-900 dark:to-amber-950/50",
    visual: "bg-orange-950 text-orange-300",
    button: "bg-orange-700 text-white hover:bg-orange-800",
  },
  {
    title: "KY・工程書を作る",
    description: "危険と対策を選び、確認・印刷へ",
    href: "/ky/paper",
    cta: "KYを作成する",
    icon: ClipboardList,
    secondary: { href: "/safety-diary", label: "工程書を作る" },
    number: "02",
    kicker: "MAKE / CONFIRM",
    surface: "border-sky-300 bg-gradient-to-br from-sky-100 via-white to-emerald-100 dark:border-sky-700 dark:from-sky-950/60 dark:via-slate-900 dark:to-emerald-950/50",
    visual: "bg-sky-950 text-cyan-300",
    button: "bg-sky-800 text-white hover:bg-sky-900",
  },
  {
    title: "資格・法令を調べる",
    description: "作業条件や条文から必要情報へ",
    href: "/law-search",
    cta: "法令を検索する",
    icon: Scale,
    secondary: {
      href: "/education-certification/finder",
      label: "資格を確認する",
    },
    number: "03",
    kicker: "FIND / VERIFY",
    surface: "border-indigo-300 bg-gradient-to-br from-indigo-100 via-white to-emerald-100 dark:border-indigo-700 dark:from-indigo-950/60 dark:via-slate-900 dark:to-emerald-950/50",
    visual: "bg-indigo-950 text-emerald-300",
    button: "bg-indigo-800 text-white hover:bg-indigo-900",
  },
  {
    title: "事故・化学物質を調べる",
    description: "事例やSDSから対策の根拠を確認",
    href: "/accidents",
    cta: "事故例を探す",
    icon: Database,
    secondary: { href: "/chemical-ra", label: "物質を評価する" },
    number: "04",
    kicker: "LEARN / PREVENT",
    surface: "border-amber-300 bg-gradient-to-br from-amber-100 via-white to-teal-100 dark:border-amber-700 dark:from-amber-950/60 dark:via-slate-900 dark:to-teal-950/50",
    visual: "bg-[#29251f] text-yellow-300",
    button: "bg-teal-800 text-white hover:bg-teal-900",
  },
] as const;

export function HomeQuickAccess() {
  return (
    <section
      aria-labelledby="home-primary-tasks"
      className="relative mx-auto max-w-7xl overflow-hidden px-4 py-10 [content-visibility:auto] [contain-intrinsic-size:auto_720px] sm:py-14"
    >
      <div
        className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-800/15 forced-colors:hidden"
        aria-hidden="true"
      />
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-black tracking-[.18em] text-emerald-800 dark:text-emerald-200">
            START HERE · 4 TASKS
          </p>
          <h2
            id="home-primary-tasks"
            aria-label="やることを選ぶ"
            className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl"
          >
            要対応の記録から、すぐ始める
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            迷ったら、目的にいちばん近いシーンを選んでください。
          </p>
        </div>
        <Link
          href="/search"
          prefetch={false}
          className="inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-bold text-emerald-900 underline underline-offset-4 focus-visible:ring-4 focus-visible:ring-emerald-300 dark:text-emerald-200"
        >
          名前から検索する
        </Link>
      </div>

      <ul className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {TASKS.map(
          ({
            title,
            description,
            href,
            cta,
            icon: Icon,
            secondary,
            number,
            kicker,
            surface,
            visual,
            button,
          }) => (
            <li
              key={title}
              className={`group relative flex min-w-0 flex-col overflow-hidden rounded-[1.75rem] border-2 shadow-[0_24px_55px_-35px_rgba(15,23,42,.65)] transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-[0_32px_65px_-35px_rgba(15,23,42,.75)] motion-reduce:transform-none motion-reduce:transition-none ${surface}`}
            >
              <div className={`relative flex min-h-32 items-center justify-between overflow-hidden p-5 ${visual}`}>
                <span className="absolute -bottom-14 -right-3 text-[9rem] font-black leading-none text-white/45" aria-hidden="true">
                  {number}
                </span>
                <span>
                  <span className="block text-[10px] font-black tracking-[.18em] text-current opacity-80">
                    {kicker}
                  </span>
                  <span className="mt-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-lg">
                    <Icon className="h-8 w-8" aria-hidden="true" />
                  </span>
                </span>
                <span className="relative z-10 text-5xl font-black text-white/80">{number}</span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-xl font-black leading-tight text-slate-950 dark:text-white">
                  {title}
                </h3>
                <p className="mt-2 flex-1 text-sm font-medium leading-6 text-slate-700 dark:text-slate-200">
                  {description}
                </p>
                <Link
                  href={href}
                  prefetch={false}
                  className={`mt-5 inline-flex min-h-12 items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm font-black shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 ${button}`}
                >
                  {cta}
                  <ArrowRight
                    className="h-4 w-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
                {secondary ? (
                  <Link
                    href={secondary.href}
                    prefetch={false}
                    className="mt-1 inline-flex min-h-11 items-center justify-center rounded-lg px-3 py-2 text-sm font-black text-slate-800 underline decoration-2 underline-offset-4 focus-visible:ring-4 focus-visible:ring-emerald-300 dark:text-slate-100"
                  >
                    {secondary.label}
                  </Link>
                ) : (
                  <span className="mt-1 min-h-11" aria-hidden="true" />
                )}
              </div>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
