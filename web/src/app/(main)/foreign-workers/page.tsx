import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, IdCard, Languages, ShieldCheck } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { CollapsibleDetail } from "@/components/ui/collapsible-detail";
import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
import { RESIDENCE_STATUS_INDEX } from "@/data/foreign-worker-rules";
import { SAFETY_MATERIAL_INDEX } from "@/data/foreign-worker-materials";
import { ogImageUrl } from "@/lib/og-url";
import {
  MATERIAL_INDUSTRY_LABELS_JA,
  MATERIAL_LANGUAGE_LABELS,
  MATERIAL_LANGUAGE_LABELS_JA,
  MATERIAL_LANGUAGES,
  MATERIAL_TOPIC_LABELS_JA,
  RESIDENCE_CATEGORY_LABELS_JA,
  type ResidenceCategory,
  type ResidenceStatusRule,
} from "@/types/foreign-worker";

const _title =
  "外国人労働者の安全衛生支援｜在留資格別ガイド・多言語安全教育教材";
const _desc =
  "技能実習・特定技能・技人国・身分系などの在留資格別に、事業主義務と労働者の権利を整理。建設・製造・介護・農業・外食・宿泊の6業種×5トピックの安全教育教材を、やさしい日本語と英語・ベトナム語・中国語・インドネシア語で提供します。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/foreign-workers" },
  openGraph: {
    title: _title,
    description: _desc,
    type: "website",
    locale: "ja_JP",
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

export default function ForeignWorkersHubPage() {
  const grouped: Record<ResidenceCategory, ResidenceStatusRule[]> = {
    training: [],
    "specified-skill": [],
    professional: [],
    "status-based": [],
    designated: [],
  };
  for (const rule of RESIDENCE_STATUS_INDEX.all) {
    grouped[rule.category].push(rule);
  }

  const totalMaterials = SAFETY_MATERIAL_INDEX.all.length;
  const totalLanguageVariants = totalMaterials * MATERIAL_LANGUAGES.length;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageJsonLd
        name="外国人労働者の安全衛生支援"
        description={_desc}
        path="/foreign-workers"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          {
            name: "外国人労働者の安全衛生支援",
            url: "https://www.anzen-ai-portal.jp/foreign-workers",
          },
        ]}
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "外国人労働者の安全衛生支援",
          url: "https://www.anzen-ai-portal.jp/foreign-workers",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Any",
          offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
          description: _desc,
          inLanguage: ["ja", "en", "vi", "zh", "id"],
        }}
      />
      <PageContainer width="wide" className="py-8 md:py-12">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
            Foreign Workers Safety Support
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            外国人労働者の安全衛生支援
          </h1>

          {/* 柱0: 結論カード — 3秒で「いまの状態（国籍問わず法令適用）」と次アクションが分かる */}
          <ConclusionCard
            className="mt-4"
            tone="info"
            icon={ShieldCheck}
            title="国籍問わず法令適用"
            description="労働基準法・労働安全衛生法・最低賃金法は国籍を問わず適用されます。受入れ時は理解できる言語で安全衛生教育を実施してください。"
            action={{ href: "/foreign-workers/safety-training", label: "教材を作る" }}
          >
            <StatusBadge tone="info">在留{RESIDENCE_STATUS_INDEX.all.length}資格</StatusBadge>
            <StatusBadge tone="info">教材{totalMaterials}本</StatusBadge>
            <StatusBadge tone="info">{MATERIAL_LANGUAGES.length}言語対応</StatusBadge>
            <StatusBadge tone="safe">無料</StatusBadge>
          </ConclusionCard>

          {/* 柱0: 最上部はアイコンファーストの2大動線 — 読まなくても行き先が分かる */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link
              href="/foreign-workers/safety-training"
              className="flex min-h-[44px] items-center gap-3 rounded-2xl border-2 border-sky-300 bg-sky-50 p-4 transition hover:border-sky-400 hover:shadow-sm"
            >
              <Languages className="h-10 w-10 shrink-0 text-sky-700" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold text-sky-900">教材を作る</span>
                <span className="mt-0.5 block text-xs text-sky-800">
                  やさしい日本語＋英・越・中・尼の対訳教材を表示・印刷
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-sky-700" aria-hidden="true" />
            </Link>
            <Link
              href="#status-guide"
              className="flex min-h-[44px] items-center gap-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 transition hover:border-emerald-400 hover:shadow-sm"
            >
              <IdCard className="h-10 w-10 shrink-0 text-emerald-700" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold text-emerald-900">在留資格ガイド</span>
                <span className="mt-0.5 block text-xs text-emerald-800">
                  資格別の事業主義務と労働者の権利を確認
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
            </Link>
          </div>
        </header>

        <section id="status-guide" className="mb-10 scroll-mt-20">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">在留資格別ガイド</h2>
            <p className="text-xs text-slate-500">
              更新: 出入国在留管理庁・厚生労働省・OTIT 公開情報に基づく
            </p>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            在留資格に応じて事業主に課される義務と、労働者に保障される権利を整理しています。
            該当する資格を選んで詳細をご確認ください。
          </p>

          <div className="mt-5 space-y-6">
            {(Object.keys(grouped) as ResidenceCategory[]).map((category) => {
              const rules = grouped[category];
              if (rules.length === 0) return null;
              return (
                <div key={category}>
                  <h3 className="text-base font-semibold text-slate-800">
                    {RESIDENCE_CATEGORY_LABELS_JA[category]}
                  </h3>
                  <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {rules.map((rule) => (
                      <li key={rule.id}>
                        <Link
                          href={`/foreign-workers/status/${rule.id}`}
                          className="block h-full rounded-lg border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm"
                        >
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            {rule.labelEn}
                          </p>
                          <p className="mt-0.5 text-base font-semibold text-slate-900">
                            {rule.labelJa}
                          </p>
                          <p className="mt-2 line-clamp-3 text-sm text-slate-600">
                            {rule.summary}
                          </p>
                          <p className="mt-3 text-xs text-slate-500">
                            <span className="inline-block rounded bg-slate-100 px-2 py-0.5">
                              在留期間 {rule.periodOfStay}
                            </span>
                            {rule.unlimitedWorkScope && (
                              <span className="ml-1 inline-block rounded bg-emerald-100 px-2 py-0.5 text-emerald-700">
                                就労制限なし
                              </span>
                            )}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mb-10 rounded-xl border border-sky-200 bg-white p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                多言語安全教育教材ビルダー
              </h2>
              <p className="mt-2 text-sm text-slate-700">
                業種とトピックを選ぶと、やさしい日本語＋4言語の対訳教材を表示・印刷できます。
                外国人技能実習生・特定技能労働者の雇入れ時教育、TBM（ツールボックスミーティング）
                資料として活用できます。
              </p>
            </div>
            <Link
              href="/foreign-workers/safety-training"
              className="inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
            >
              教材を作る →
            </Link>
          </div>

          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-slate-500">業種</p>
              <p className="mt-1 text-slate-800">
                {Object.values(MATERIAL_INDUSTRY_LABELS_JA).join(" / ")}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">トピック</p>
              <p className="mt-1 text-slate-800">
                {Object.values(MATERIAL_TOPIC_LABELS_JA).join(" / ")}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold text-slate-500">言語</p>
              <p className="mt-1 text-slate-800">
                {MATERIAL_LANGUAGES.map(
                  (l) =>
                    `${MATERIAL_LANGUAGE_LABELS_JA[l]} (${MATERIAL_LANGUAGE_LABELS[l]})`,
                ).join(" / ")}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                合計 {totalLanguageVariants} 言語バリエーション
              </p>
            </div>
          </div>
        </section>

        {/* 柱0・文字ダイエット: 段落系は折りたたみへ格納（内容は1文字も変えない） */}
        <CollapsibleDetail
          summary="事業主向けチェックリスト（在留資格共通の最低基準 8項目）"
          className="mb-3"
        >
          <p className="text-sm text-slate-700">
            外国人労働者を受け入れる事業主が、在留資格にかかわらず最低限満たすべき項目です。
            該当する在留資格の詳細ページで、追加の義務を必ず確認してください。
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-800">
            {EMPLOYER_BASELINE.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span
                  aria-hidden
                  className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CollapsibleDetail>

        <CollapsibleDetail summary="出典・参考資料">
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>厚生労働省「外国人労働者向け労働関係法令周知用パンフレット」</li>
            <li>出入国在留管理庁「在留資格一覧」「特定技能制度」</li>
            <li>外国人技能実習機構（OTIT）「技能実習制度運用要領」</li>
            <li>国際協力機構（JITCO）「外国人材受入れマニュアル」</li>
            <li>厚生労働省「STOP！熱中症 クールワークキャンペーン」</li>
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            本ページの情報は2024年4月以降の制度改正（特定技能2号の対象分野拡大、育成就労制度の検討等を含む）の
            公開情報に基づき編集しています。最新の運用については各官公庁の公表資料を必ず参照してください。
          </p>
        </CollapsibleDetail>
      </PageContainer>
    </div>
  );
}

const EMPLOYER_BASELINE: string[] = [
  "雇用契約書を本人が理解できる言語で交付し、賃金・労働時間・休日を明示する（労基法第15条）。",
  "雇入れ時の安全衛生教育を、理解可能な言語または図示・実技で実施する（安衛法第59条）。",
  "就業制限業務・特別教育を要する業務は、資格・修了証を確認してから配置する（安衛法第61条等）。",
  "外国人雇用状況届出をハローワークへ提出する（雇入れ・離職時。特別永住者は除く）。",
  "労災保険・健康保険・厚生年金・雇用保険に国籍に関わらず加入させる。",
  "賃金は地域別最低賃金以上、かつ同等業務の日本人と同等以上を支払う。",
  "旅券・在留カードを取り上げない。私生活・通信の自由を侵害しない。",
  "母国語または分かる言語で相談できる窓口を整備する（窓口リストを掲示）。",
];
