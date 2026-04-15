import type { Metadata } from "next";
import Link from "next/link";
import { Info } from "lucide-react";
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

const PROFILE_ROWS = [
  { label: "氏名", value: "金田 義太（かねだ よしひろ）" },
  { label: "資格", value: "労働安全コンサルタント（登録番号 260022）" },
  {
    label: "事業内容",
    value:
      "労働安全衛生に関するコンサルティング、安全管理システムの開発・提供",
  },
];

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

function TableSection({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: React.ReactNode }[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-bold text-slate-900">{title}</h2>
      <dl className="divide-y divide-slate-100">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[160px_1fr] sm:gap-4"
          >
            <dt className="text-xs font-semibold text-slate-500 sm:text-sm">
              {row.label}
            </dt>
            <dd className="text-sm leading-6 text-slate-700">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

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
        <TableSection title="運営者プロフィール" rows={PROFILE_ROWS} />
        <TableSection
          title="特定商取引法に基づく表記"
          rows={TOKUSHO_ROWS}
        />

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
