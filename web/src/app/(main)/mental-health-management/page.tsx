import type { Metadata } from "next";
import Link from "next/link";
import {
  Brain,
  AlertCircle,
  Building2,
  Stethoscope,
  ClipboardCheck,
  ShieldAlert,
  Users2,
  ExternalLink,
  FileText,
  ArrowRight,
} from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import {
  HARASSMENT_LINKAGES,
  STRESS_CHECK_REQUIREMENTS,
} from "@/data/mental-health-rules";
import { HARASSMENT_TYPE_LABELS } from "@/types/mental-health";

const _title =
  "メンタルヘルス対策実務ガイド｜ストレスチェック・面接指導・50人未満対応";
const _desc =
  "労働安全衛生法第66条の10に基づくストレスチェック制度の実務ガイド。50人以上事業場の義務対応、50人未満事業場の努力義務での簡易実施手順、高ストレス者面接指導フロー、ハラスメント対策との連携までを実務担当者向けに整理しました。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/mental-health-management" },
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

const MANDATORY_BASELINE = STRESS_CHECK_REQUIREMENTS.filter(
  (r) => r.baseline && r.appliesTo.includes("mandatory"),
);
const EFFORT_BASELINE = STRESS_CHECK_REQUIREMENTS.filter(
  (r) => r.baseline && r.appliesTo.includes("effort-duty"),
);

const SUBPAGES = [
  {
    href: "/mental-health-management/stress-check",
    icon: ClipboardCheck,
    label: "ストレスチェック実施チェックリスト",
    body: "11項目のベースライン要件と、自社の実施準備度合いを7問で自己評価する診断ツール。義務／努力義務の両方をカバー。",
    badge: "実施準備",
  },
  {
    href: "/mental-health-management/small-business",
    icon: Building2,
    label: "50人未満事業場 向け 簡易実施手順",
    body: "地域産業保健センター（さんぽセンター）を活用した、9ステップの低コスト実施ロードマップと外部リソース比較。",
    badge: "努力義務対応",
  },
  {
    href: "/mental-health-management/interview-guidance",
    icon: Stethoscope,
    label: "高ストレス者 面接指導フロー",
    body: "結果通知から事後措置・経過観察までの8ステップフローと、医師意見書テンプレート、職種別の就業上の措置案。",
    badge: "事後対応",
  },
];

const RELATED_LINKS = [
  {
    href: "/mental-health",
    label: "メンタルヘルス・ハラスメント・VDT作業（概要ハブ）",
    description: "ストレスチェック・4つのケア・カスハラ対策・VDT作業ガイドラインの要点整理。",
  },
  {
    href: "/treatment-work-balance",
    label: "治療と仕事の両立支援",
    description: "精神疾患を含む両立支援プラン作成。復職時のストレスチェック運用と密接に連動。",
  },
  {
    href: "/health-checkup-scheduler",
    label: "健康診断スケジューラ",
    description: "一般定期健康診断と並行する年間計画。高ストレス者面接の実施月とあわせて運用。",
  },
  {
    href: "/strategy/plan-generator",
    label: "年次安全衛生計画ジェネレーター",
    description: "メンタルヘルス対策を年次計画書の『健康管理』セクションに組み込めます。",
  },
];

export default function MentalHealthManagementHubPage() {
  return (
    <PageContainer width="prose">
      <PageJsonLd
        name={_title}
        description={_desc}
        path="/mental-health-management"
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: _title,
          url: "https://www.anzen-ai-portal.jp/mental-health-management",
          description: _desc,
          about: [
            { "@type": "Thing", name: "ストレスチェック制度" },
            { "@type": "Thing", name: "メンタルヘルス対策" },
            { "@type": "Thing", name: "ハラスメント対策" },
          ],
        }}
      />

      <PageHeader
        title="メンタルヘルス対策 実務ガイド"
        description="ストレスチェック制度の実施・面接指導・50人未満事業場対応・ハラスメント対策連携を実務担当者向けに整理"
        icon={Brain}
        iconColor="blue"
      />

      <section className="mt-6 rounded-2xl border border-violet-200 bg-violet-50/60 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-violet-700"
            aria-hidden="true"
          />
          <div className="text-sm leading-6 text-violet-900">
            <p className="font-semibold">本ページの位置付け</p>
            <p className="mt-1">
              本ページは労働安全衛生法第66条の10・労働安全衛生規則第52条の9〜21、および厚労省『ストレスチェック制度実施マニュアル』をふまえた
              <strong className="font-semibold">事業者・人事・産業保健担当者向けの労務管理ガイド</strong>です。
              医学的判断（診断・治療・就業可否）は医師（産業医・主治医）の専管事項であり、本サイトは個別の医学的助言を行いません。
            </p>
          </div>
        </div>
      </section>

      {/* 義務／努力義務の分岐 */}
      <section id="obligation-tiers" className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <FileText className="h-5 w-5 text-violet-600" aria-hidden="true" />
          事業場規模別の義務と努力義務
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          常時使用する労働者数を境に、ストレスチェック制度の適用区分が分かれます。
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <article className="rounded-xl border border-violet-300 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
                ≥50
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                常時50人以上 ─ 法的義務
              </h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              年1回以上のストレスチェック実施・労働基準監督署への報告を含む全{MANDATORY_BASELINE.length}項目の対応が必要。実施しない場合は安衛法違反となります。
            </p>
            <ul className="mt-3 space-y-1 text-xs leading-5 text-slate-600">
              <li>・安衛則 第52条の9〜21 を全面適用</li>
              <li>・労働基準監督署への実施報告（様式第6号の2）</li>
              <li>・集団分析と職場環境改善（推奨事項）</li>
            </ul>
          </article>
          <article className="rounded-xl border border-amber-300 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                &lt;50
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                50人未満 ─ 努力義務
              </h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              義務化されていませんが、{EFFORT_BASELINE.length}項目の基本対応が推奨。地域産業保健センター（さんぽセンター）の無料支援を活用すれば、内部リソースが限られていても実施可能です。
            </p>
            <ul className="mt-3 space-y-1 text-xs leading-5 text-slate-600">
              <li>・労基署報告は不要</li>
              <li>・さんぽセンターの無料医師面接が利用可</li>
              <li>・調査票はMHLW標準57項目／23項目短縮版を利用</li>
            </ul>
          </article>
        </div>
      </section>

      {/* 3つの実務ガイドへの動線 */}
      <section id="subpages" className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Users2 className="h-5 w-5 text-violet-600" aria-hidden="true" />
          3つの実務ガイド
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          フェーズ別に必要な情報をまとめました。自社の状況に合わせて読み進められます。
        </p>
        <div className="mt-4 space-y-3">
          {SUBPAGES.map((p) => {
            const Icon = p.icon;
            return (
              <Link
                key={p.href}
                href={p.href}
                className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-violet-300 hover:bg-violet-50/40"
              >
                <Icon
                  className="mt-0.5 h-6 w-6 shrink-0 text-violet-600"
                  aria-hidden="true"
                />
                <div className="flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-violet-700">
                      {p.label}
                    </h3>
                    <span className="inline-block rounded bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                      {p.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{p.body}</p>
                </div>
                <ArrowRight
                  className="mt-1 h-4 w-4 shrink-0 text-violet-500"
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </div>
      </section>

      {/* ハラスメント対策連携 */}
      <section id="harassment-linkage" className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <ShieldAlert className="h-5 w-5 text-rose-600" aria-hidden="true" />
          ハラスメント対策との連携
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          ストレスチェックの集団分析・面接指導と、ハラスメント相談窓口は運用上接続が必要です。
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {HARASSMENT_LINKAGES.map((h) => (
            <article
              key={h.type}
              className="rounded-xl border border-rose-200 bg-white p-4 shadow-sm"
            >
              <h3 className="text-sm font-bold text-slate-900">
                {HARASSMENT_TYPE_LABELS[h.type]}
              </h3>
              <p className="mt-2 text-xs leading-5 text-slate-600">
                <strong className="font-semibold text-slate-700">根拠：</strong>
                {h.legalBasis.join(" / ")}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {h.linkToStressCheck}
              </p>
            </article>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-5 text-slate-500">
          ※ カスタマーハラスメント対策の義務化は労働施策総合推進法の改正案に盛り込まれており、施行日は厚労省の発表を確認してください。先行整備としては既存のパワハラ防止指針を準用するのが実務的です。
        </p>
      </section>

      {/* 公的資料 */}
      <section className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="text-base font-bold text-emerald-900">公的資料・相談窓口</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-emerald-900">
          <li>
            <a
              href="https://www.mhlw.go.jp/bunya/roudoukijun/anzeneisei12/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold underline hover:text-emerald-700"
            >
              厚労省「ストレスチェック制度」公式ページ
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
            — 実施マニュアル・調査票・様式集（無料配布）
          </li>
          <li>
            <a
              href="https://www.mhlw.go.jp/kokoro/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold underline hover:text-emerald-700"
            >
              働く人のメンタルヘルス・ポータル「こころの耳」
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
            — Web受検システム・電話／SNS相談窓口リスト
          </li>
          <li>
            <span className="font-semibold">産業保健総合支援センター（さんぽセンター）：</span>
            全国47都道府県＋350箇所超の地域窓口。50人未満事業場は無料でメンタルヘルス相談・医師面接を利用可。
          </li>
        </ul>
      </section>

      {/* 関連機能 */}
      <section className="mt-10">
        <h2 className="text-base font-bold text-slate-900">関連機能</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-800">
          {RELATED_LINKS.map((r) => (
            <li key={r.href}>
              <Link
                href={r.href}
                className="inline-flex items-center gap-1 font-semibold text-violet-700 underline hover:text-violet-800"
              >
                {r.label} →
              </Link>
              <span className="ml-1 text-slate-600">— {r.description}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 text-center text-xs leading-6 text-slate-500">
        最終更新：2026年5月。本ページは法令・指針の要点解説と労務管理上のガイドです。
        <strong className="text-slate-600">
          メンタルヘルスの個別診断・治療・就業可否の判断は医師法上、医師の専管事項です。
        </strong>
        本サイトは個別診断・治療助言を行いません。具体的事案は産業医・臨床心理士・主治医・社労士等の専門家にご相談ください。
      </p>
    </PageContainer>
  );
}
