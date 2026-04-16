import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Info,
  FileText,
  AlertCircle,
  BookOpen,
  GraduationCap,
  Scale,
  Mail,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "運営者情報・特定商取引法に基づく表記",
  description:
    "ANZEN AI の運営者情報および特定商取引法に基づく表記ページです。",
  openGraph: {
    title: "運営者情報・特定商取引法に基づく表記｜ANZEN AI",
    description:
      "ANZEN AI の運営者情報および特定商取引法に基づく表記ページです。",
  },
};

const STATS = [
  { icon: Scale, label: "法改正", value: "100件+", color: "sky" },
  { icon: AlertCircle, label: "事故事例", value: "200件+", color: "red" },
  { icon: GraduationCap, label: "過去問", value: "1,000問+", color: "amber" },
  { icon: FileText, label: "法令条文", value: "131条", color: "emerald" },
  { icon: BookOpen, label: "Eラーニング", value: "200問+", color: "violet" },
] as const;

const COLOR_MAP = {
  sky: {
    bg: "bg-sky-50",
    border: "border-sky-200",
    icon: "bg-sky-100 text-sky-600",
    label: "text-sky-800",
    value: "text-sky-900",
  },
  red: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: "bg-red-100 text-red-600",
    label: "text-red-800",
    value: "text-red-900",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: "bg-amber-100 text-amber-600",
    label: "text-amber-800",
    value: "text-amber-900",
  },
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: "bg-emerald-100 text-emerald-600",
    label: "text-emerald-800",
    value: "text-emerald-900",
  },
  violet: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    icon: "bg-violet-100 text-violet-600",
    label: "text-violet-800",
    value: "text-violet-900",
  },
} as const;

const TOKUSHO_ROWS: { label: string; value: React.ReactNode }[] = [
  { label: "販売業者名", value: "金田 義太" },
  {
    label: "所在地",
    value: (
      <>
        お問い合わせください（
        <Link href="/contact" className="underline hover:text-slate-800">
          お問い合わせフォーム
        </Link>
        ）
      </>
    ),
  },
  {
    label: "連絡先",
    value: (
      <Link href="/contact" className="underline hover:text-slate-800">
        お問い合わせフォームよりご連絡ください
      </Link>
    ),
  },
  {
    label: "販売価格",
    value: "各サービスページに記載（税込表示）",
  },
  {
    label: "支払方法",
    value: "クレジットカード（準備中）",
  },
  {
    label: "支払時期",
    value: "お申し込み時",
  },
  {
    label: "サービス提供時期",
    value: "お申し込み完了後、即時提供",
  },
  {
    label: "返品・キャンセル",
    value:
      "デジタルコンテンツの性質上、原則として返金はお受けできません。詳細はお問い合わせください。",
  },
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <PageHeader
        title="運営者情報・特定商取引法に基づく表記"
        description="ANZEN AI の運営者情報と特商法表記"
        icon={Info}
        iconColor="emerald"
      />

      <div className="mt-6 space-y-6">
        {/* 監修者プロフィール */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-900">
            監修者プロフィール
          </h2>
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            {/* マスコット */}
            <div className="flex-shrink-0">
              <Image
                src="/mascot/mascot-chihuahua-4.png"
                alt="ANZEN AI マスコット"
                width={100}
                height={100}
                className="drop-shadow-md"
              />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-2xl font-bold text-slate-900 sm:text-3xl">
                金田 義太
              </p>
              <p className="mt-1 text-base text-slate-500">
                かねた よした
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700 border border-emerald-200">
                <Scale className="h-4 w-4" />
                労働安全コンサルタント 登録番号 260022
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                労働安全衛生に関するコンサルティング・安全管理システムの開発・提供を行っています。
                現場の安全を支えるデジタルツールとして ANZEN AI を監修・運営しています。
              </p>
            </div>
          </div>
        </section>

        {/* サイトの実績 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-900">
            サイトの実績
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {STATS.map((stat) => {
              const c = COLOR_MAP[stat.color];
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center ${c.bg} ${c.border}`}
                >
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${c.icon}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className={`text-lg font-bold leading-none ${c.value}`}>
                    {stat.value}
                  </p>
                  <p className={`text-xs font-medium ${c.label}`}>
                    {stat.label}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* お問い合わせ */}
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 text-center">
          <p className="text-sm font-semibold text-emerald-800 mb-1">
            ご質問・ご要望はお気軽に
          </p>
          <p className="text-xs text-slate-600 mb-4">
            システムの導入相談・機能リクエスト・不具合報告など何でもお問い合わせください。
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            <Mail className="h-4 w-4" />
            お問い合わせはこちら
          </Link>
        </div>

        {/* 特定商取引法 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-900">
            特定商取引法に基づく表記
          </h2>
          <dl className="divide-y divide-slate-100">
            {TOKUSHO_ROWS.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[160px_1fr] sm:gap-4"
              >
                <dt className="text-xs font-semibold text-slate-500 sm:text-sm">
                  {row.label}
                </dt>
                <dd className="text-sm leading-6 text-slate-700">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* 免責事項 */}
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-800 leading-6">
          <p className="font-semibold mb-1">免責事項</p>
          <p>
            本サービスが提供する情報は、労働安全衛生に関する一般的な情報提供を目的としています。
            個別の法的判断・安全管理措置については、必ず専門家にご相談ください。
            本サービスの利用によって生じた損害について、運営者は責任を負いかねます。
          </p>
        </div>
      </div>
    </main>
  );
}
