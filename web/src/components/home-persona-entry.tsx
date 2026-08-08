import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  HardHat,
  Scale,
  UserPlus,
  UserRound,
} from "lucide-react";

type Persona = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  accent: string;
  surface: string;
};

const PERSONAS: Persona[] = [
  {
    href: "/risk",
    icon: HardHat,
    label: "職長・現場代理人",
    description: "今日の警報・予報と朝礼要点へ",
    accent: "bg-emerald-800",
    surface: "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40",
  },
  {
    href: "/ky/paper",
    icon: UserRound,
    label: "一人親方",
    description: "一人KYを作り、危険と対策を確認",
    accent: "bg-orange-700",
    surface: "border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/40",
  },
  {
    href: "/safety-diary",
    icon: Building2,
    label: "安全衛生担当",
    description: "工程・人員・対策を帳票に整理",
    accent: "bg-sky-800",
    surface: "border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/40",
  },
  {
    href: "/services/automation",
    icon: BriefcaseBusiness,
    label: "経営者",
    description: "料金と事例を見て改善相談を準備",
    accent: "bg-violet-800",
    surface: "border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/40",
  },
  {
    href: "/law-search",
    icon: Scale,
    label: "専門家",
    description: "条文と一次資料を条件から検索",
    accent: "bg-indigo-800",
    surface: "border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/40",
  },
  {
    href: "/education-certification/finder",
    icon: UserPlus,
    label: "作業員・新入社員",
    description: "作業内容から必要な教育・資格を確認",
    accent: "bg-teal-800",
    surface: "border-teal-300 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/40",
  },
];

export function HomePersonaEntry() {
  return (
    <section
      aria-labelledby="home-persona-title"
      className="mx-auto max-w-7xl px-4 py-12 sm:py-16"
    >
      <div className="relative min-h-[300px] overflow-hidden rounded-[2rem] border-2 border-sky-800 bg-slate-950 shadow-2xl sm:min-h-[380px]">
        {/* eslint-disable-next-line @next/next/no-img-element -- 画面外の既最適化WebPはnative lazy-loadを使う */}
        <img
          src="/visual-refresh/safety-operations-panorama-768.webp"
          srcSet="/visual-refresh/safety-operations-panorama-768.webp 768w, /visual-refresh/safety-operations-panorama-1200.webp 1200w"
          alt="建設、製造、物流、事務、教育を安全確認の流れでつなぐ現場運用のイラスト"
          width={1200}
          height={675}
          sizes="(max-width: 1280px) 100vw, 1280px"
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/75 to-transparent" />
        <div className="relative z-10 flex min-h-[300px] max-w-xl flex-col justify-end p-6 text-white sm:min-h-[380px] sm:p-10">
          <p className="text-xs font-black tracking-[.12em] text-cyan-300">
            あなたの立場を選ぶ
          </p>
          <h2
            id="home-persona-title"
            aria-label="あなたの立場を選ぶ"
            className="mt-3 text-3xl font-black leading-tight sm:text-5xl"
          >
            あなたの立場から、
            <span className="block text-yellow-300">次の一手へ。</span>
          </h2>
          <p className="mt-4 max-w-lg text-sm font-semibold leading-7 text-slate-100 sm:text-base">
            現場、管理、経営、専門実務。役割ごとに最初に必要な画面へ案内します。
          </p>
        </div>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {PERSONAS.map(({ href, icon: Icon, label, description, accent, surface }, index) => (
          <li key={label}>
            <Link
              href={href}
              prefetch={false}
              className={`group relative flex h-full min-h-[132px] flex-col overflow-hidden rounded-2xl border-2 p-3 shadow-sm transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 motion-reduce:transform-none motion-reduce:transition-none sm:p-4 ${surface}`}
            >
              <span className="absolute right-3 top-2 text-4xl font-black text-slate-900/60 dark:text-white/60" aria-hidden="true">
                0{index + 1}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white forced-colors:border ${accent}`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="text-sm font-black leading-tight text-slate-950 dark:text-white sm:text-base">
                  {label}
                </h3>
              </div>
              <p className="mt-3 flex-1 text-xs font-medium leading-5 text-slate-700 dark:text-slate-200 sm:text-sm">
                {description}
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-black text-emerald-900 dark:text-emerald-200">
                機能を開く
                <ArrowRight
                  className="h-4 w-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
