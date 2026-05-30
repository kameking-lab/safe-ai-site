import type { Metadata } from "next";
import Link from "next/link";
import { Scale, ClipboardList, Database, MessageSquare, FileText } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { COURT_CASE_COUNT } from "@/data/court-cases";
import { CourtCasesBrowser } from "@/components/court-cases/court-cases-browser";

const _title = "労災裁判例コーナー｜安全配慮義務・過失相殺・元請責任の重要判例（無料・出典付き）";
const _desc =
  "安全配慮義務・過労死・じん肺/石綿・元請責任・過失相殺など、労働安全に関わる重要な確定判例を「事案の概要＋裁判所の判断要旨＋実務ポイント＋出典リンク」で解説。陸上自衛隊事件・川義事件・電通事件・建設アスベスト訴訟ほか。すべて実在する確定判例・出典付き・登録不要。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/court-cases" },
  openGraph: {
    title: "労災裁判例コーナー｜安全配慮義務・過失相殺・元請責任の重要判例",
    description: "労働安全に関わる重要な確定判例を要旨＋出典リンクで。すべて実在判例・無料・登録不要。",
    images: [{ url: ogImageUrl("労災裁判例コーナー"), width: 1200, height: 630 }],
  },
};

export const revalidate = 86400;

export default function CourtCasesPage() {
  return (
    <>
      <PageJsonLd
        name="労災裁判例コーナー"
        description="労働安全に関わる重要な確定判例を、事案の概要・裁判所の判断要旨・実務ポイント・出典リンクで解説。"
        path="/court-cases"
      />
      <PageContainer width="wide">
        <header className="mb-4">
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-emerald-600" aria-hidden="true" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 lg:text-2xl">労災裁判例コーナー</h1>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              {COURT_CASE_COUNT}件
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            安全配慮義務・過労死・じん肺/石綿・元請責任・過失相殺など、労働安全の実務に直結する
            <strong className="font-semibold">重要な確定判例</strong>を、
            「事案の概要＋裁判所の判断（要旨）＋実務上のポイント＋出典リンク」で解説します。
            すべて<strong className="font-semibold">実在を確認できた確定判例</strong>のみを掲載しています。
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            要旨は当サイトによる要約です。正確な内容は各判例の出典（判決原文）をご確認ください。個別案件は専門家にご相談ください。
          </p>
        </header>

        <CourtCasesBrowser />

        {/* 関連機能への導線 */}
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">判例を現場の実務につなげる</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/ky/paper" className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900">
              <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <span><span className="font-semibold">KY用紙</span><br /><span className="text-xs text-slate-500 dark:text-slate-400">安全配慮義務を現場の危険予知で具体化</span></span>
            </Link>
            <Link href="/safety-diary" className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <span><span className="font-semibold">安全工程打合せ書</span><br /><span className="text-xs text-slate-500 dark:text-slate-400">元請・下請の責任分担を1枚で可視化</span></span>
            </Link>
            <Link href="/accident-news" className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900">
              <Database className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <span><span className="font-semibold">重大災害事例</span><br /><span className="text-xs text-slate-500 dark:text-slate-400">過失相殺・賠償の背景になる事故の類型</span></span>
            </Link>
            <Link href="/chatbot" className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900">
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <span><span className="font-semibold">安衛法AIチャット</span><br /><span className="text-xs text-slate-500 dark:text-slate-400">関連する条文・通達を出典付きで確認</span></span>
            </Link>
          </div>
        </section>
      </PageContainer>
    </>
  );
}
