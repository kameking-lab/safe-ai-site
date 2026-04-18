import type { Metadata } from "next";
import { Suspense } from "react";
import { LawsPageClient } from "@/components/laws-page-client";
import { RelatedPageCards } from "@/components/related-page-cards";
import { ogImageUrl } from "@/lib/og-url";
import { JsonLd, articleListSchema } from "@/components/json-ld";
import { realLawRevisions } from "@/data/mock/real-law-revisions";

const _title = "安全衛生法 改正情報一覧 最新";
const _desc =
  "2016年〜2026年の労働安全衛生法・化学物質管理など100件以上の法改正をAI要約付きで確認。e-Gov・厚労省通達へのリンク付き。安全担当者に。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  openGraph: {
    title: `${_title}｜ANZEN AI`,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(_title, _desc)],
  },
};

export default function LawsPage() {
  const lawSchema = articleListSchema(
    realLawRevisions.map((r) => ({
      headline: r.title,
      datePublished: r.publishedAt,
      url: r.source_url ?? `https://safe-ai-site.vercel.app/laws`,
      description: r.summary,
    }))
  );

  return (
    <>
      <JsonLd schema={lawSchema} />
      <Suspense fallback={<p className="px-4 py-6 text-sm text-slate-600">読み込み中…</p>}>
        <LawsPageClient />
      </Suspense>
      <RelatedPageCards
        heading="合わせて使う"
        pages={[
          {
            href: "/laws/notices-precedents",
            label: "通達・判例（第2層出典）",
            description: "条文だけでは読めない行政解釈（通達15件）と最高裁判例（15件）。監督官・士業向けの実務出典集。",
            color: "emerald",
            cta: "通達と判例を見る",
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
        heading="新設 特集ページ（β骨組み）"
        pages={[
          {
            href: "/laws/bcp",
            label: "BCP 策定義務化",
            description: "介護施設等で2024年4月義務化。労安衛法との接続と中小向けテンプレート。",
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
