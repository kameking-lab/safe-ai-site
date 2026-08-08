import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { HomeAutomationService } from "@/components/home/home-automation-service";
import { HomeAutomationSamples } from "@/components/home/home-automation-samples";
import { HomeCoreFeatures } from "@/components/home/home-core-features";
import { HomeLearningOverview } from "@/components/home/home-learning-overview";
import { HomeSafetyUpdates } from "@/components/home/home-safety-updates";
import { PageJsonLd } from "@/components/page-json-ld";
import {
  JsonLd,
  organizationSchema,
  webSiteSchema,
} from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import {
  HomeDirectChatSection,
  HomeDirectChemicalSection,
  HomeHeatSection,
} from "@/components/home-safety-cockpit/home-safety-cockpit";
import { getAutomationConsultAvailability } from "@/lib/automation-consult/availability";
import {
  HOME_COARSE_AREA_COOKIE,
  resolveVercelCoarseArea,
} from "@/lib/area/coarse-location";
import { officialAreaCandidateById } from "@/lib/area/official-area-resolver";
import { loadHomeHeatInitialData } from "@/lib/home/home-heat-server";
import { loadHomeLatestAccidentNews } from "@/lib/home/home-accident-server";

// 今日のKYTと夏季特集をJST日付境界で切り替える。
export const dynamic = "force-dynamic";

const _title = "安全AIポータル｜根拠から、現場の行動へ";
const _desc =
  "今日の現場リスク、安衛法AI、化学物質RA、労災事故、法改正、教育・資格、ビジュアルKYTを、出典と更新状態を確認しながら使える労働安全ポータルです。";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title: { absolute: _title },
  description: _desc,
  keywords: [
    "安全AIポータル",
    "安全AI",
    "労働安全AI",
    "安全管理AI",
    "安全衛生AI",
  ],
  openGraph: withSiteOpenGraph("/", {
    title: { absolute: _title },
    description: _desc,
    images: [{ url: ogImageUrl("根拠から、現場の行動へ"), width: 1200, height: 630 }],
  }),
  twitter: withSiteTwitter({
    images: [ogImageUrl("根拠から、現場の行動へ")],
  }),
};

export default async function HomePage() {
  const automationConsultAvailability = getAutomationConsultAvailability();
  const [requestHeaders, cookieStore] = await Promise.all([
    headers(),
    cookies(),
  ]);
  const previousArea = officialAreaCandidateById(
    cookieStore.get(HOME_COARSE_AREA_COOKIE)?.value ?? "",
  );
  const ipCoarseArea = resolveVercelCoarseArea({
    country: requestHeaders.get("x-vercel-ip-country"),
    countryRegion: requestHeaders.get("x-vercel-ip-country-region"),
  });
  const coarseArea = previousArea ?? ipCoarseArea;
  const [initialHeat, latestAccidentNews] = await Promise.all([
    loadHomeHeatInitialData(coarseArea?.id ?? null),
    loadHomeLatestAccidentNews(),
  ]);
  return (
    <div>
      <JsonLd schema={[organizationSchema(), webSiteSchema()]} />
      <PageJsonLd
        name={_title}
        description={_desc}
        path="/"
        hideVisibleBreadcrumb
      />
      <noscript>
        <nav
          aria-label="JavaScriptなしで利用できる機能"
          className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-amber-950"
        >
          <p className="mx-auto max-w-7xl text-sm font-bold">
            JavaScriptなしでも実情報を読めます。入力や地域変更は各ページの通常リンクから利用してください。
          </p>
          <ul className="mx-auto mt-2 flex max-w-7xl flex-wrap gap-x-4 gap-y-2 text-sm font-black underline underline-offset-4">
            <li>
              <a href="/risk">WBGT・現場リスク</a>
            </li>
            <li>
              <a href="/heat-illness-prevention/slides">熱中症スライド</a>
            </li>
          </ul>
        </nav>
      </noscript>
      <HomeHeatSection
        initialAreaId={coarseArea?.id ?? null}
        initialAreaLabel={coarseArea?.label ?? null}
        initialLocationSource={
          previousArea ? "previous" : ipCoarseArea ? "ip-coarse" : "national"
        }
        initialWbgt={initialHeat.wbgt}
        nationalSummary={initialHeat.national}
      />
      <HomeDirectChatSection />
      <HomeSafetyUpdates latestNews={latestAccidentNews} />
      <HomeDirectChemicalSection />
      <HomeLearningOverview />
      <HomeCoreFeatures />
      <HomeAutomationSamples />
      <HomeAutomationService availability={automationConsultAvailability} />
    </div>
  );
}
