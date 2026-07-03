import type { Metadata } from "next";
import Link from "next/link";
import {
  HeartHandshake,
  Stethoscope,
  Building2,
  FileText,
  ListChecks,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { CollapsibleDetail } from "@/components/ui/collapsible-detail";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { ILLNESS_CATEGORIES } from "@/data/illness-considerations";

const _title =
  "治療と仕事の両立支援｜企業向け実務ガイドと両立支援プラン作成";
const _desc =
  "厚労省『事業場における治療と仕事の両立支援のためのガイドライン』（令和5年改訂）に沿って、がん・脳卒中・心疾患・糖尿病・精神疾患・難病ごとの労務配慮、両立支援プランの作成、主治医意見書テンプレートまで、企業の人事・産業保健担当が必要な実務情報をまとめました。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/treatment-work-balance" },
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
    title: "申出と情報収集",
    body: "本人からの申出を端緒に、就業上の制限・配慮について主治医意見書を取得します。本人同意のもとで人事・産業医・主治医が情報を共有します。",
  },
  {
    no: 2,
    title: "両立支援プランの作成",
    body: "業務内容・勤務時間・休暇・職場環境への配慮事項を取りまとめ、本人・上司・産業医・人事が合意したうえで文書化します。",
  },
  {
    no: 3,
    title: "プランに基づく就業上の措置",
    body: "短時間勤務、配置転換、テレワーク、通院休暇など、合意した配慮を実施。実施状況を本人と定期的に確認します。",
  },
  {
    no: 4,
    title: "定期見直しと終了判断",
    body: "症状の経過・治療内容の変化に応じてプランを更新。配慮が不要となった段階で支援計画を終了します。",
  },
];

const COMPANY_CHECKLIST = [
  "両立支援に関する基本方針を文書化し、就業規則・社内規程に反映している",
  "申出窓口（人事・健康管理部門）を明確にし、社員に周知している",
  "主治医意見書の様式を準備し、文書料の負担方針を定めている",
  "産業医・産業保健スタッフとの連携体制を整備している",
  "短時間勤務・時間単位有給・テレワーク等の制度を準備している",
  "プライバシー保護（病名等の取扱い）の運用ルールがある",
  "管理職向け研修（両立支援・ハラスメント防止）を定期実施している",
];

const RELATED_LINKS = [
  {
    href: "/mental-health",
    label: "メンタルヘルス・ハラスメント・VDT作業",
    description: "ストレスチェック・4つのケアなど、両立支援と密接に関連する制度をまとめています。",
  },
  {
    href: "/health-checkup-scheduler",
    label: "健康診断スケジューラ",
    description: "業種・職種別の必要健診と年間スケジュール。両立支援対象者の合併症管理にも活用できます。",
  },
  {
    href: "/diversity",
    label: "多様な働き方の安全",
    description: "障害者・外国人・高齢者など、多様な労働者への配慮事項。両立支援と並行する論点です。",
  },
  {
    href: "/strategy/plan-generator",
    label: "年次安全衛生計画ジェネレーター",
    description: "両立支援を年次計画書の『健康管理』セクションに組み込めます。",
  },
];

export default function TreatmentWorkBalanceHubPage() {
  return (
    <PageContainer width="prose">
      <PageJsonLd
        name={_title}
        description={_desc}
        path="/treatment-work-balance"
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: _title,
          url: "https://www.anzen-ai-portal.jp/treatment-work-balance",
          description: _desc,
          about: {
            "@type": "Thing",
            name: "治療と仕事の両立支援",
          },
        }}
      />

      <PageHeader
        title="治療と仕事の両立支援"
        description="厚労省ガイドライン（令和5年改訂）に沿った企業向け実務ガイドと、両立支援プラン作成ツール"
        icon={HeartHandshake}
        iconColor="emerald"
      />

      <ConclusionCard
        tone="info"
        value={FRAMEWORK_STEPS.length}
        unit="ステップ"
        title="支援フロー"
        description="申出→プラン作成→就業上の措置→定期見直し。プラン作成ツールで配慮事項を自動生成できます。"
        action={{ href: "/treatment-work-balance/plan-builder", label: "プランを作成する" }}
        className="mt-6"
      />

      <section className="mt-6">
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm leading-6 text-emerald-900">
          <AlertCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
            aria-hidden="true"
          />
          <p>
            <strong className="font-semibold">企業の人事・産業保健担当者向けの労務管理ガイド。</strong>
            診断・就業可否の最終判断は主治医・産業医にご相談ください。
          </p>
        </div>
        <CollapsibleDetail
          summary="本ページの根拠ガイドラインと位置付け（詳細）"
          className="mt-2"
        >
          本ページは『事業場における治療と仕事の両立支援のためのガイドライン』（厚生労働省、令和5年改訂版）を踏まえた企業の人事・産業保健担当者向けの労務管理ガイドです。診断・治療方針・就業可否の最終判断は主治医および産業医にご相談ください。個別の医学的助言は行いません。
        </CollapsibleDetail>
      </section>

      {/* 法的根拠 */}
      <section id="legal-basis" className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <FileText className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          制度の根拠
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          両立支援は事業者の安全配慮義務と密接に関係し、複数の法令・指針に根拠を持ちます。
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900">
              労働安全衛生法 第69条・第70条の2
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              事業者は労働者の健康保持増進のため必要な措置を講ずる責務を負い、
              国の指針（健康保持増進指針）の遵守が求められます。
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900">
              厚労省 両立支援ガイドライン（令和5年改訂）
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              『事業場における治療と仕事の両立支援のためのガイドライン』。
              基本方針・申出から計画策定・実施・見直しまでの実務フローを定めています。
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900">
              がん対策基本法・脳卒中循環器病対策基本法
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              個別疾患の対策基本法でも、就労継続支援が国の責務として定められています。
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900">
              障害者の雇用の促進等に関する法律
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              治療継続によって障害者手帳を取得した労働者については、合理的配慮義務との関係も整理が必要です。
            </p>
          </article>
        </div>
      </section>

      {/* 4ステップ */}
      <section id="framework" className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <ListChecks className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          両立支援の基本フロー（4ステップ）
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          ガイドラインで示される標準的な進め方。本人の同意を起点とし、情報共有→計画→実施→見直しのサイクルで運用します。
        </p>
        <ol className="mt-4 space-y-3">
          {FRAMEWORK_STEPS.map((s) => (
            <li
              key={s.no}
              className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
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

      {/* 企業向けチェックリスト */}
      <section id="company-checklist" className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Building2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          企業向け 体制整備チェックリスト
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          自社の両立支援体制を点検するための7項目。1つでも未整備があれば社内規程・運用の整備を検討してください。
        </p>
        <ul className="mt-4 space-y-2">
          {COMPANY_CHECKLIST.map((c) => (
            <li
              key={c}
              className="flex gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-800"
            >
              <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              {c}
            </li>
          ))}
        </ul>
      </section>

      {/* 病類別 配慮事項 */}
      <section id="illness-guide" className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Stethoscope className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          病類別 配慮事項ガイド
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          6カテゴリ・約30病態の典型的な労務配慮を整理。詳細は各カテゴリページから確認できます。
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ILLNESS_CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={`/treatment-work-balance/illness-guide/${cat.id}`}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/40"
            >
              <h3 className="text-sm font-bold text-slate-900">{cat.label}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {cat.summary}
              </p>
              <p className="mt-2 inline-block rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                重点リスク：{cat.riskHighlights[0]}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* プラン作成ツールへの動線 */}
      <section className="mt-10 rounded-2xl border border-emerald-300 bg-emerald-600/95 p-6 text-white shadow-md">
        <h2 className="text-lg font-bold">両立支援プラン作成ツール</h2>
        <p className="mt-2 text-sm leading-6 text-emerald-50">
          病態・職種・希望勤務形態を選択するだけで、配慮事項・段階的復職プラン・主治医意見書テンプレートを生成します。
          作成結果は印刷してそのまま社内回覧・主治医依頼に使えます。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/treatment-work-balance/plan-builder"
            className="inline-flex items-center gap-1 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            プランを作成する →
          </Link>
          <Link
            href="/treatment-work-balance/illness-guide/cancer"
            className="inline-flex items-center gap-1 rounded-lg border border-white px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            病類別ガイドを見る
          </Link>
        </div>
      </section>

      {/* 関連リンク */}
      <section className="mt-10">
        <h2 className="text-base font-bold text-slate-900">関連機能</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-800">
          {RELATED_LINKS.map((r) => (
            <li key={r.href}>
              <Link
                href={r.href}
                className="inline-flex items-center gap-1 font-semibold text-emerald-700 underline hover:text-emerald-800"
              >
                {r.label} →
              </Link>
              <span className="ml-1 text-slate-600">— {r.description}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 公的資料 */}
      <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-base font-bold text-slate-900">公的資料・相談窓口</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-800">
          <li>
            <a
              href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000115300.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold underline hover:text-emerald-700"
            >
              厚生労働省「治療と仕事の両立支援」ポータル
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
            — ガイドライン本文・参考様式・各疾患の手引き
          </li>
          <li>
            <span className="font-semibold">産業保健総合支援センター（さんぽセンター）：</span>
            全国47都道府県に設置。両立支援コーディネーターの無料派遣・相談に対応。
          </li>
          <li>
            <span className="font-semibold">難病相談支援センター：</span>
            指定難病の患者向け就労相談、就労支援機関との連携窓口。
          </li>
        </ul>
      </section>

      <CollapsibleDetail summary="免責事項・最終更新（2026年5月）" className="mt-8">
        本ページは法令・指針の要点解説と労務管理上のガイドです。疾病の診断・治療・就業可否の判断は医師法上、医師の専管事項です。本サイトは個別診断・治療助言を行いません。具体的事案は主治医・産業医・社労士等の専門家にご相談ください。
      </CollapsibleDetail>
    </PageContainer>
  );
}
