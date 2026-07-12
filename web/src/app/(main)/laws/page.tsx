import type { Metadata } from "next";
import { LawsPageClient } from "@/components/laws-page-client";
import { RelatedPageCards } from "@/components/related-page-cards";
import { LawHubNav } from "@/components/law-hub-nav";
import { ogImageUrl } from "@/lib/og-url";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import { JsonLd, articleListSchema } from "@/components/json-ld";
import { PageJsonLd } from "@/components/page-json-ld";
import { SITE_URL } from "@/lib/seo-metadata";
import { realLawRevisions } from "@/data/mock/real-law-revisions";
import { lawRevisionCores } from "@/data/mock/law-revisions";
import { computeLawsConclusion } from "@/lib/news-conclusions";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { SITE_STATS } from "@/data/site-stats";

const _title = "安全衛生法 改正情報一覧 最新";
const _desc =
  "法改正 労働安全 2024〜2026まとめ — 熱中症対策（安衛則612条の2 R7.6.1施行）・化学物質 自律的管理・ストレスチェック改正など100件以上をAI要約付きで確認。e-Gov・厚労省通達リンク付き。安全担当者必携。";

export const metadata: Metadata = {
  alternates: { canonical: "/laws" },
  title: _title,
  description: _desc,
  openGraph: withSiteOpenGraph("/laws", {
    title: _title,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  }),
  twitter: withSiteTwitter({
    images: [ogImageUrl(_title, _desc)],
  }),
};

// ISR: 施行カウントダウン（結論カードの残日数）を日次で再計算
export const revalidate = 86400;

export default function LawsPage() {
  // 柱0: 結論ファースト＝一覧と同じデータ源（lawRevisionCores）から「施行間近」を集計
  const conclusion = computeLawsConclusion(lawRevisionCores);
  const lawSchema = articleListSchema(
    realLawRevisions.map((r) => ({
      headline: r.title,
      datePublished: r.publishedAt,
      url: r.source_url ?? `${SITE_URL}/laws`,
      description: r.summary,
    }))
  );

  return (
    <>
      <PageJsonLd name={_title} description={_desc} path="/laws" />
      <JsonLd schema={lawSchema} />
      {/* C-004: law-hub quick-nav — surface scattered law tools at the top to reduce navigation depth */}
      <LawHubNav current="laws" />
      {/* 柱0: 開いた瞬間に「施行が近い改正が何件あるか」が3秒で分かる */}
      <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6 lg:px-8">
        <ConclusionCard
          tone={conclusion.tone}
          value={conclusion.value}
          unit={conclusion.unit}
          title={conclusion.title}
          description={conclusion.description}
        />
      </div>
      {/* C-1: 一覧の初期データは server で確定して渡す（クライアントの
          データ静的importを排除しつつ SSR HTML に全件を含める）。
          Suspense で包むと client モジュールの非同期ロードで境界がサスペンドし、
          静的HTMLに「フォールバック先行→$RCスワップ」が焼き込まれて LCP が
          スワップ完了まで遅延するため、本文は静的シェルに含める。 */}
      <LawsPageClient initialRevisions={lawRevisionCores} />
      <RelatedPageCards
        heading="合わせて使う"
        pages={[
          {
            href: "/law-hierarchy",
            label: "法令階層マップ",
            description: "労働安全衛生法を頂点とした政令・省令・告示・通達の階層を一枚で俯瞰。各法令から e-Gov 公式条文・条文検索・関連通達一覧へ直接遷移。",
            color: "rose",
            cta: "階層マップを開く",
          },
          {
            href: "/laws/glossary",
            label: "法令用語集",
            description: "公布と施行の違い、告示・通達・指針の拘束力、政省令の関係など、改正情報を読む前提となる用語を一次出典付きで解説。",
            color: "purple",
            cta: "用語を確認する",
          },
          {
            href: "/circulars",
            label: "通達・告示・判例（第2層出典）",
            description: `厚労省通達 ${SITE_STATS.mhlwNoticeCount}件 + 安全配慮義務に関する最高裁判例 ${SITE_STATS.courtPrecedentCount}件を統合。監督官・士業向けの実務出典集。`,
            color: "emerald",
            cta: "通達と判例を見る",
          },
          {
            href: "/resources",
            label: "厚労省一次資料DB",
            description: `通達${SITE_STATS.mhlwCircularCount}件・告示${SITE_STATS.mhlwKokujiCount}件・指針${SITE_STATS.mhlwShishinCount}件・リーフレット${SITE_STATS.mhlwLeafletCount}件を分類検索。一次ソース直リンク。`,
            color: "amber",
            cta: "一次資料DBを開く",
          },
          {
            href: "/chatbot",
            label: "法令チャット",
            description: "法改正の内容について安衛法AIチャットボットに質問。条文の根拠を確認できます。",
            color: "blue",
            cta: "AIに質問する",
          },
          {
            href: "/accidents",
            label: "事故データベース",
            description: "法改正と関連する事故事例を検索。どんなリスクが背景にあるかを確認できます。",
            color: "orange",
            cta: "関連事故を調べる",
          },
        ]}
      />
      <RelatedPageCards
        heading="特集ページ"
        pages={[
          {
            href: "/laws/bcp",
            label: "BCP 策定義務化",
            description: "介護施設等で2024年4月義務化。安衛法との接続と中小向けテンプレート。",
            color: "amber",
            cta: "BCP を整理する",
          },
          {
            href: "/laws/freelance-rosai",
            label: "フリーランス労災特別加入",
            description: "一人親方・フリーランス新法。加入団体選び・給付基礎日額・認定事例。",
            color: "sky",
            cta: "特別加入を見る",
          },
          {
            href: "/laws/gig-work",
            label: "スポットワーク × 労災",
            description: "タイミー等アプリ型雇用の労災適用・拒否権・若年保護。",
            color: "purple",
            cta: "ギグワーク労災",
          },
        ]}
      />
    </>
  );
}
