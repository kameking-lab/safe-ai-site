import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { CalculatorPanel } from "@/components/construction-calc/calculator-panel";
import {
  CalcBasisSection,
  CalcCautionsSection,
  CalcRelatedSection,
} from "@/components/construction-calc/calc-reference";
import { CONSTRUCTION_CALCULATORS, getCalculator } from "@/lib/construction-calc/registry";

/**
 * 建設計算 個別計算機ページ（1計算機1画面）。
 * ページ本体は静的生成し、URLクエリの初期値はクライアント側（useSearchParams）で反映する。
 */

export function generateStaticParams() {
  return CONSTRUCTION_CALCULATORS.map((c) => ({ slug: c.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const calc = getCalculator(slug);
  if (!calc) return {};
  return {
    title: `${calc.title}｜建設計算`,
    description: calc.summary,
    alternates: { canonical: `/construction-calc/${slug}` },
  };
}

export default async function ConstructionCalcDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const calc = getCalculator(slug);
  if (!calc) notFound();
  const related = (calc.relatedSlugs ?? [])
    .map((s) => getCalculator(s))
    .filter((c): c is NonNullable<typeof c> => c !== undefined);

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-slate-50 dark:bg-slate-900">
      <PageJsonLd name={calc.title} description={calc.summary} path={`/construction-calc/${slug}`} />
      <PageContainer width="prose" paddingY="none" className="pt-4 pb-12">
        <nav aria-label="パンくず" className="mb-3 print:hidden">
          <Link
            href="/construction-calc"
            className="inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            建設計算トップ
          </Link>
        </nav>
        <header className="mb-4 print:hidden">
          <h1 className="text-xl font-bold leading-tight text-slate-900 dark:text-white sm:text-2xl">
            {calc.title}
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{calc.summary}</p>
        </header>
        <CalculatorPanel slug={slug} />
        {/* 根拠・注意・免責は入力に依存しないためサーバーレンダリング（本番HTMLに実在＝SEO/LCP要件）。
            印刷時は計算書（CalcReportSheet）側に同内容が入るため print:hidden で二重表示を避ける。 */}
        <div className="mt-4 space-y-4 print:hidden">
          <CalcBasisSection basis={calc.basis} />
          <CalcRelatedSection related={related} />
          <CalcCautionsSection cautions={calc.cautions} />
        </div>
      </PageContainer>
    </div>
  );
}
