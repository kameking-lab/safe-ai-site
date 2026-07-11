import type { Metadata } from "next";
import Link from "next/link";
import { Presentation } from "lucide-react";
import { HazardGlyphBadge } from "@/components/accidents/accident-type-pictogram";
import { PageJsonLd } from "@/components/page-json-ld";
import { Breadcrumb } from "@/components/breadcrumb";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getHazardTypeSummaries } from "@/lib/hazard-slides/build-summary";
import { ogImageUrl } from "@/lib/og-url";

const TITLE = "災害の型別 安全教育スライド｜21分類・統計から自動生成";
const DESCRIPTION =
  "厚労省「事故の型」21分類ごとに、統計（件数・傾向）→多い原因→対策チェック（根拠条文リンク付き）→確認クイズの教育スライドを実データから自動生成。雇入れ時教育・職長教育・朝礼・サイネージで使えます。投影（16:9）とA4横印刷に対応。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/education/hazard-slides" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: ogImageUrl(TITLE, DESCRIPTION), width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: [ogImageUrl(TITLE, DESCRIPTION)] },
};

export const revalidate = 2592000;

export default function HazardSlidesHubPage() {
  const summaries = getHazardTypeSummaries();
  const totalDeaths = summaries.reduce((acc, s) => acc + s.kpi.deathsTotal, 0);
  const deathYears = summaries[0]?.dataAsOf.deaths.replace("死亡災害個票: ", "") ?? "";

  return (
    <>
      <PageJsonLd
        name="災害の型別 安全教育スライド"
        description={DESCRIPTION}
        path="/education/hazard-slides"
      />
      <Breadcrumb
        items={[
          { name: "教育", href: "/education" },
          { name: "災害の型別スライド" },
        ]}
      />
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">災害の型別 安全教育スライド</h1>
        <p className="mt-1 text-sm text-slate-600">
          統計 → 多い原因 → 対策（根拠条文つき） → クイズを、型ごとに1セット。データ更新に自動追従します。
        </p>
      </header>

      <ConclusionCard
        tone="info"
        value={21}
        unit="型"
        title="教育スライド公開中"
        description={`厚労省の死亡災害${totalDeaths.toLocaleString("ja-JP")}件（${deathYears}）と16年分の死傷統計から自動生成。手書きスライドはありません。`}
        action={{ href: "#hazard-grid", label: "型を選ぶ" }}
        icon={Presentation}
      >
        <StatusBadge tone="neutral" size="sm">
          投影16:9・A4横印刷対応
        </StatusBadge>
        <StatusBadge tone="neutral" size="sm">
          朝礼・雇入れ時教育・職長教育向け
        </StatusBadge>
      </ConclusionCard>

      <section id="hazard-grid" aria-label="災害の型一覧" className="mt-6">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {summaries.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/education/hazard-slides/${s.slug}`}
                className="flex min-h-[44px] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-amber-400 hover:shadow"
              >
                <HazardGlyphBadge glyph={s.glyph} label={s.label} size="lg" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-slate-900">{s.short}</span>
                  <span className="block text-xs tabular-nums text-slate-500">
                    死亡{s.kpi.deathsTotal.toLocaleString("ja-JP")}
                    {s.kpi.deathsRank ? `・第${s.kpi.deathsRank}位` : ""}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          件数は{deathYears}の死亡災害個票（厚生労働省）。順位は21分類内の死亡件数順。出典: 厚生労働省
          労働災害統計（政府標準利用規約2.0）。
        </p>
      </section>
    </>
  );
}
