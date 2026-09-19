import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChemicalRaPanel } from "@/components/chemical-ra-panel";
import { ChemicalRaSecondaryTools } from "@/components/chemical/chemical-ra-secondary-tools";
import { PageContainer } from "@/components/layout";
import { ogImageUrl } from "@/lib/og-url";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import { inspectChemicalNavigationQuery } from "@/lib/chemical/query-safety";

import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
import { ChemicalRaNoScriptFallback } from "./chemical-ra-noscript";
import { FeatureMascotCompanion } from "@/components/feature-mascot-companion";
const _title = "化学物質リスクアセスメント無料確認｜CAS・SDS・混合物";
const _desc =
  "CAS番号・最新SDS・混合物の成分と作業条件を整理する無料の簡易スクリーニング。独自の自動判定はせず、厚生労働省の公式CREATE-SIMPLEと人による最終確認へ案内します。";

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
  const directStart = Boolean(initialQuery);
  return (
    <>
      <PageJsonLd
        name="化学物質の公的情報確認支援"
        description={_desc}
        path="/chemical-ra"
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "化学物質の公的情報・SDS確認支援",
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
      <PageContainer paddingY="none" className="pt-6 print:hidden">
        <header>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              化学物質RA
            </h1>
            {directStart ? (
              <span
                data-status-badge
                className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900"
              >
                候補を検索中
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            物質名・CAS番号・SDS記載名から始めます。
          </p>
          <FeatureMascotCompanion
            variant="chemical-lab"
            eyebrow="化学物質の確認係"
            title="まずは容器やSDSに書かれた名前を一緒に確認しましょう。"
            message="検索結果は候補です。実際の製品の最新SDSと照らして進めます。"
            tone="amber"
            compact
            className="mt-4 max-w-3xl"
          />
        </header>
      </PageContainer>
      <noscript>
        <style>{`#chemical-ra-js { display: none !important; }`}</style>
        <ChemicalRaNoScriptFallback />
      </noscript>
      <div id="chemical-ra-js">
        <div id="chemical-ra-start" className="scroll-mt-28">
          <ChemicalRaPanel initialQuery={initialQuery} />
        </div>
        <ChemicalRaSecondaryTools />
      </div>
    </>
  );
}
