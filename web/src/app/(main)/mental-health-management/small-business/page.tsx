import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  AlertCircle,
  Map,
  ExternalLink,
  ChevronLeft,
} from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { ogImageUrl } from "@/lib/og-url";
import {
  SMALL_BUSINESS_ALTERNATIVES,
  SMALL_BUSINESS_STEPS,
} from "@/data/mental-health-rules";

const _title =
  "50人未満事業場 向け ストレスチェック簡易実施手順｜さんぽセンター活用";
const _desc =
  "労働者50人未満の事業場向けのストレスチェック実施ロードマップ。地域産業保健センター（さんぽセンター）を活用した9ステップ・約12ヶ月の進め方と、外部リソースの比較を実務担当者向けに整理。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/mental-health-management/small-business" },
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

function daysLabel(d: number): string {
  if (d <= 30) return `〜${d}日`;
  if (d <= 90) return `〜約${Math.round(d / 30)}ヶ月`;
  if (d < 365) return `〜約${Math.round(d / 30)}ヶ月`;
  return "〜年1サイクル";
}

export default function SmallBusinessPage() {
  return (
    <PageContainer width="prose">
      <PageJsonLd
        name={_title}
        description={_desc}
        path="/mental-health-management/small-business"
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
        title="50人未満事業場 向け 簡易実施手順"
        description="さんぽセンターを活用した9ステップ・約12ヶ月の低コスト実施ロードマップ"
        icon={Building2}
        iconColor="amber"
      />

      <ConclusionCard
        tone="warning"
        value={SMALL_BUSINESS_STEPS.length}
        unit="ステップ"
        title="努力義務"
        description="50人未満事業場は安衛法上の努力義務。さんぽセンターの無料支援を使えば低コストで実施できます。"
        action={{ href: "#roadmap", label: "実施ロードマップへ" }}
        className="mt-6"
      />

      <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
            aria-hidden="true"
          />
          <div className="text-sm leading-6 text-amber-900">
            <p className="font-semibold">努力義務の位置付け</p>
            <p className="mt-1">
              労働者50人未満の事業場では、ストレスチェック実施は安衛法上の<strong>努力義務</strong>です。
              義務化されていませんが、メンタル不調による休職・離職コストや使用者の安全配慮義務（労働契約法第5条）の観点から、
              地域産業保健センター（さんぽセンター）の<strong>無料支援を活用した実施</strong>が推奨されます。
            </p>
          </div>
        </div>
      </section>

      {/* 9ステップ */}
      <section id="roadmap" className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Map className="h-5 w-5 text-amber-600" aria-hidden="true" />
          実施ロードマップ（9ステップ）
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          経過日数は事業場規模・地域窓口の状況により前後します。初年度の目安としてご利用ください。
        </p>
        <ol className="mt-4 space-y-3">
          {SMALL_BUSINESS_STEPS.map((s) => (
            <li
              key={s.no}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                  {s.no}
                </span>
                <h3 className="text-sm font-bold text-slate-900">{s.title}</h3>
                <span className="ml-auto inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  目安：{daysLabel(s.estimatedDays)}
                </span>
              </div>
              <p className="mt-2 ml-9 text-sm leading-6 text-slate-700">
                {s.body}
              </p>
              {s.externalResource && (
                <p className="mt-2 ml-9 inline-block rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  外部リソース：{s.externalResource}
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* 外部リソース比較 */}
      <section id="alternatives" className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Building2 className="h-5 w-5 text-amber-600" aria-hidden="true" />
          外部リソースの選び方
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          自社の事業場規模・予算・既存契約に合わせて、外部リソースを使い分けます。
        </p>
        <div className="mt-4 space-y-3">
          {SMALL_BUSINESS_ALTERNATIVES.map((a) => (
            <article
              key={a.label}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <h3 className="text-sm font-bold text-slate-900">{a.label}</h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-700">{a.body}</p>
              <p className="mt-2 inline-block rounded bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                おすすめ：{a.recommendedFor}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* さんぽセンター連絡先案内 */}
      <section className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="text-base font-bold text-emerald-900">
          さんぽセンター（地域産業保健センター）の探し方
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-emerald-900">
          <li>
            <a
              href="https://www.sanpo-mhlw.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold underline hover:text-emerald-700"
            >
              産業保健総合支援センター 全国窓口検索
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
            — 47都道府県＋350箇所超の地域窓口を都道府県別に検索
          </li>
          <li>
            <span className="font-semibold">利用条件：</span>
            事業場規模が50人未満であること。費用は無料（旅費等は事業場負担の場合あり）。
          </li>
          <li>
            <span className="font-semibold">支援内容：</span>
            ストレスチェック実施支援、医師面接、産業保健相談、職場巡視、メンタルヘルス研修など
          </li>
        </ul>
      </section>

      {/* 法令の根拠 */}
      <section className="mt-10">
        <h2 className="text-base font-bold text-slate-900">関連法令</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
          <li>
            <strong className="font-semibold">労働安全衛生法 第66条の10：</strong>
            ストレスチェック実施の根拠条文。50人未満事業場は附則第4条により当分の間努力義務。
          </li>
          <li>
            <strong className="font-semibold">労働契約法 第5条：</strong>
            使用者の安全配慮義務。事業場規模を問わず、心身の健康への配慮が求められる。
          </li>
          <li>
            <strong className="font-semibold">労働安全衛生規則 第52条の9〜21：</strong>
            ストレスチェック実施の具体的手続き（調査票・実施者・面接指導・記録等）。
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
