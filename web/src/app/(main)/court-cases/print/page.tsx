import type { Metadata } from "next";
import Link from "next/link";
import { COURT_CASES, COURT_CASE_COUNT } from "@/data/court-cases";
import { CourtCasesPrintButton } from "@/components/court-cases/court-cases-print-button";

export const metadata: Metadata = {
  title: "労災裁判例まとめ（印刷用）｜安全AIポータル",
  description: "労働安全に関わる重要な確定判例の要旨を、出典付きでA4にまとめた説明資料ビュー。",
  alternates: { canonical: "/court-cases/print" },
  robots: { index: false },
};

export const revalidate = 86400;

function todayJa(): string {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function CourtCasesPrintPage() {
  const cases = [...COURT_CASES].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="mx-auto max-w-[820px] bg-white px-6 py-6 text-slate-900 print:px-0 print:py-0">
      {/* 操作バー（印刷時は隠す） */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href="/court-cases" className="text-sm font-semibold text-emerald-700 hover:underline">
          ← 労災裁判例コーナーに戻る
        </Link>
        <CourtCasesPrintButton />
      </div>

      {/* 資料ヘッダ */}
      <header className="border-b-2 border-slate-800 pb-2">
        <h1 className="text-xl font-bold">労働安全に関する重要裁判例（説明資料）</h1>
        <p className="mt-0.5 text-xs text-slate-600">
          {COURT_CASE_COUNT}件　／　作成日: {todayJa()}　／　労働安全衛生コンサルタント（登録番号260022）監修
        </p>
      </header>

      {/* 判例リスト */}
      <ol className="mt-3 space-y-2.5">
        {cases.map((c, i) => (
          <li key={c.id} className="break-inside-avoid rounded border border-slate-300 p-2.5 text-[13px]">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-bold">{i + 1}.</span>
              <span className="font-bold">{c.name}</span>
              <span className="text-slate-600">
                {c.court}　{c.dateLabelJa}（{c.date.replace(/-/g, "/")}）
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-slate-600">
              <span>争点: {c.issues.join("・")}</span>
              <span>分野: {c.field}</span>
              {c.citation && <span>{c.citation}</span>}
            </div>
            <p className="mt-1 leading-snug">
              <span className="font-semibold">裁判所の判断（要旨）: </span>
              {c.holding}
            </p>
            <p className="mt-1 text-[12px] text-slate-600">
              出典: {c.sources.map((s) => s.label).join(" ／ ")}
            </p>
          </li>
        ))}
      </ol>

      {/* 出典・免責フッタ */}
      <footer className="mt-4 border-t border-slate-300 pt-2 text-[11px] leading-relaxed text-slate-500">
        各判例の要旨は、裁判所「裁判例検索」・厚生労働省・法務省・判例集等の公表情報をもとにした当サイトによる要約です。
        正確な内容は各判例の出典（判決原文）をご確認ください。事件名は実務・学術で定着した通称を用い、当事者の特定情報は含みません。
        本資料は一般的な情報提供であり、個別の事案に対する法的助言ではありません。具体的な対応は、弁護士・社会保険労務士・労働安全/衛生コンサルタント等の専門家にご相談ください。
        © 2026 安全AIポータル
      </footer>
    </div>
  );
}
