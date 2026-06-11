import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Scale, ClipboardList, Database, MessageSquare, FileText } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { COURT_CASE_COUNT } from "@/data/court-cases";
import { CourtCasesBrowser } from "@/components/court-cases/court-cases-browser";
import { CollapsibleDetail } from "@/components/ui/collapsible-detail";

const _title = "労災・労働判例コーナー｜安全配慮義務・過労死から解雇・労働時間・就業規則まで（無料・出典付き）";
const _desc =
  "安全配慮義務・過労死・じん肺/石綿・元請責任・過失相殺といった労働安全の判例に加え、解雇権濫用・雇止め・労働時間/割増賃金・就業規則の不利益変更・パワハラ/セクハラ・労働者性まで、現場で問われる重要な確定判例を「事案の概要＋裁判所の判断要旨＋実務ポイント＋出典リンク」で解説。陸上自衛隊事件・電通事件・秋北バス事件・日本食塩製造事件ほか。争点・分野・裁判所・年代で検索可。すべて実在する確定判例・出典付き・登録不要。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/court-cases" },
  openGraph: {
    title: "労災・労働判例コーナー｜安全配慮義務・過労死から解雇・労働時間・就業規則まで",
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
          {/* 柱0: 件数デカ数字＋1行結論。長い説明は詳細層へ（内容は不変） */}
          <div className="flex items-center gap-2.5">
            <Scale className="h-7 w-7 shrink-0 text-emerald-600" aria-hidden="true" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 lg:text-2xl">労災・労働判例コーナー</h1>
            <span className="rounded-xl bg-emerald-100 px-2.5 py-1 text-2xl font-bold leading-none text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
              {COURT_CASE_COUNT}
              <span className="ml-0.5 text-xs font-semibold">件</span>
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            すべて実在を確認できた確定判例。要旨＋実務ポイント＋出典リンク付き。
          </p>
          <CollapsibleDetail summary="このコーナーの読み方（収載範囲・要約の性質・免責）" className="mt-2 max-w-3xl">
            <p>
              安全配慮義務・過労死・じん肺/石綿・元請責任・過失相殺など、労働安全の実務に直結する
              <strong className="font-semibold">重要な確定判例</strong>を、
              「事案の概要＋裁判所の判断（要旨）＋実務上のポイント＋出典リンク」で解説します。
              すべて<strong className="font-semibold">実在を確認できた確定判例</strong>のみを掲載しています。
            </p>
            <p className="mt-1">
              要旨は当サイトによる要約です。正確な内容は各判例の出典（判決原文）をご確認ください。個別案件は専門家にご相談ください。
            </p>
          </CollapsibleDetail>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/court-cases/employer-liability"
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200"
            >
              ⚖️ 労災で会社・現場監督が問われる「3つの責任」ガイド
            </Link>
            <Link
              href="/court-cases/print"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
            >
              🖨 全{COURT_CASE_COUNT}件をA4まとめ資料で印刷／PDF保存
            </Link>
          </div>
        </header>

        <Suspense fallback={<div className="py-10 text-center text-sm text-slate-400">判例を読み込み中…</div>}>
          <CourtCasesBrowser />
        </Suspense>

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
