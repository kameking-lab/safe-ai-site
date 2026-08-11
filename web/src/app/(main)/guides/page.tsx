import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Accessibility,
  Bot,
  BarChart3,
  CalendarCheck,
  CircleCheck,
  CircleMinus,
  CircleDashed,
  FlaskConical,
  ClipboardCheck,
  Monitor,
  type LucideIcon,
} from "lucide-react";
import { PageContainer, Section } from "@/components/layout";
import { Breadcrumb } from "@/components/breadcrumb";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  articleListSchema,
} from "@/components/json-ld";
import { KEYWORD_LANDINGS } from "@/data/seo/keyword-landing";
import {
  PRACTICAL_ASSET_CATEGORIES,
  PUBLIC_PRACTICAL_SAFETY_ASSETS,
  QUARANTINED_PRACTICAL_SAFETY_ASSETS,
  type AssetSupportLevel,
} from "@/data/practical-safety-assets";
import { SITE_URL, withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import { ogImageUrl } from "@/lib/og-url";
import { isPublicRouteAvailable } from "@/lib/public-content-policy";
import { EasyJapaneseText } from "@/components/easy-japanese-text";
import { RubyText } from "@/components/ruby-text";

const title = "ガイド｜安衛法検索・KY・化学物質・サイネージの機能解説";
const description =
  "安衛法AIチャット、KY用紙、安全サイネージ、化学物質RAについて、検索意図に沿った使い方・限界・一次資料をまとめたガイドハブ。";

const PUBLIC_KEYWORD_LANDINGS = KEYWORD_LANDINGS.filter((landing) =>
  isPublicRouteAvailable(`/guides/${landing.slug}`),
);

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/guides" },
  openGraph: withSiteOpenGraph("/guides", {
    title,
    description,
    images: [{ url: ogImageUrl(title, description), width: 1200, height: 630 }],
  }),
  twitter: withSiteTwitter({
    title,
    description,
    images: [ogImageUrl(title, description)],
  }),
};

// 柱0（ビジュアルファースト）: 4ガイドを3秒で見分けるためのアイコン＋色。
// slug をキーに当ページ内で割り当てる（data層 KEYWORD_LANDINGS は data班凍結のため非改変）。
const GUIDE_VISUAL: Record<string, { icon: LucideIcon; badge: string }> = {
  "anzeneho-ai-chatbot": { icon: Bot, badge: "bg-blue-100 text-blue-700" },
  "industry-accident-reports": { icon: BarChart3, badge: "bg-rose-100 text-rose-700" },
  "annual-safety-plan-generator": { icon: CalendarCheck, badge: "bg-emerald-100 text-emerald-700" },
  "chemical-ra-create-simple": { icon: FlaskConical, badge: "bg-amber-100 text-amber-800" },
  "ky-sheet": { icon: ClipboardCheck, badge: "bg-violet-100 text-violet-700" },
  "safety-signage": { icon: Monitor, badge: "bg-cyan-100 text-cyan-800" },
};

const SUPPORT_LABEL: Record<
  AssetSupportLevel,
  { label: string; className: string; icon: LucideIcon }
> = {
  available: {
    label: "提供中",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: CircleCheck,
  },
  partial: {
    label: "一部対応",
    className: "border-amber-200 bg-amber-50 text-amber-900",
    icon: CircleDashed,
  },
  "not-available": {
    label: "未整備",
    className: "border-slate-200 bg-slate-50 text-slate-700",
    icon: CircleMinus,
  },
};

const SUPPORT_FIELDS = [
  ["html", "HTML"],
  ["print", "印刷"],
  ["easyJapanese", "やさしい日本語"],
  ["furigana", "ふりがな"],
  ["instructorNotes", "講師補足"],
  ["knowledgeCheck", "理解度確認"],
  ["changeHistory", "更新履歴"],
] as const;

type GuidesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const NEW_WORKER_ASSET_IDS = [
  "new-entrant",
  "emergency",
  "ky-method",
  "heat-response",
] as const;

export default async function GuidesHubPage({ searchParams }: GuidesPageProps = {}) {
  const params = searchParams ? await searchParams : {};
  const audience = Array.isArray(params.audience)
    ? params.audience[0]
    : params.audience;
  const isNewWorker = audience === "new-worker";
  const newWorkerAssets = PUBLIC_PRACTICAL_SAFETY_ASSETS.filter((item) =>
    NEW_WORKER_ASSET_IDS.includes(
      item.id as (typeof NEW_WORKER_ASSET_IDS)[number],
    ),
  );
  const url = `${SITE_URL}/guides`;
  return (
    <>
      <JsonLd
        schema={[
          webPageSchema({ name: title, description, url }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: "ガイド", url },
          ]),
          articleListSchema(
            PUBLIC_KEYWORD_LANDINGS.map((k) => ({
              headline: k.title,
              datePublished: k.datePublished,
              url: `${SITE_URL}/guides/${k.slug}`,
              description: k.description,
            })),
          ),
        ]}
      />
      <PageContainer width="prose" className="py-8 md:py-10">
        <Breadcrumb items={[{ name: "ガイド" }]} />

        <header className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            検索意図ガイド
          </p>
          <h1 className="mt-2 text-2xl font-bold leading-snug text-slate-900 sm:text-3xl">
            <RubyText text="検索意図別 機能解説ガイド" />
          </h1>
          <EasyJapaneseText as="p" className="mt-3 text-sm leading-7 text-slate-700 sm:text-base">
            安衛法AIチャットボット、化学物質リスクアセスメント、KY用紙、安全サイネージの検索意図に対応したガイドです。各ガイドは、定義、対象者、できること・限界、使い方、入力・出力例、データの扱い、一次資料、関連機能を明示します。
          </EasyJapaneseText>
          <p className="mt-3 text-[11px] leading-5 text-slate-500">
            編集：安全AIポータル編集部。各ガイドの出典・確認状態は本文に表示します。
            AI回答・本ガイドの記述は最終判断ではなく、必ず原典・専門家のご確認と併用してください。
          </p>
        </header>

        {isNewWorker ? (
          <section
            aria-labelledby="new-worker-start-title"
            className="mt-6 rounded-2xl border-2 border-teal-300 bg-teal-50 p-5"
          >
            <p className="text-xs font-bold tracking-widest text-teal-800">
              新入社員・作業員向け
            </p>
            <h2 id="new-worker-start-title" className="mt-1 text-xl font-bold text-slate-950">
              <RubyText text="最初に確認する4項目" />
            </h2>
            <EasyJapaneseText as="p" className="mt-2 text-sm leading-7 text-slate-700">
              現場固有の新規入場者教育を置き換えるものではありません。緊急時対応、危険予知、熱中症、新規入場時の確認を先に読み、分からない点を職長へ確認してください。
            </EasyJapaneseText>
            <ol className="mt-4 grid gap-3 sm:grid-cols-2">
              {newWorkerAssets.map((item, index) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex min-h-[44px] items-center gap-3 rounded-xl border border-teal-300 bg-white p-3 font-bold text-slate-950 hover:border-teal-600"
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-800 text-sm text-white"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                    <RubyText text={item.title} />
                    <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-teal-800" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <Section title="ガイド一覧" spacing="default" className="mt-8">
          <ul className="grid gap-4">
            {PUBLIC_KEYWORD_LANDINGS.map((k) => {
              const visual = GUIDE_VISUAL[k.slug];
              const Icon = visual?.icon;
              return (
                <li key={k.slug}>
                  <Link
                    href={`/guides/${k.slug}`}
                    className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-400 hover:shadow-md"
                  >
                    {Icon ? (
                      <span
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${visual.badge}`}
                        aria-hidden="true"
                      >
                        <Icon className="h-6 w-6" />
                      </span>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
                        {k.primaryKeyword}
                      </p>
                      <p className="mt-1 text-base font-bold text-slate-900 sm:text-lg">{k.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{k.description}</p>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        ガイドを読む
                        <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section
          title="実務資産ナビ"
          description="既存の正規HTMLを、現場で行いたい作業から選べます。未整備の支援形式もそのまま表示します。"
          spacing="default"
          className="mt-10"
        >
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
            <p className="flex items-center gap-2 font-bold">
              <Accessibility className="h-5 w-5 shrink-0" aria-hidden="true" />
              HTMLを利用の正本とします
            </p>
            <p className="mt-1">
              PDFだけに閉じず、まずキーボードや画面読み上げで利用できるHTMLへ案内します。
              「確認日」は台帳の導線・適用範囲を確認した日であり、リンク先本文の法的監修日ではありません。
            </p>
          </div>
          {QUARANTINED_PRACTICAL_SAFETY_ASSETS.length > 0 ? (
            <p
              role="status"
              className="mt-4 rounded-xl border border-amber-400 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
            >
              一次資料またはリンク先の再検証中のため、
              {QUARANTINED_PRACTICAL_SAFETY_ASSETS.length}
              件は「提供中」と表示せず公開一覧から除外しています。
            </p>
          ) : null}

          <div className="mt-6 space-y-10">
            {PRACTICAL_ASSET_CATEGORIES.map((category) => (
              <section key={category} aria-labelledby={`asset-category-${category}`}>
                <h3
                  id={`asset-category-${category}`}
                  className="border-b border-slate-200 pb-2 text-lg font-bold text-slate-900"
                >
                  {category}
                </h3>
                <ul className="mt-4 grid gap-4 lg:grid-cols-2">
                  {PUBLIC_PRACTICAL_SAFETY_ASSETS.filter(
                    (item) => item.category === category,
                  ).map((item) => (
                    <li
                      key={item.id}
                      className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                       <h4 className="text-base font-bold text-slate-950">
                         <RubyText text={item.title} />
                       </h4>
                      <dl className="mt-3 grid gap-2 text-sm leading-6">
                        <div>
                          <dt className="inline font-semibold text-slate-900">対象者：</dt>
                           <EasyJapaneseText as="dd" className="inline text-slate-700">
                             {item.audience}
                           </EasyJapaneseText>
                        </div>
                        <div>
                          <dt className="inline font-semibold text-slate-900">所要時間：</dt>
                          <dd className="inline text-slate-700">{item.duration}</dd>
                        </div>
                        <div>
                          <dt className="inline font-semibold text-slate-900">目的：</dt>
                          <dd className="inline text-slate-700">{item.purpose}</dd>
                        </div>
                        <div>
                          <dt className="inline font-semibold text-slate-900">適用範囲：</dt>
                          <dd className="inline text-slate-700">{item.scope}</dd>
                        </div>
                        <div>
                          <dt className="inline font-semibold text-slate-900">できないこと：</dt>
                          <dd className="inline text-slate-700">{item.limitations}</dd>
                        </div>
                      </dl>

                      <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-700">
                        <span className="font-bold text-slate-900">一次資料：</span>
                        {item.sourceStatus}
                      </p>

                      <ul
                        className="mt-3 flex flex-wrap gap-1.5"
                        aria-label={`${item.title}の提供形式`}
                      >
                        {SUPPORT_FIELDS.map(([key, label]) => {
                          const support = SUPPORT_LABEL[item.support[key]];
                          const StatusIcon = support.icon;
                          return (
                            <li
                              key={key}
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${support.className}`}
                            >
                              <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                              {label}: {support.label}
                            </li>
                          );
                        })}
                      </ul>

                      <div className="mt-auto pt-4">
                        <p className="text-[11px] leading-5 text-slate-500">
                          台帳確認: {item.registryCheckedAt}（{item.registryReviewScope}）
                        </p>
                        <Link
                          href={item.href}
                          className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
                        >
                          HTMLで開く
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Section>

        <Section
          title="本ガイドの編集方針"
          description="検索意図に対する回答の品質を保つために守っている運用ルール"
          spacing="default"
          className="mt-10"
        >
          <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">
            <li>
              一次資料（e-Gov・厚労省・JISHA・建災防・労働者健康安全機構等）に紐づけて回答する。
            </li>
            <li>条文の逐語転載は行わず、参照リンクと要約で構成する。</li>
            <li>
              運営主体、出典、各ガイドの確認状態と限界を表示する。
            </li>
            <li>
              公開日・最終更新日を各ガイドに明示し、コミット履歴で公開PDCAを追跡可能にする。
            </li>
            <li>
              読者の検索意図に最短で答えるため、Tool（実行画面）への導線を上下二箇所以上に置く。
            </li>
            <li>
              「編集部が運用する研究プロジェクト」という体裁を保ち、行政・公的機関を装う表現を行わない。
            </li>
          </ul>
        </Section>
      </PageContainer>
    </>
  );
}
