import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpenCheck, Calculator } from "lucide-react";
import { notFound } from "next/navigation";
import { CalculatorDimensionDiagram } from "@/components/construction-calculators/calculator-dimension-diagram";
import { ConstructionCalculatorClient } from "@/components/construction-calculators/construction-calculator-client";
import { JsonLd } from "@/components/json-ld";
import { PageContainer } from "@/components/layout";
import { CONSTRUCTION_CALCULATOR_HUB_PATH } from "@/data/construction-calculators/coming-soon";
import {
  constructionCalculatorRegistry,
  getConstructionCalculatorFormula,
} from "@/data/construction-calculators/formula-registry";
import { SITE_URL, withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";

export const dynamicParams = false;

export function generateStaticParams() {
  return constructionCalculatorRegistry.map(({ slug }) => ({ slug }));
}

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const query = await searchParams;
  const calculator = getConstructionCalculatorFormula(slug);
  if (!calculator) return {};
  const path = `${CONSTRUCTION_CALCULATOR_HUB_PATH}/${calculator.slug}`;
  const title = `${calculator.title}｜無料の建設計算ツール`;
  const description = `${calculator.purpose} 結果、使用した入力値、式、単位、丸め方法と前提を表示し、PDF・CSVへ出力できます。`;
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: Object.keys(query).length ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: withSiteOpenGraph(path, { title, description }),
    twitter: withSiteTwitter({ title, description }),
  };
}

export default async function ConstructionCalculatorDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const calculator = getConstructionCalculatorFormula(slug);
  if (!calculator) notFound();
  const path = `${CONSTRUCTION_CALCULATOR_HUB_PATH}/${calculator.slug}`;
  const normalFixture = calculator.testFixtures.find((fixture) => fixture.kind === "normal" && fixture.expectedOk);
  const defaultInput = normalFixture?.input ?? {};
  const { testFixtures: _testFixtures, ...publicDefinition } = calculator;

  return (
    <PageContainer width="full" className="pb-20">
      <JsonLd
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "ホーム", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "建設計算ツール", item: `${SITE_URL}${CONSTRUCTION_CALCULATOR_HUB_PATH}` },
              { "@type": "ListItem", position: 3, name: calculator.title, item: `${SITE_URL}${path}` },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: calculator.title,
            description: calculator.purpose,
            url: `${SITE_URL}${path}`,
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            browserRequirements: "JavaScript",
            isAccessibleForFree: true,
            offers: { "@type": "Offer", price: 0, priceCurrency: "JPY" },
          },
        ]}
      />

      <nav aria-label="パンくず" className="mb-5 text-sm text-slate-600 dark:text-slate-300">
        <Link href="/" className="underline underline-offset-4">ホーム</Link>
        <span aria-hidden="true"> / </span>
        <Link href={CONSTRUCTION_CALCULATOR_HUB_PATH} className="underline underline-offset-4">建設計算ツール</Link>
        <span aria-hidden="true"> / </span>
        <span>{calculator.title}</span>
      </nav>

      <header className="rounded-[2rem] bg-slate-950 px-5 py-8 text-white sm:px-8 lg:px-12 lg:py-10">
        <p className="flex items-center gap-2 text-sm font-black tracking-[.12em] text-emerald-300">
          <Calculator className="h-5 w-5" aria-hidden="true" />建設計算ツール
        </p>
        <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">{calculator.title}</h1>
        <p className="mt-4 max-w-4xl leading-7 text-slate-200">{calculator.purpose}</p>
        <p className="mt-5 max-w-4xl rounded-xl border border-amber-300 bg-amber-200/10 p-3 text-sm font-black leading-6 text-amber-100">
          概算支援です。構造設計、強度、安全可否、法令適合、発注数量を判定・保証しません。
        </p>
      </header>

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="min-w-0 space-y-8">
          <CalculatorDimensionDiagram slug={calculator.slug} />
          <ConstructionCalculatorClient definition={publicDefinition} defaultInput={defaultInput} />
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <section aria-labelledby="formula-title" className="rounded-2xl border-2 border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h2 id="formula-title" className="flex items-center gap-2 text-xl font-black"><BookOpenCheck className="h-5 w-5 text-emerald-800 dark:text-emerald-300" aria-hidden="true" />計算式</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm font-semibold leading-6">
              {calculator.formula.map((formula) => <li key={formula}>{formula}</li>)}
            </ol>
          </section>
          <section aria-labelledby="assumptions-title" className="rounded-2xl border-2 border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h2 id="assumptions-title" className="text-xl font-black">前提・適用範囲</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-semibold leading-6">
              {calculator.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
            </ul>
            <p className="mt-4 text-xs font-bold leading-5 text-slate-600 dark:text-slate-300">
              式バージョン {calculator.formulaVersion}／確認日 {calculator.checkedAt}
            </p>
          </section>
          <section aria-labelledby="sources-title" className="rounded-2xl border-2 border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h2 id="sources-title" className="text-xl font-black">根拠</h2>
            <ul className="mt-3 space-y-3 text-sm leading-6">
              {calculator.sources.map((source) => (
                <li key={source.sourceId}>
                  <a href={source.url} target="_blank" rel="noreferrer" className="font-black text-emerald-800 underline underline-offset-4 dark:text-emerald-300">{source.title}</a>
                  <span className="mt-1 block text-xs text-slate-600 dark:text-slate-300">{source.publisher}／{source.locator}</span>
                </li>
              ))}
            </ul>
          </section>
          <Link href={CONSTRUCTION_CALCULATOR_HUB_PATH} className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-slate-500 px-4 py-2 font-black">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />12種類の一覧へ
          </Link>
        </aside>
      </div>

      <noscript>
        <section className="mt-8 rounded-2xl border-2 border-amber-500 bg-amber-50 p-5 text-amber-950">
          <h2 className="text-xl font-black">JavaScriptを使わずに確認する</h2>
          <p className="mt-2 leading-7">このページでは動かない入力フォームを表示しません。上記の式、入力条件、前提を確認し、通常リンクから別の計算を選べます。</p>
          <Link href={CONSTRUCTION_CALCULATOR_HUB_PATH} className="mt-3 inline-flex min-h-11 items-center font-black underline underline-offset-4">建設計算ツール一覧へ</Link>
        </section>
      </noscript>
    </PageContainer>
  );
}
