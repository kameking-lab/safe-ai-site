import type { Metadata } from "next";
import { TodaySafetyPanel } from "@/components/risk/today-safety-panel";
import { ogImageUrl } from "@/lib/og-url";
import { PageJsonLd } from "@/components/page-json-ld";
import { isCanonicalAreaId } from "@/lib/area/official-area-resolver";

const _title = "リスク管理ハブ｜現場リスクアセスメント・気象警報";
const _desc =
  "現場リスクアセスメント、化学物質RA、KY活動、気象警報を一か所に集約。屋外作業・建設現場の安全管理をまとめて支援。";

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const hasVariant = Object.keys(params).length > 0;
  return {
    alternates: { canonical: "/risk" },
    title: _title,
    description: _desc,
    referrer: hasVariant ? "no-referrer" : undefined,
    robots: hasVariant
      ? {
          index: false,
          follow: true,
          noarchive: true,
          googleBot: { index: false, follow: true, noarchive: true },
        }
      : undefined,
    openGraph: {
      title: `${_title}`,
      description: _desc,
      images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      images: [ogImageUrl(_title, _desc)],
    },
  };
}

export default async function RiskPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const areaParam = typeof params.area === "string" ? params.area : null;
  const initialAreaId = isCanonicalAreaId(areaParam) ? areaParam : null;
  return (
    <>
      <PageJsonLd
        name="リスク管理ハブ"
        description="現場リスクアセスメント・化学物質RA・KY活動・気象警報を集約したハブページ。"
        path="/risk"
      />

      {/* C-007: reframe as RA hub so visitors expecting risk assessment find what they need */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">今日の安全</h1>
          <p className="mt-2 text-sm leading-6 text-slate-700">地域と作業を選ぶと、警報・予報・朝礼要点を表示します。</p>
        </header>

        {/* 柱0: いまの状態（気象警報の結論カード）を最上部に。ナビカードは状態の後 */}
        <div id="today-safety" className="mt-4 scroll-mt-28" data-risk-client-controls>
          <TodaySafetyPanel initialAreaId={initialAreaId} />
        </div>
        <noscript>
          <style>{`[data-risk-client-controls] { display: none !important; }`}</style>
          <section aria-labelledby="risk-nojs-title" className="mt-4 rounded-xl border border-slate-300 bg-white p-4">
            <h2 id="risk-nojs-title" className="text-lg font-black text-slate-950">現在の警報・現場情報</h2>
            <nav aria-label="JavaScriptなしで確認できる情報" className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold">
              <a href="/signage" className="inline-flex min-h-11 items-center text-brand-primary underline underline-offset-4">朝礼サイネージで確認</a>
              <a href="https://www.jma.go.jp/bosai/warning/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-brand-primary underline underline-offset-4">気象庁の警報を確認</a>
            </nav>
          </section>
        </noscript>

      </div>
    </>
  );
}
