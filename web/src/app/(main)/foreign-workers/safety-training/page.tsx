import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { SAFETY_MATERIAL_INDEX } from "@/data/foreign-worker-materials";
import { ogImageUrl } from "@/lib/og-url";
import {
  MATERIAL_INDUSTRY_LABELS_JA,
  MATERIAL_TOPIC_LABELS_JA,
  MATERIAL_LANGUAGES,
  type MaterialIndustry,
  type MaterialTopic,
} from "@/types/foreign-worker";
import { SafetyTrainingBuilder } from "@/components/foreign-workers/safety-training-builder";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { StatusBadge } from "@/components/ui/status-badge";

const DEFAULT_INDUSTRY: MaterialIndustry = "construction";

const _title =
  "外国人労働者向け多言語安全教育教材ビルダー｜やさしい日本語・英語・ベトナム語・中国語・インドネシア語";
const _desc =
  "建設・製造・介護・農業・外食・宿泊の6業種×5トピック（高所作業/化学物質/熱中症/腰痛/感染症）の安全教育教材を、やさしい日本語と英語・ベトナム語・中国語・インドネシア語の対訳で表示・印刷できます。技能実習生・特定技能労働者の雇入れ時教育やTBM資料に活用できます。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/foreign-workers/safety-training" },
  openGraph: {
    title: _title,
    description: _desc,
    type: "website",
    locale: "ja_JP",
    siteName: "安全AIポータル",
    url: "https://www.anzen-ai-portal.jp/foreign-workers/safety-training",
    alternateLocale: ["en_US", "vi_VN", "zh_CN", "id_ID"],
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: _title,
    description: _desc,
    images: [ogImageUrl(_title, _desc)],
  },
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SafetyTrainingPage({ searchParams }: PageProps) {
  const { industry: rawIndustry } = await searchParams;
  const industries = Object.keys(MATERIAL_INDUSTRY_LABELS_JA) as MaterialIndustry[];
  const topics = Object.keys(MATERIAL_TOPIC_LABELS_JA) as MaterialTopic[];
  const industry: MaterialIndustry =
    typeof rawIndustry === "string" && industries.includes(rawIndustry as MaterialIndustry)
      ? (rawIndustry as MaterialIndustry)
      : DEFAULT_INDUSTRY;

  // Pre-filter server-side: pass only 1 industry (~25 KB) instead of all 6 (~148 KB).
  const filteredMaterials = SAFETY_MATERIAL_INDEX.byIndustry[industry] ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <PageJsonLd
        name="外国人労働者向け多言語安全教育教材ビルダー"
        description={_desc}
        path="/foreign-workers/safety-training"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          {
            name: "外国人労働者の安全衛生支援",
            url: "https://www.anzen-ai-portal.jp/foreign-workers",
          },
          {
            name: "多言語安全教育教材",
            url: "https://www.anzen-ai-portal.jp/foreign-workers/safety-training",
          },
        ]}
      />
      <PageContainer width="wide" className="py-8 md:py-12">
        <header className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">
            Multilingual Safety Training Material Builder
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            多言語安全教育教材ビルダー
          </h1>
        </header>

        {/* 結論カード（柱0）: 本文を読まず3秒で「規模＝何教材・何言語」と「次にやること＝教材を選ぶ」が分かる。
            旧・説明文の内容（業種×トピックを対訳で表示・印刷／雇入れ時教育・TBM）はカードへ集約（消さず格納）。 */}
        <ConclusionCard
          tone="info"
          value={SAFETY_MATERIAL_INDEX.all.length}
          unit="教材"
          title="多言語対応"
          description={`${industries.length}業種×${topics.length}トピックを やさしい日本語＋${MATERIAL_LANGUAGES.length - 1}言語の対訳で表示・印刷。雇入れ時教育・TBM・特別教育の補助資料にそのまま使えます。`}
          action={{ href: "#material-builder", label: "教材を選ぶ" }}
          className="mb-4"
        >
          <StatusBadge tone="info" size="sm">{MATERIAL_LANGUAGES.length}言語対訳</StatusBadge>
          <StatusBadge tone="safe" size="sm">無料</StatusBadge>
        </ConclusionCard>

        <p className="mb-6 text-xs text-slate-500">
          ※ 翻訳は機械翻訳をベースに整備しています。実際の現場運用ではネイティブチェックを併用してください。
        </p>

        <div id="material-builder" className="scroll-mt-20">
          <SafetyTrainingBuilder
            materials={filteredMaterials}
            industries={industries}
            topics={topics}
            currentIndustry={industry}
          />
        </div>

        <section className="mt-10 rounded-lg border border-emerald-200 bg-white p-5 text-sm text-slate-700 print:hidden">
          <h2 className="text-base font-semibold text-slate-900">関連ガイド</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <Link href="/foreign-workers" className="text-emerald-700 hover:underline">
                外国人労働者支援トップ（在留資格別ガイドあり）
              </Link>
            </li>
            <li>
              <Link href="/ky" className="text-emerald-700 hover:underline">
                KY（危険予知）用紙
              </Link>
              ：選んだ教材から KY ボードに項目を写すとそのまま現場掲示に使えます。
            </li>
            <li>
              <Link href="/lms" className="text-emerald-700 hover:underline">
                Eラーニング
              </Link>
              ：理解度テストを実施し受講記録として保存できます。
            </li>
          </ul>
        </section>
      </PageContainer>
    </div>
  );
}
