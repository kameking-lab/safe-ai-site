import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreateSimplePanel } from "@/components/chemical-ra/create-simple-panel";
import { PageContainer } from "@/components/layout";
import { ogImageUrl } from "@/lib/og-url";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import { inspectChemicalNavigationQuery } from "@/lib/chemical/query-safety";

import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
import { ChemicalRaNoScriptFallback } from "./chemical-ra-noscript";
const _title = "化学物質リスクアセスメント｜その場でリスクレベル判定（無料）";
const _desc =
  "物質名かCAS番号を入れて作業条件を選ぶだけで、吸入・経皮吸収・爆発火災のリスクレベル（Ⅰ〜Ⅳ）をその場で判定。換気や手袋などレベルを下げる対策も同じ計算で再評価し、保存・印刷・CSVで記録できます。厚生労働省 CREATE-SIMPLE の手法に基づく計算。";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function safeInitialChemicalQuery(params: SearchParams): string {
  const cas = firstParam(params.cas).trim();
  if (/^\d{2,7}-\d{2,3}-\d{1,2}$/.test(cas)) return cas;
  const inspection = inspectChemicalNavigationQuery(firstParam(params.name));
  return inspection.allowed ? inspection.normalized : "";
}

function hasUnsafeDirectChemicalQuery(params: SearchParams): boolean {
  const rawCas = firstParam(params.cas).trim();
  if (rawCas && !/^\d{2,7}-\d{2,3}-\d{1,2}$/.test(rawCas)) return true;
  const rawName = firstParam(params.name);
  return Boolean(rawName && !inspectChemicalNavigationQuery(rawName).allowed);
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const hasVariant = Object.keys(params).length > 0;
  return {
    title: _title,
    description: _desc,
    alternates: { canonical: "/chemical-ra" },
    referrer: hasVariant ? "no-referrer" : undefined,
    robots: hasVariant
      ? {
          index: false,
          follow: true,
          noarchive: true,
          googleBot: { index: false, follow: true, noarchive: true },
        }
      : undefined,
    openGraph: withSiteOpenGraph("/chemical-ra", {
      title: _title,
      description: _desc,
      images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
    }),
    twitter: withSiteTwitter({
      images: [ogImageUrl(_title, _desc)],
    }),
  };
}

export default async function ChemicalRaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  if (hasUnsafeDirectChemicalQuery(params)) redirect("/chemical-ra");
  const initialQuery = safeInitialChemicalQuery(params);
  return (
    <>
      <PageJsonLd
        name="化学物質リスクアセスメント"
        description={_desc}
        path="/chemical-ra"
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "化学物質リスクアセスメント",
          description: _desc,
          url: "https://www.anzen-ai-portal.jp/chemical-ra",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: 0, priceCurrency: "JPY" },
          publisher: {
            "@type": "Organization",
            name: "安全AIポータル",
            url: "https://www.anzen-ai-portal.jp",
          },
        }}
      />
      <PageContainer width="prose" paddingY="none" className="pt-6 print:hidden">
        <header>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
            化学物質リスクアセスメント
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
            物質と作業のようすを選ぶと、その場でリスクレベルと下げ方が出ます。
          </p>
        </header>
      </PageContainer>
      <noscript>
        <style>{`#chemical-ra-js { display: none !important; }`}</style>
        <ChemicalRaNoScriptFallback />
      </noscript>
      <div id="chemical-ra-js">
        <div id="chemical-ra-start" className="scroll-mt-28 pt-4">
          <CreateSimplePanel initialQuery={initialQuery} />
        </div>
      </div>
    </>
  );
}
