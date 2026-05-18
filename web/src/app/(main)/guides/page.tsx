import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageContainer, Section } from "@/components/layout";
import { Breadcrumb } from "@/components/breadcrumb";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  articleListSchema,
} from "@/components/json-ld";
import { KEYWORD_LANDINGS } from "@/data/seo/keyword-landing";
import { SITE_URL, withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import { ogImageUrl } from "@/lib/og-url";

const title = "ガイド｜検索意図別の機能解説（4キーワード対応）";
const description =
  "安衛法AIチャット・業種別労働災害分析レポート・年次安全衛生計画ジェネレーター・化学物質RA（CREATE-SIMPLE）の4機能について、検索意図に沿った解説と最短の使い方をまとめたガイドハブ。";

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

export default function GuidesHubPage() {
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
            KEYWORD_LANDINGS.map((k) => ({
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
            検索意図別 機能解説ガイド
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-700 sm:text-base">
            「安衛法AIチャットボット」「労働災害 業種別 分析レポート」「年次安全衛生計画 業種別 ジェネレーター」「化学物質 リスクアセスメント CREATE-SIMPLE 無料」の主要4キーワードに対応した検索意図ガイドです。各ガイドは（1）キーワードの定義、（2）使い方ステップ、（3）周辺ロングテール Q&A、（4）一次資料（厚労省・e-Gov・JISHA）、（5）関連機能、の構造で書かれています。
          </p>
          <p className="mt-3 text-[11px] leading-5 text-slate-500">
            監修：労働安全衛生コンサルタント（登録番号260022）が個人で運営する研究プロジェクト。
            AI回答・本ガイドの記述は最終判断ではなく、必ず原典・専門家のご確認と併用してください。
          </p>
        </header>

        <Section title="ガイド一覧" spacing="default" className="mt-8">
          <ul className="grid gap-4">
            {KEYWORD_LANDINGS.map((k) => (
              <li key={k.slug}>
                <Link
                  href={`/guides/${k.slug}`}
                  className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-400 hover:shadow-md"
                >
                  <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
                    {k.primaryKeyword}
                  </p>
                  <p className="mt-1 text-base font-bold text-slate-900 sm:text-lg">{k.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{k.description}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    ガイドを読む
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
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
              監修者（労働安全衛生コンサルタント・登録番号260022）の経歴・専門領域を各ガイドに表示し、執筆責任を明確にする。
            </li>
            <li>
              公開日・最終更新日を各ガイドに明示し、コミット履歴で公開PDCAを追跡可能にする。
            </li>
            <li>
              読者の検索意図に最短で答えるため、Tool（実行画面）への導線を上下二箇所以上に置く。
            </li>
            <li>
              「個人運営の研究プロジェクト」という体裁を保ち、行政・公的機関を装う表現を行わない。
            </li>
          </ul>
        </Section>
      </PageContainer>
    </>
  );
}
