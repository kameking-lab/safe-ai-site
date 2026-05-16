import type { Metadata } from "next";
import Link from "next/link";
import {
  Stethoscope,
  AlertCircle,
  ListChecks,
  FileText,
  Briefcase,
  ChevronLeft,
} from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { ogImageUrl } from "@/lib/og-url";
import {
  INTERVIEW_FLOW_STEPS,
  PHYSICIAN_OPINION_TEMPLATE,
} from "@/data/mental-health-rules";
import { JobClassTabs } from "./job-class-tabs";

const _title =
  "高ストレス者 面接指導フロー｜医師意見書テンプレと就業上の措置";
const _desc =
  "ストレスチェック結果通知から事後措置・経過観察までの8ステップフロー。医師意見書テンプレートと、職種別（事務・現場・運転・夜勤・医療介護・接客）の就業上の措置案を実務担当者向けに整理。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/mental-health-management/interview-guidance" },
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

const OWNER_LABEL = {
  employer: "事業者",
  implementer: "実施者",
  "industrial-physician": "産業医",
  worker: "労働者本人",
} as const;

const OWNER_COLOR = {
  employer: "bg-violet-100 text-violet-700",
  implementer: "bg-emerald-100 text-emerald-700",
  "industrial-physician": "bg-sky-100 text-sky-700",
  worker: "bg-amber-100 text-amber-800",
} as const;

export default function InterviewGuidancePage() {
  return (
    <PageContainer width="prose">
      <PageJsonLd
        name={_title}
        description={_desc}
        path="/mental-health-management/interview-guidance"
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
        title="高ストレス者 面接指導フロー"
        description="結果通知→申出→面接→事後措置→経過観察までの8ステップを実務担当者向けに整理"
        icon={Stethoscope}
        iconColor="blue"
      />

      <section className="mt-6 rounded-2xl border border-sky-200 bg-sky-50/60 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-sky-700"
            aria-hidden="true"
          />
          <div className="text-sm leading-6 text-sky-900">
            <p className="font-semibold">本ページの位置付け</p>
            <p className="mt-1">
              本ページは労働安全衛生規則 第52条の15〜18 および厚労省『ストレスチェック制度実施マニュアル』に基づく
              <strong className="font-semibold">面接指導の実務フロー</strong>です。
              医師意見書のテンプレートと、職種別の就業上の措置案を例示します。
              個別の医学的判断（診断・服薬・就業可否）は医師（産業医・主治医）の専管事項です。
            </p>
          </div>
        </div>
      </section>

      {/* 8ステップフロー */}
      <section id="flow" className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <ListChecks className="h-5 w-5 text-sky-600" aria-hidden="true" />
          標準フロー（8ステップ）
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          各ステップに目安期限と責任者を記載。期限は前ステップ完了後からの経過日数です。
        </p>
        <ol className="mt-4 space-y-3">
          {INTERVIEW_FLOW_STEPS.map((s) => (
            <li
              key={s.no}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
                  {s.no}
                </span>
                <h3 className="text-sm font-bold text-slate-900">{s.title}</h3>
                <span
                  className={`ml-auto inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${OWNER_COLOR[s.owner]}`}
                >
                  担当：{OWNER_LABEL[s.owner]}
                </span>
              </div>
              <p className="mt-2 ml-9 text-sm leading-6 text-slate-700">{s.body}</p>
              {s.deadlineDays !== null && (
                <p className="mt-2 ml-9 inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  目安期限：前ステップから{s.deadlineDays}日以内
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* 職種別 措置案 */}
      <section id="job-class-overlay" className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Briefcase className="h-5 w-5 text-sky-600" aria-hidden="true" />
          職種別 就業上の措置案
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          医師意見書をふまえた事後措置を検討する際の出発点。本人の状況に合わせて取捨選択してください。
        </p>
        <div className="mt-4">
          <JobClassTabs />
        </div>
      </section>

      {/* 医師意見書テンプレート */}
      <section id="opinion-template" className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <FileText className="h-5 w-5 text-sky-600" aria-hidden="true" />
          医師意見書テンプレート
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          MHLW参考様式『面接指導結果報告書及び事後措置に係る意見書』を操作カテゴリ別に整理。臨床的な所見部分は医師が記載します。
        </p>
        <div className="mt-4 space-y-3">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900">宛先</h3>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              {PHYSICIAN_OPINION_TEMPLATE.recipient}
            </p>
          </article>
          {[
            {
              title: "労働者情報",
              items: PHYSICIAN_OPINION_TEMPLATE.workerFields,
            },
            {
              title: "就業可否判断",
              items: PHYSICIAN_OPINION_TEMPLATE.fitnessAssessment,
            },
            {
              title: "推奨される就業上の措置",
              items: PHYSICIAN_OPINION_TEMPLATE.recommendedMeasures,
            },
            {
              title: "経過観察に関する留意点",
              items: PHYSICIAN_OPINION_TEMPLATE.observationPoints,
            },
          ].map((sec) => (
            <article
              key={sec.title}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <h3 className="text-sm font-bold text-slate-900">{sec.title}</h3>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-700">
                {sec.items.map((it) => (
                  <li key={it} className="flex gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                    {it}
                  </li>
                ))}
              </ul>
            </article>
          ))}
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900">次回更新予定</h3>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              {PHYSICIAN_OPINION_TEMPLATE.reviewSchedule}
            </p>
          </article>
        </div>
      </section>

      {/* 関連法令 */}
      <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-base font-bold text-slate-900">関連法令・指針</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
          <li>
            <strong className="font-semibold">労働安全衛生法 第66条の10：</strong>
            ストレスチェック実施と面接指導の根拠条文。
          </li>
          <li>
            <strong className="font-semibold">労働安全衛生規則 第52条の15〜18：</strong>
            面接指導の申出受付・実施・記録・事後措置の具体手続き。
          </li>
          <li>
            <strong className="font-semibold">労働契約法 第5条：</strong>
            使用者の安全配慮義務。事後措置を講じないことが債務不履行と評価される可能性。
          </li>
          <li>
            <strong className="font-semibold">心理的負荷による精神障害の認定基準（令和5年改正）：</strong>
            精神障害発症時の労災認定の基準。長時間労働・ハラスメント等の出来事評価。
          </li>
        </ul>
      </section>

      <p className="mt-8 text-center text-xs leading-6 text-slate-500">
        最終更新：2026年5月。本ページは法令・指針の要点解説と労務管理上のガイドです。
        <strong className="text-slate-600">医学的判断（診断・治療・就業可否）は医師の専管事項であり、本サイトは個別の医学的助言を行いません。</strong>
      </p>
    </PageContainer>
  );
}
