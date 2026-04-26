import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Info, ChevronRight, Tag } from "lucide-react";
import { ogImageUrl } from "@/lib/og-url";
import { JsonLd } from "@/components/json-ld";
import casesData from "@/data/cases.json";

const TITLE = "導入事例・ユースケース｜想定ペルソナ事例";
const DESCRIPTION =
  "ANZEN AI の想定ユースケースをペルソナ事例として紹介。建設業KYデジタル化・化学物質RA・介護教育・社労士業務効率化・運輸フォーク特別教育。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/cases" },
  openGraph: {
    title: `${TITLE}｜ANZEN AI`,
    description: DESCRIPTION,
    images: [{ url: ogImageUrl(TITLE, DESCRIPTION), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(TITLE, DESCRIPTION)],
  },
};

const PLAN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Standard: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  Pro: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  Business: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
};

type Case = (typeof casesData)[number];

function planColor(plan: string) {
  return PLAN_COLORS[plan] ?? { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };
}

export default function CasesPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: TITLE,
          description: DESCRIPTION,
          url: "https://safe-ai-site.vercel.app/cases",
        }}
      />

      <header className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
          <Building2 className="h-3.5 w-3.5" />
          ユースケース
        </div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
          導入事例・ユースケース
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
          様々な業種・規模の現場でどのように活用できるかをご紹介します。
        </p>
      </header>

      {/* 免責バナー */}
      <div className="mb-8 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-sm leading-6 text-amber-900">
          <span className="font-bold">当サービスは2026年4月リリースの新サービスです。</span>
          以下は想定ユースケースです。実導入事例は順次追加予定。
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(casesData as Case[]).map((c) => {
          const pc = planColor(c.plan);
          return (
            <Link
              key={c.slug}
              href={`/cases/${c.slug}`}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              {/* ペルソナバッジ */}
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                  <Tag className="h-2.5 w-2.5" />
                  ペルソナ事例（想定ユースケース）
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${pc.bg} ${pc.text} ${pc.border}`}>
                  {c.plan}
                </span>
              </div>

              <h2 className="text-base font-bold text-slate-900 leading-snug group-hover:text-emerald-700 transition-colors">
                {c.company}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {c.industry}・{c.segment}・{c.size}名
              </p>

              <p className="mt-3 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg px-2.5 py-1.5 border border-emerald-100 self-start">
                {c.useCase}
              </p>

              <p className="mt-3 text-xs leading-5 text-slate-600 line-clamp-3">
                {c.headline}
              </p>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800">
                  ¥{c.price.toLocaleString("ja-JP")}
                  <span className="text-xs font-medium text-slate-500">/月</span>
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 group-hover:gap-2 transition-all">
                  詳細を見る <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 text-center">
        <p className="text-sm font-semibold text-emerald-800">
          貴社のユースケースをご相談ください
        </p>
        <p className="mt-2 text-xs text-slate-600">
          業種・規模・課題を教えていただければ、最適なプランと活用方法をご提案します。
        </p>
        <Link
          href="/contact"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
        >
          無料相談を申し込む
        </Link>
      </section>
    </main>
  );
}
