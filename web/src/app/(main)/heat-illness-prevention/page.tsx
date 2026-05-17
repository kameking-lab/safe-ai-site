import type { Metadata } from "next";
import Link from "next/link";
import {
  Thermometer,
  Sun,
  ShieldAlert,
  ListChecks,
  AlertCircle,
  Building2,
  FileText,
  ExternalLink,
} from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { INDUSTRY_HEAT_RULES, R7_EFFECTIVE_FROM, R7_EFFECTIVE_FROM_JP, R7_SOURCES } from "@/data/heat-illness-rules";

const _title =
  "熱中症対策ハブ｜WBGT計算機・業種別リスク判定・R7安衛則改正チェックリスト";
const _desc =
  "労働安全衛生規則第612条の2（令和7年6月1日施行）に対応した職場の熱中症対策ポータル。JIS Z 8504準拠のWBGT計算機、10業種別の暑熱リスク判定、R7改正コンプライアンスチェックリストと社内文書テンプレートをまとめて提供します。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/heat-illness-prevention" },
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

const FRAMEWORK_STEPS = [
  {
    no: 1,
    title: "暑熱環境の見える化",
    body: "WBGT測定器（または推計値）で作業現場のWBGTを把握。1時間ごと、超過時は30分ごとに記録します。",
  },
  {
    no: 2,
    title: "リスクレベル判定と作業調整",
    body: "JSOH/厚労省基準により4段階（注意／警戒／厳重警戒／危険）に分類し、休憩時間・水分補給・作業中止を判断します。",
  },
  {
    no: 3,
    title: "暑熱順化と教育",
    body: "新規入場者・復帰者は7日以上かけて段階的に負荷を上げます。年1回以上の熱中症予防教育を全員に実施します。",
  },
  {
    no: 4,
    title: "発症時の初期対応",
    body: "現場掲示の対応フローに従い、冷却・経口補水・救急通報を行います。バディ制で単独作業を避けます。",
  },
];

const RELATED_LINKS = [
  {
    href: "/education/roudoueisei/necchu",
    label: "Eラーニング：熱中症予防",
    description: "現場作業者向けの基本教材。暑熱順化・症状・対応をテスト付きで学習できます。",
  },
  {
    href: "/health-checkup-scheduler",
    label: "健康診断スケジューラ",
    description: "暑熱作業者の年2回健診（特殊健康診断）の対象判定にも活用できます。",
  },
  {
    href: "/treatment-work-balance",
    label: "治療と仕事の両立支援",
    description: "循環器疾患・糖尿病など熱中症ハイリスク労働者の労務配慮を整理しています。",
  },
  {
    href: "/strategy/plan-generator",
    label: "年次安全衛生計画ジェネレーター",
    description: "熱中症予防対策を年間計画書の『健康管理』セクションに反映できます。",
  },
  {
    href: "/accidents-reports/construction",
    label: "建設業の事故分析レポート",
    description: "熱中症が頻発する建設業の労働災害統計・原因分析をまとめています。",
  },
];

export default function HeatIllnessPreventionHubPage() {
  return (
    <PageContainer width="prose">
      <PageJsonLd
        name={_title}
        description={_desc}
        path="/heat-illness-prevention"
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: _title,
          url: "https://www.anzen-ai-portal.jp/heat-illness-prevention",
          description: _desc,
          about: {
            "@type": "Thing",
            name: "労働安全衛生 熱中症予防対策",
          },
        }}
      />
      <PageHeader
        title="熱中症対策ハブ"
        description="WBGT計算機・業種別リスク判定・R7安衛則改正対応をまとめた現場運用ポータル"
        icon={Sun}
        iconColor="amber"
      />

      <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
            aria-hidden="true"
          />
          <div className="text-sm leading-6 text-amber-900">
            <p className="font-semibold">本ページの位置付け</p>
            <p className="mt-1">
              本ページは
              <strong className="font-semibold">
                労働安全衛生規則第612条の2（令和7年6月1日施行）
              </strong>
              に対応した職場の熱中症対策ガイドです。
              JIS Z 8504準拠のWBGT計算式と厚労省「職場における熱中症予防対策マニュアル」を参照しています。
              個別作業の安全判断は事業者・産業医・職長が現場状況を踏まえて行ってください。
            </p>
            <p className="mt-2 text-xs text-amber-800">
              改正施行日：{R7_EFFECTIVE_FROM}（{R7_EFFECTIVE_FROM_JP}）— 厚生労働省令第86号
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href="/heat-illness-prevention/wbgt-calculator"
          className="group rounded-2xl border border-orange-200 bg-white p-5 shadow-sm transition hover:border-orange-400 hover:bg-orange-50/40"
        >
          <Thermometer className="h-7 w-7 text-orange-600" aria-hidden="true" />
          <h2 className="mt-3 text-base font-bold text-slate-900">
            WBGT計算機
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            気温・湿度・黒球温度を入力すると、JIS Z 8504式でWBGTとリスクレベル・推奨対策を瞬時に算出。
          </p>
          <p className="mt-3 text-xs font-semibold text-orange-700 group-hover:underline">
            計算機を開く →
          </p>
        </Link>
        <Link
          href="/heat-illness-prevention/industry-risk"
          className="group rounded-2xl border border-amber-200 bg-white p-5 shadow-sm transition hover:border-amber-400 hover:bg-amber-50/40"
        >
          <Building2 className="h-7 w-7 text-amber-600" aria-hidden="true" />
          <h2 className="mt-3 text-base font-bold text-slate-900">
            業種別リスク判定
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            建設・製造・運輸・農業ほか10業種ごとの暴露作業・リスク要因・標準対策・関連法令を一覧化。
          </p>
          <p className="mt-3 text-xs font-semibold text-amber-700 group-hover:underline">
            業種を選んで見る →
          </p>
        </Link>
        <Link
          href="/heat-illness-prevention/r7-compliance"
          className="group rounded-2xl border border-rose-200 bg-white p-5 shadow-sm transition hover:border-rose-400 hover:bg-rose-50/40"
        >
          <ShieldAlert className="h-7 w-7 text-rose-600" aria-hidden="true" />
          <h2 className="mt-3 text-base font-bold text-slate-900">
            R7改正コンプライアンス
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            安衛則第612条の2 改正対応チェックリスト8項目と、社内文書テンプレート4種を印刷可能形式で提供。
          </p>
          <p className="mt-3 text-xs font-semibold text-rose-700 group-hover:underline">
            チェックリストへ →
          </p>
        </Link>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <ListChecks className="h-5 w-5 text-amber-600" aria-hidden="true" />
          熱中症対策の基本フロー（4ステップ）
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          職場のPDCAサイクルに組み込むための標準ステップ。WBGT実測 → 作業調整 → 暑熱順化 → 初期対応の順で運用します。
        </p>
        <ol className="mt-4 space-y-3">
          {FRAMEWORK_STEPS.map((s) => (
            <li
              key={s.no}
              className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
                {s.no}
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{s.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-700">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <FileText className="h-5 w-5 text-amber-600" aria-hidden="true" />
          R7改正の要点
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          安衛則第612条の2が令和7年6月1日に施行されました。事業者に求められる主要4項目を要約します。
        </p>
        <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-800">
          <li className="rounded-lg border border-slate-200 bg-white p-3">
            <strong className="font-semibold text-slate-900">①WBGT実測・記録の体制</strong>
            ：屋内・屋外を問わずWBGT基準値を超えるおそれのある作業について、測定または推計と記録の体制整備が求められます。
          </li>
          <li className="rounded-lg border border-slate-200 bg-white p-3">
            <strong className="font-semibold text-slate-900">②暑熱順化期間の確保</strong>
            ：新規入場者・復帰者には7日以上の段階的負荷計画を作成し、実施状況を記録します。
          </li>
          <li className="rounded-lg border border-slate-200 bg-white p-3">
            <strong className="font-semibold text-slate-900">③予防教育の実施</strong>
            ：暑熱作業者全員に年1回以上、症状・予防・初期対応・救急通報を含む教育を実施します。
          </li>
          <li className="rounded-lg border border-slate-200 bg-white p-3">
            <strong className="font-semibold text-slate-900">④初期対応と緊急体制</strong>
            ：発見→冷却→搬送→救急要請の手順を文書化し、現場掲示と緊急冷却装備の配備を行います。
          </li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          詳細：
          <Link
            href="/heat-illness-prevention/r7-compliance"
            className="font-semibold text-rose-700 underline hover:text-rose-800"
          >
            R7コンプライアンスチェックリストと社内文書テンプレ →
          </Link>
        </p>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Building2 className="h-5 w-5 text-amber-600" aria-hidden="true" />
          対応業種（10業種）
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          MHLW統計で熱中症発生が多い業種を中心に、業種別の暴露作業・リスク要因・標準対策を整理しています。
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {INDUSTRY_HEAT_RULES.map((r) => (
            <Link
              key={r.id}
              href={`/heat-illness-prevention/industry-risk?industry=${r.id}`}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
            >
              {r.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-base font-bold text-slate-900">関連機能</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-800">
          {RELATED_LINKS.map((r) => (
            <li key={r.href}>
              <Link
                href={r.href}
                className="inline-flex items-center gap-1 font-semibold text-amber-700 underline hover:text-amber-800"
              >
                {r.label} →
              </Link>
              <span className="ml-1 text-slate-600">— {r.description}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-base font-bold text-slate-900">公的資料・出典</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-800">
          {R7_SOURCES.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold underline hover:text-amber-700"
              >
                {s.label}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 text-center text-xs leading-6 text-slate-500">
        最終更新：2026年5月。本ページは法令・指針の要点解説と現場運用ガイドです。
        <strong className="text-slate-600">
          個別作業の安全判断は事業者・産業医・職長の責任で行ってください。
        </strong>
        WBGT計算はあくまで参考値であり、現場の実測と専門家判断を最優先してください。
      </p>
    </PageContainer>
  );
}
