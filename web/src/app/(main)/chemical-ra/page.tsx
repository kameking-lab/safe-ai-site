import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChemicalRaPanel } from "@/components/chemical-ra-panel";
import {
  LazyChemicalRaExtras,
  LazyMixtureRaPanel,
  LazySavedRaList,
  LazySdsUploadPanel,
} from "@/components/chemical/lazy-secondary-panels";
import { PageContainer } from "@/components/layout";
import { ogImageUrl } from "@/lib/og-url";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import { inspectChemicalNavigationQuery } from "@/lib/chemical/query-safety";
import { TransientChemicalLink } from "@/components/home-safety-cockpit/transient-chemical-link";

import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
import { ChemicalRaNoScriptFallback } from "./chemical-ra-noscript";
const _title =
  "化学物質リスクアセスメント無料確認｜CAS・SDS・混合物";
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
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">化学物質RA</h1>
            {directStart ? <span data-status-badge className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900">候補を検索中</span> : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-700">物質名・CAS番号・SDS記載名から始めます。</p>
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
      {/* 職種別クイックスタート: 物質名のクリックでRA入力を即プリフィル（exp: 入力の手間を削減） */}
      <PageContainer paddingY="none" className="pt-3 print:hidden">
        <details className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold text-slate-800 dark:text-slate-100">
            職種別クイックスタート（例から選ぶ）
          </summary>
          <p className="mt-0.5 text-xs text-portal-muted">
            扱うことが多い化学物質の
            <strong className="font-semibold">例</strong>
            です。クリックすると収録情報を表示します（実際の取扱物質は製品固有の最新SDSでご確認ください）。
          </p>
          <div className="mt-3 space-y-2">
            {[
              {
                trade: "塗装・防水・接着",
                subs: ["トルエン", "キシレン", "酢酸エチル", "ジクロロメタン"],
              },
              {
                trade: "溶接・金属加工",
                subs: ["一酸化炭素", "マンガン", "アセチレン"],
              },
              {
                trade: "内装・清掃・洗浄",
                subs: [
                  "メタノール",
                  "ノルマルヘキサン",
                  "次亜塩素酸ナトリウム",
                ],
              },
              {
                trade: "設備・メッキ・薬品",
                subs: ["硫酸", "水酸化ナトリウム", "アンモニア"],
              },
            ].map((g) => (
              <div key={g.trade} className="flex flex-wrap items-center gap-2">
                <span className="w-32 shrink-0 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {g.trade}
                </span>
                {g.subs.map((s) => (
                  <TransientChemicalLink
                    key={s}
                    query={s}
                    // 柱0: 物質名チップはRAを開始する主要CTA。指タップ標的を44px以上に
                    // （min-h/min-w-[44px]＋inline-flexで中央寄せ。見た目のpill/色は不変）
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
                  >
                    {s}
                  </TransientChemicalLink>
                ))}
              </div>
            ))}
          </div>
          <p className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
            なぜ評価・記録が重要か：化学物質による健康障害では、予見可能性は「安全性に疑念を抱かせる程度の抽象的な危惧で足りる」と判断され、対策を怠った会社の
            <strong className="font-semibold">安全配慮義務違反</strong>
            が認められています（例: 三星化学工業 職業性膀胱がん事件）。
            <Link
              href="/court-cases/employer-liability"
              className="ml-1 font-semibold text-rose-700 underline decoration-rose-300 underline-offset-2 hover:text-rose-900 dark:text-rose-300"
            >
              労災で問われる責任を見る
            </Link>
            <span className="mx-1 text-slate-300">|</span>
            <Link
              href="/court-cases?field=%E8%A3%BD%E9%80%A0%E3%83%BB%E9%80%A0%E8%88%B9"
              className="font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-900 dark:text-emerald-300"
            >
              関連判例
            </Link>
          </p>
        </details>
      </PageContainer>

      {/* 補助入力は主操作の後へ段階表示する。 */}
      <PageContainer paddingY="none" className="pt-3 print:hidden">
        {/* P2-1: SDS PDF/画像をAIが読み取り、RA・全法律規制へ誘導。
            一窓化: 主動線は上の1窓検索。SDS読取は折りたたみ（収載外カードから #sds-upload で着地） */}
        <details
          id="sds-upload"
          className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
        >
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold text-slate-800 dark:text-slate-100">
            SDS（PDF・写真）を読み取って物質を特定する
          </summary>
          <div className="mt-2">
            <LazySdsUploadPanel />
          </div>
        </details>
      </PageContainer>
      {/* 混合物の収録情報集約 — 数値ばく露計算は行わない。 */}
      <PageContainer paddingY="none" className="pt-3 print:hidden">
        <details className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold text-slate-800 dark:text-slate-100">
            混合物の収録情報をまとめて確認
          </summary>
          <div className="mt-2">
            <LazyMixtureRaPanel />
          </div>
        </details>
      </PageContainer>
      {/* P1-5: 保存したRA一覧（クラウド＋ローカル）。一窓化: 折りたたみで下部に集約 */}
      <PageContainer paddingY="none" className="pt-2 print:hidden">
        <details className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold text-slate-800 dark:text-slate-100">
            保存したリスクアセスメント一覧
          </summary>
          <div className="mt-2">
            <LazySavedRaList />
          </div>
        </details>
      </PageContainer>
      <div className="print:hidden">
        <details className="mx-auto max-w-7xl px-4 lg:px-8">
          <summary className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            現場の化学物質リスト・AI追加調査などの補助ツール
          </summary>
          <LazyChemicalRaExtras />
        </details>
      </div>
      </div>
    </>
  );
}
