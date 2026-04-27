import Link from "next/link";
import { ClipboardList, Search, Bot, Cloud, FlaskConical, HardHat, Thermometer } from "lucide-react";

type HeroButton = {
  label: string;
  sublabel: string;
  href: string;
  icon: React.ReactNode;
  bg: string;
};

type Shortcut = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

const HERO_BUTTONS: HeroButton[] = [
  {
    label: "今日のKYを書く",
    sublabel: "朝礼3分で完了",
    href: "/ky",
    icon: <ClipboardList size={44} aria-hidden="true" />,
    bg: "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800",
  },
  {
    label: "事故事例を検索",
    sublabel: "厚労省DB連携",
    href: "/accidents",
    icon: <Search size={44} aria-hidden="true" />,
    bg: "bg-amber-600 hover:bg-amber-700 active:bg-amber-800",
  },
  {
    label: "AIに聞く",
    sublabel: "安衛法チャット",
    href: "/chatbot",
    icon: <Bot size={44} aria-hidden="true" />,
    bg: "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
  },
  {
    label: "気象警報",
    sublabel: "現場リスク確認",
    href: "/risk-prediction",
    icon: <Cloud size={44} aria-hidden="true" />,
    bg: "bg-sky-500 hover:bg-sky-600 active:bg-sky-700",
  },
];

const SHORTCUTS: Shortcut[] = [
  {
    label: "化学物質検索",
    href: "/chemical-database",
    icon: <FlaskConical size={26} aria-hidden="true" />,
  },
  {
    label: "フルハーネス",
    href: "/education",
    icon: <HardHat size={26} aria-hidden="true" />,
  },
  {
    label: "熱中症WBGT",
    href: "/education",
    icon: <Thermometer size={26} aria-hidden="true" />,
  },
];

export function QuickLauncher() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* 4大ヒーローボタン */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {HERO_BUTTONS.map((btn) => (
          <Link
            key={btn.href}
            href={btn.href}
            className={`flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl p-5 text-center text-white shadow-lg transition-transform active:scale-95 ${btn.bg}`}
          >
            <span className="opacity-95">{btn.icon}</span>
            <span className="text-lg font-bold leading-snug sm:text-xl">{btn.label}</span>
            <span className="text-xs font-normal opacity-75">{btn.sublabel}</span>
          </Link>
        ))}
      </div>

      {/* ショートカットグリッド */}
      <div className="mt-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          よく使うツール
        </p>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {SHORTCUTS.map((s) => (
            <Link
              key={`${s.href}-${s.label}`}
              href={s.href}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-4 text-center text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <span className="text-slate-500 dark:text-slate-400">{s.icon}</span>
              <span className="text-xs font-semibold leading-tight">{s.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
