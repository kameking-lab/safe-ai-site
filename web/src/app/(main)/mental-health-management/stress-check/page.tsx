import type { Metadata } from "next";
import Link from "next/link";
import {
  ClipboardCheck,
  AlertCircle,
  ListChecks,
  ChevronLeft,
  Route,
} from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { ogImageUrl } from "@/lib/og-url";
import {
  STRESS_CHECK_REQUIREMENTS,
  STRESS_CHECK_PROCEDURE,
} from "@/data/mental-health-rules";
import { ReadinessForm } from "./readiness-form";

const PHASE_CLASS: Record<string, string> = {
  準備期: "bg-sky-100 text-sky-700",
  実施期: "bg-violet-100 text-violet-700",
  事後対応期: "bg-amber-100 text-amber-800",
  "報告・保存期": "bg-emerald-100 text-emerald-700",
};

const _title =
  "ストレスチェック実施チェックリスト｜11項目ベースライン＋自己評価";
const _desc =
  "労働安全衛生規則 第52条の9〜21 に基づくストレスチェック実施11項目のベースライン要件と、自社の実施準備度合いを7問で評価する自己診断ツール。義務事業場・努力義務事業場の両方をカバー。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/mental-health-management/stress-check" },
  openGraph: {
    title: _title,
    description: _desc,
    type: "website",
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: _title,
    description: _desc,
    images: [ogImageUrl(_title, _desc)],
  },
};

export default function StressCheckImplementationPage() {
  return (
    <PageContainer width="prose">
      <PageJsonLd
        name={_title}
        description={_desc}
        path="/mental-health-management/stress-check"
      />

      <div className="mb-2 text-xs">
        <Link
          href="/mental-health-management"
          className="inline-flex items-center gap-1 text-slate-500 hover:text-violet-700"
        >
          <ChevronLeft className="h-3 w-3" aria-hidden="true" />
          メンタルヘルス対策ガイドへ戻る
        </Link>
      </div>

      <PageHeader
        title="ストレスチェック実施チェックリスト"
        description="ベースライン要件11項目と、自社の実施準備度合いを7問で診断"
        icon={ClipboardCheck}
        iconColor="blue"
      />

      {/* 自己評価フォーム（診断ファースト: 結論カードがファーストビューに入るよう説明より先に置く） */}
      <section id="readiness" className="mt-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <ClipboardCheck className="h-5 w-5 text-violet-600" aria-hidden="true" />
          実施準備度合いの自己評価
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          常時使用する労働者数と、7項目への回答をもとに整備率を算出します。回答は端末内のメモリに保持され、送信されません。
        </p>
        <div className="mt-4">
          <ReadinessForm />
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-violet-200 bg-violet-50/60 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-violet-700"
            aria-hidden="true"
          />
          <div className="text-sm leading-6 text-violet-900">
            <p className="font-semibold">使い方</p>
            <p className="mt-1">
              上記の自己評価フォームで自社の整備状況を確認し、未整備項目から優先的に着手してください。判定は労務管理上の参考であり、最終的な実施可否は衛生委員会と実施者（医師・保健師等）の判断に基づきます。
            </p>
          </div>
        </div>
      </section>

      {/* 実施手順（年間の流れ） */}
      <section id="procedure" className="mt-8 scroll-mt-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Route className="h-5 w-5 text-violet-600" aria-hidden="true" />
          実施手順（年間の流れ）
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          初めての事業場はこの順番で進めると抜け漏れを防げます。各ステップの「目安時期」は厚労省実施マニュアルに基づく目安で、確定は衛生委員会で行います。
        </p>
        <ol className="mt-4 space-y-3">
          {STRESS_CHECK_PROCEDURE.map((step, idx) => (
            <li
              key={step.title}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${
                        PHASE_CLASS[step.phase] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {step.phase}
                    </span>
                    <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      🕒 {step.timing}
                    </span>
                    {step.mandatoryOnly && (
                      <span className="inline-block rounded bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                        義務事業場のみ
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1.5 text-sm font-bold text-slate-900">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {step.detail}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-slate-500">
          各ステップの詳細な要件は下記「ベースライン要件」を参照してください。
        </p>
      </section>

      {/* 11項目チェックリスト */}
      <section id="baseline" className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <ListChecks className="h-5 w-5 text-violet-600" aria-hidden="true" />
          ベースライン要件
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          義務事業場（50人以上）／努力義務事業場（50人未満）の適用区分を併記。
        </p>
        <ol className="mt-4 space-y-3">
          {STRESS_CHECK_REQUIREMENTS.map((r, idx) => {
            const isMandatoryOnly =
              r.appliesTo.includes("mandatory") &&
              !r.appliesTo.includes("effort-duty");
            return (
              <li
                key={r.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-baseline gap-2">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
                    {idx + 1}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    {r.label}
                  </h3>
                </div>
                <p className="mt-2 ml-9 text-sm leading-6 text-slate-700">
                  {r.description}
                </p>
                <div className="mt-3 ml-9 flex flex-wrap gap-2">
                  {r.ruleArticles.map((a) => (
                    <span
                      key={a}
                      className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
                    >
                      {a}
                    </span>
                  ))}
                  {isMandatoryOnly && (
                    <span className="inline-block rounded bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                      義務事業場のみ
                    </span>
                  )}
                  {!r.baseline && (
                    <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      推奨
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* 必要書類テンプレへのリンク */}
      <section className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="text-base font-bold text-emerald-900">必要書類・様式</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-emerald-900">
          <li>
            <a
              href="https://www.mhlw.go.jp/bunya/roudoukijun/anzeneisei12/manual.html"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline hover:text-emerald-700"
            >
              厚労省「ストレスチェック制度実施マニュアル」
            </a>
            — 調査票・通知書・申出書・意見書のサンプル様式集（無料）
          </li>
          <li>
            <a
              href="https://www.mhlw.go.jp/bunya/roudoukijun/anzeneisei12/dl/150605-2.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline hover:text-emerald-700"
            >
              職業性ストレス簡易調査票（57項目）
            </a>
            — 厚労省推奨の標準調査票。3領域（仕事負担・ストレス反応・サポート）構成。
          </li>
          <li>
            <span className="font-semibold">様式第6号の2（労基署報告）：</span>
            義務事業場は毎年提出。実施者の氏名・受検者数・面接指導実施件数等を記載。
          </li>
        </ul>
      </section>

      <p className="mt-8 text-center text-xs leading-6 text-slate-500">
        最終更新：2026年5月。本ページは法令・指針の要点解説と労務管理上のガイドです。
        <strong className="text-slate-600">医学的判断は医師相談を前提とします。</strong>
      </p>
    </PageContainer>
  );
}
