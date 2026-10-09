import { CALCULATOR_TASKS } from "@/data/construction-calculators/input-guide-copy";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpenCheck, Calculator } from "lucide-react";
import { notFound } from "next/navigation";
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
  const defaultInput = { ...(normalFixture?.input ?? {}), ...(["rebar-weight","rebar-spacing"].includes(slug) ? {barType:"deformed",barDesignation:"D13",rounding:{decimalPlaces:3,mode:"round"}} : {}) };
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

      <header className="rounded-2xl bg-slate-950 px-4 py-4 text-white sm:px-6">
        <p className="flex items-center gap-2 text-sm font-black tracking-[.12em] text-emerald-300">
          <Calculator className="h-5 w-5" aria-hidden="true" />建設計算ツール
        </p>
        <h1 className="mt-2 max-w-4xl text-2xl font-black tracking-tight sm:text-3xl">{calculator.title}</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-200">{CALCULATOR_TASKS[calculator.slug]??calculator.purpose}</p>
        <p className="mt-2 text-xs font-bold leading-5 text-amber-100">
          概算用。安全・構造・法令適合の判定には使えません。
        </p>
      </header>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-8">
          <ConstructionCalculatorClient definition={publicDefinition} defaultInput={defaultInput} startEmpty />
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <details aria-labelledby="formula-title" className="rounded-2xl border-2 border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <summary id="formula-title" className="flex items-center gap-2 text-xl font-black"><BookOpenCheck className="h-5 w-5 text-emerald-800 dark:text-emerald-300" aria-hidden="true" />計算式</summary>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm font-semibold leading-6">
              {calculator.formula.map((formula) => <li key={formula}>{formula}</li>)}
            </ol>
          </details>
          <details aria-labelledby="assumptions-title" className="rounded-2xl border-2 border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <summary id="assumptions-title" className="cursor-pointer text-base font-black">前提・適用範囲</summary>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-semibold leading-6">
              {calculator.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
            </ul>
            <p className="mt-4 text-xs font-bold leading-5 text-slate-600 dark:text-slate-300">
              式バージョン {calculator.formulaVersion}／確認日 {calculator.checkedAt}
            </p>
          </details>
          <details aria-labelledby="sources-title" className="rounded-2xl border-2 border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <summary id="sources-title" className="cursor-pointer text-base font-black">根拠を確認</summary>
            <ul className="mt-3 space-y-3 text-sm leading-6">
              {calculator.sources.map((source) => (
                <li key={source.sourceId}>
                  <a href={source.url} target="_blank" rel="noreferrer" className="font-black text-emerald-800 underline underline-offset-4 dark:text-emerald-300">{source.title}</a>
                  <span className="mt-1 block text-xs text-slate-600 dark:text-slate-300">{source.publisher}／{source.locator}</span>
                </li>
              ))}
            </ul>
          </details>
          <Link href={CONSTRUCTION_CALCULATOR_HUB_PATH} className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-slate-500 px-4 py-2 font-black">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />{constructionCalculatorRegistry.length}種類の一覧へ
          </Link>
        </aside>
      </div>

      <noscript>
        <section className="mt-8 rounded-2xl border-2 border-amber-500 bg-amber-50 p-5 text-amber-950">
          <h2 className="text-xl font-black">JavaScriptを使わずに確認する</h2>
          <p className="mt-2 leading-7">入力欄は表示されますが、JavaScriptが無効な間は計算や履歴保存を使えません。上記の式、入力条件、前提を確認し、通常リンクから別の計算を選べます。</p>
          <Link href={CONSTRUCTION_CALCULATOR_HUB_PATH} className="mt-3 inline-flex min-h-11 items-center font-black underline underline-offset-4">建設計算ツール一覧へ</Link>
        </section>
      </noscript>
    </PageContainer>
  );
}
