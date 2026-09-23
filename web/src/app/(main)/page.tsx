import type { Metadata } from "next";
import { HomeAutomationService } from "@/components/home/home-automation-service";
import { HomeAutomationSamples } from "@/components/home/home-automation-samples";
import { HomeActionCockpit } from "@/components/home/home-action-cockpit";
import { HomeFeatureDirectory } from "@/components/home/home-feature-directory";
import { HomeRelaunch } from "@/components/home/home-relaunch";
import { HomeSafetyUpdates } from "@/components/home/home-safety-updates";
import { PageJsonLd } from "@/components/page-json-ld";
import {
  JsonLd,
  organizationSchema,
  webSiteSchema,
} from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import { getAutomationConsultAvailability } from "@/lib/automation-consult/availability";
import { loadHomeLatestAccidentNews } from "@/lib/home/home-accident-server";

export const revalidate = 3_600;

const _title = "安全AIポータル｜根拠から、現場の行動へ";
const _desc =
  "安衛法AI、化学物質RA、労災事故速報、法改正、事故統計、教材、安全グッズを、出典と更新状態を確認しながら使える労働安全ポータルです。";

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
  const latestAccidentNews = await loadHomeLatestAccidentNews();
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
              <a href="/chatbot">安衛法AI</a>
            </li>
            <li>
              <a href="/chemical-ra">化学物質RA</a>
            </li>
            <li>
              <a href="/accident-news">労災事故速報</a>
            </li>
            <li>
              <a href="/laws">法改正速報</a>
            </li>
          </ul>
        </nav>
      </noscript>
      <HomeRelaunch
        mascotContent={<HomeActionCockpit />}
        priorityContent={<HomeSafetyUpdates latestNews={latestAccidentNews} />}
      />
      <HomeAutomationSamples />
      <HomeFeatureDirectory />
      <HomeAutomationService availability={automationConsultAvailability} />
    </div>
  );
}
