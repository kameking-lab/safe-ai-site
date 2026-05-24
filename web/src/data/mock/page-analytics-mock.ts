import type {
  DeviceShare,
  EngagementMetrics,
  PageAnalyticsPage,
  PageAnalyticsResponse,
  ReferralRow,
  StatsPeriod,
} from "@/lib/stats/types";

function periodScale(p: StatsPeriod): number {
  if (p === "7d") return 1;
  if (p === "30d") return 4;
  return 11;
}

export function buildMockPageAnalyticsResponse(
  period: StatsPeriod,
  error?: string,
): PageAnalyticsResponse {
  const k = periodScale(period);

  const pages: PageAnalyticsPage[] = [
    { url: "/", title: "トップ", pv: 1280 * k, avgSec: 92, engagementRate: 0.54, bounceRate: 0.46 },
    { url: "/chatbot", title: "AIチャット", pv: 920 * k, avgSec: 312, engagementRate: 0.68, bounceRate: 0.32 },
    { url: "/laws", title: "法改正一覧", pv: 540 * k, avgSec: 215, engagementRate: 0.61, bounceRate: 0.39 },
    { url: "/accidents", title: "事故データベース", pv: 460 * k, avgSec: 198, engagementRate: 0.58, bounceRate: 0.42 },
    { url: "/ky", title: "KY用紙", pv: 380 * k, avgSec: 187, engagementRate: 0.55, bounceRate: 0.45 },
    { url: "/risk-prediction", title: "AIリスク予測", pv: 320 * k, avgSec: 263, engagementRate: 0.64, bounceRate: 0.36 },
    { url: "/elearning", title: "Eラーニング", pv: 240 * k, avgSec: 412, engagementRate: 0.71, bounceRate: 0.29 },
    { url: "/safety-diary", title: "安全衛生日誌", pv: 180 * k, avgSec: 156, engagementRate: 0.52, bounceRate: 0.48 },
    { url: "/chemical-database", title: "化学物質DB", pv: 140 * k, avgSec: 142, engagementRate: 0.49, bounceRate: 0.51 },
  ];

  const engagement: EngagementMetrics = {
    engagementRate: 0.58,
    avgSessionSec: 184,
    pagesPerSession: 2.7,
  };

  const devices: DeviceShare[] = [
    { device: "mobile", sessions: 1840 * k, pct: 0.61 },
    { device: "desktop", sessions: 980 * k, pct: 0.32 },
    { device: "tablet", sessions: 210 * k, pct: 0.07 },
  ];

  const referrals: ReferralRow[] = [
    { source: "google", medium: "organic", sessions: 1240 * k },
    { source: "(direct)", medium: "(none)", sessions: 870 * k },
    { source: "yahoo", medium: "organic", sessions: 320 * k },
    { source: "twitter.com", medium: "referral", sessions: 180 * k },
    { source: "bing", medium: "organic", sessions: 92 * k },
  ];

  return {
    period,
    source: "mock",
    generatedAt: new Date().toISOString(),
    pages,
    engagement,
    devices,
    referrals,
    ...(error ? { error } : {}),
  };
}
