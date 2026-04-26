"use client";

import Link from "next/link";
import {
  HardHat,
  Factory,
  Briefcase,
  Truck,
  Heart,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

type PersonaLink = {
  label: string;
  href: string;
};

type Persona = {
  id: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  links: PersonaLink[];
  accent: {
    iconBg: string;
    iconText: string;
    border: string;
    chip: string;
  };
};

const PERSONAS: Persona[] = [
  {
    id: "construction",
    icon: HardHat,
    title: "建設業の職長・安全担当",
    desc: "朝礼のKY・墜落/重機リスク・元請対応を一台で。音声入力＆PDF出力対応。",
    links: [
      { label: "KY用紙を作る", href: "/ky" },
      { label: "リスク予測", href: "/risk-prediction" },
    ],
    accent: {
      iconBg: "bg-amber-100 dark:bg-amber-500/15",
      iconText: "text-amber-700 dark:text-amber-300",
      border: "border-amber-200 dark:border-amber-500/30",
      chip: "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200",
    },
  },
  {
    id: "manufacturing",
    icon: Factory,
    title: "製造業の安全衛生責任者",
    desc: "化学物質RA・法改正・特別教育を体系化し、労基署対応を楽にしたい方へ。",
    links: [
      { label: "化学物質RA", href: "/chemical-ra" },
      { label: "法改正チェック", href: "/laws" },
    ],
    accent: {
      iconBg: "bg-sky-100 dark:bg-sky-500/15",
      iconText: "text-sky-700 dark:text-sky-300",
      border: "border-sky-200 dark:border-sky-500/30",
      chip: "bg-sky-50 text-sky-800 dark:bg-sky-500/10 dark:text-sky-200",
    },
  },
  {
    id: "executive",
    icon: Briefcase,
    title: "中小企業の経営者",
    desc: "属人化・Excel地獄から脱出したい方。月額顧問やコンプラ診断で全体最適化。",
    links: [
      { label: "月額顧問", href: "/consulting" },
      { label: "コンプラ診断", href: "/wizard" },
    ],
    accent: {
      iconBg: "bg-emerald-100 dark:bg-emerald-500/15",
      iconText: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-200 dark:border-emerald-500/30",
      chip: "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200",
    },
  },
  {
    id: "logistics",
    icon: Truck,
    title: "林業・運輸の現場管理",
    desc: "業種別事故傾向・特別教育・KY運用を素早く。フリーランス労災にも対応。",
    links: [
      { label: "事故DB", href: "/accidents" },
      { label: "Eラーニング", href: "/e-learning" },
    ],
    accent: {
      iconBg: "bg-violet-100 dark:bg-violet-500/15",
      iconText: "text-violet-700 dark:text-violet-300",
      border: "border-violet-200 dark:border-violet-500/30",
      chip: "bg-violet-50 text-violet-800 dark:bg-violet-500/10 dark:text-violet-200",
    },
  },
  {
    id: "healthcare",
    icon: Heart,
    title: "医療・福祉の労務担当",
    desc: "メンタル不調・カスハラ・夜勤体制の安全確保。多様な働き方の労務管理に。",
    links: [
      { label: "メンタル/カスハラ", href: "/mental-health" },
      { label: "法令検索", href: "/law-search" },
    ],
    accent: {
      iconBg: "bg-rose-100 dark:bg-rose-500/15",
      iconText: "text-rose-700 dark:text-rose-300",
      border: "border-rose-200 dark:border-rose-500/30",
      chip: "bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200",
    },
  },
  {
    id: "dx",
    icon: Sparkles,
    title: "DX推進・情シス担当",
    desc: "AI×安全分野を業務に組み込みたい方。受託業務／LMS連携で短納期に。",
    links: [
      { label: "受託業務", href: "/services" },
      { label: "LMS（多拠点）", href: "/lms" },
    ],
    accent: {
      iconBg: "bg-indigo-100 dark:bg-indigo-500/15",
      iconText: "text-indigo-700 dark:text-indigo-300",
      border: "border-indigo-200 dark:border-indigo-500/30",
      chip: "bg-indigo-50 text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-200",
    },
  },
];

export function PersonaEntry() {
  return (
    <section
      aria-labelledby="persona-entry-heading"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6"
    >
      <div className="mb-3 flex items-baseline justify-between gap-2 sm:mb-4">
        <div>
          <h2
            id="persona-entry-heading"
            className="text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg"
          >
            あなたに合った入口から
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            役割や業種に応じて、よく使う機能をまとめました。
          </p>
        </div>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PERSONAS.map((p) => {
          const Icon = p.icon;
          return (
            <li
              key={p.id}
              className={`flex flex-col gap-2 rounded-xl border bg-white p-3 shadow-sm transition hover:shadow-md dark:bg-slate-900/60 sm:p-4 ${p.accent.border}`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${p.accent.iconBg}`}
                  aria-hidden="true"
                >
                  <Icon className={`h-5 w-5 ${p.accent.iconText}`} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {p.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {p.desc}
                  </p>
                </div>
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {p.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition hover:underline ${p.accent.chip}`}
                  >
                    {link.label}
                    <span aria-hidden="true">→</span>
                  </Link>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
