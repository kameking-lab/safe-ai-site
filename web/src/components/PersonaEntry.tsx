"use client";

import Link from "next/link";
import {
  Briefcase,
  Building2,
  Cpu,
  HardHat,
  FlaskConical,
  TreePine,
  HeartPulse,
  Handshake,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type SubLink = {
  label: string;
  href: string;
};

type Persona = {
  id: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  // 単一リンクの場合 href を、3分岐の場合 subLinks を指定。
  href?: string;
  subLinks?: SubLink[];
  ctaLabel?: string;
  // テーマカラー（border / accent）。Tailwind JIT 対策で固定文字列で記述。
  accent: {
    border: string;
    iconBg: string;
    iconText: string;
    cta: string;
  };
};

const PERSONAS: Persona[] = [
  {
    id: "smb-owner",
    title: "中小企業の経営者・労務担当",
    desc: "安衛法の義務を1分で診断。必要な選任・健診・提出書類を自動表示。",
    icon: Briefcase,
    href: "/wizard",
    ctaLabel: "コンプラ診断へ",
    accent: {
      border: "border-emerald-300",
      iconBg: "bg-emerald-100",
      iconText: "text-emerald-700",
      cta: "text-emerald-700",
    },
  },
  {
    id: "enterprise-safety",
    title: "大手企業の安全管理者",
    desc: "多拠点LMS・SAML SSO・SCIM・監査ログ。エンタープライズプランの詳細。",
    icon: Building2,
    href: "/pricing#enterprise",
    ctaLabel: "Enterpriseを見る",
    accent: {
      border: "border-slate-300",
      iconBg: "bg-slate-100",
      iconText: "text-slate-700",
      cta: "text-slate-700",
    },
  },
  {
    id: "enterprise-dx",
    title: "大手企業のDX推進担当",
    desc: "REST API・Webhook・SCORM/xAPI連携で社内システムに組み込み。",
    icon: Cpu,
    href: "/api-docs",
    ctaLabel: "API ドキュメント",
    accent: {
      border: "border-sky-300",
      iconBg: "bg-sky-100",
      iconText: "text-sky-700",
      cta: "text-sky-700",
    },
  },
  {
    id: "field-foreman",
    title: "現場の職長・班長",
    desc: "朝礼KY用紙をスマホで作成。音声入力・PDF出力・業種別プリセット対応。",
    icon: HardHat,
    href: "/ky",
    ctaLabel: "KY用紙を開く",
    accent: {
      border: "border-amber-300",
      iconBg: "bg-amber-100",
      iconText: "text-amber-700",
      cta: "text-amber-700",
    },
  },
  {
    id: "manufacturing-safety",
    title: "製造業の安全責任者",
    desc: "化学物質リスクアセスメント・作業環境測定・SDS確認をAIで効率化。",
    icon: FlaskConical,
    href: "/chemical-ra",
    ctaLabel: "化学物質RAへ",
    accent: {
      border: "border-violet-300",
      iconBg: "bg-violet-100",
      iconText: "text-violet-700",
      cta: "text-violet-700",
    },
  },
  {
    id: "forestry-transport",
    title: "林業・運輸の管理者",
    desc: "特別教育12種・チェーンソー・玉掛け・足場・フルハーネス対応。",
    icon: TreePine,
    href: "/education",
    ctaLabel: "特別教育を見る",
    accent: {
      border: "border-emerald-300",
      iconBg: "bg-emerald-100",
      iconText: "text-emerald-700",
      cta: "text-emerald-700",
    },
  },
  {
    id: "healthcare",
    title: "医療・福祉の労務担当",
    desc: "腰痛・夜勤・カスハラ・メンタルヘルス。3つの重点分野から選択。",
    icon: HeartPulse,
    subLinks: [
      { label: "腰痛対策", href: "/education/roudoueisei/youtsu-yobou" },
      { label: "夜勤・カスハラ", href: "/mental-health" },
      { label: "メンタル", href: "/mental-health" },
    ],
    accent: {
      border: "border-rose-300",
      iconBg: "bg-rose-100",
      iconText: "text-rose-700",
      cta: "text-rose-700",
    },
  },
  {
    id: "consultant-sr",
    title: "安全コンサル・社労士",
    desc: "ホワイトラベル提供・OEM・再販。月額顧問への組み込みも歓迎。",
    icon: Handshake,
    href: "/partnership",
    ctaLabel: "パートナー案内",
    accent: {
      border: "border-indigo-300",
      iconBg: "bg-indigo-100",
      iconText: "text-indigo-700",
      cta: "text-indigo-700",
    },
  },
];

export function PersonaEntry() {
  return (
    <section
      aria-labelledby="persona-entry-heading"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">
        あなたに合った入口へ
      </p>
      <h3
        id="persona-entry-heading"
        className="mt-1 text-base font-bold text-slate-900 sm:text-lg"
      >
        立場を選ぶと、最適な機能ページにジャンプできます。
      </h3>
      {/* PC: 4列 × 2行 / モバイル: 2列 × 4行 */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {PERSONAS.map((p) => (
          <PersonaCard key={p.id} persona={p} />
        ))}
      </div>
    </section>
  );
}

function PersonaCard({ persona }: { persona: Persona }) {
  const Icon = persona.icon;
  const card = (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-2">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${persona.accent.iconBg}`}
          aria-hidden="true"
        >
          <Icon className={`h-4 w-4 ${persona.accent.iconText}`} />
        </span>
        <p className="text-xs font-bold leading-snug text-slate-900 sm:text-sm">
          {persona.title}
        </p>
      </div>
      <p className="mt-2 flex-1 text-[11px] leading-5 text-slate-600">
        {persona.desc}
      </p>
      {persona.subLinks ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {persona.subLinks.map((sub) => (
            <Link
              key={sub.label}
              href={sub.href}
              className={`rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold ${persona.accent.cta} hover:bg-slate-50`}
            >
              {sub.label}
            </Link>
          ))}
        </div>
      ) : (
        <span
          className={`mt-3 inline-flex items-center gap-1 text-[11px] font-bold ${persona.accent.cta}`}
        >
          {persona.ctaLabel} <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </span>
      )}
    </div>
  );

  // 3分岐型（subLinks）はカード自体のリンク化を避け、内部リンクのみ操作可能にする
  if (persona.subLinks) {
    return (
      <div
        className={`group flex h-full flex-col rounded-xl border-2 ${persona.accent.border} bg-white p-3 shadow-sm sm:p-4`}
      >
        {card}
      </div>
    );
  }

  return (
    <Link
      href={persona.href ?? "#"}
      className={`group flex h-full flex-col rounded-xl border-2 ${persona.accent.border} bg-white p-3 shadow-sm transition-all hover:shadow-md sm:p-4`}
    >
      {card}
    </Link>
  );
}
