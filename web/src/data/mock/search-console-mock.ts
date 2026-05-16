import type {
  SearchConsoleResponse,
  StatsPeriod,
} from "@/lib/stats/types";

/**
 * Fallback dataset for /api/search-console when the GSC API is unreachable
 * or the service account does not yet have permission on the property.
 *
 * Numbers are intentionally small so the dashboard signals "data still
 * accumulating" rather than misleading visitors with synthetic spikes.
 */
function periodScale(p: StatsPeriod): number {
  if (p === "7d") return 1;
  if (p === "30d") return 4;
  return 11;
}

export function buildMockSearchConsoleResponse(
  period: StatsPeriod,
  error?: string,
): SearchConsoleResponse {
  const k = periodScale(period);
  const impressions = 320 * k;
  const clicks = 18 * k;
  const ctr = impressions > 0 ? clicks / impressions : 0;

  const queries = [
    { query: "労働安全衛生法 改正", impressions: 78 * k, clicks: 6 * k, ctr: 0.077, position: 18.4 },
    { query: "KY 用紙 テンプレート", impressions: 54 * k, clicks: 4 * k, ctr: 0.074, position: 22.1 },
    { query: "リスクアセスメント 例", impressions: 41 * k, clicks: 3 * k, ctr: 0.073, position: 19.8 },
    { query: "ヒヤリハット 報告書", impressions: 35 * k, clicks: 2 * k, ctr: 0.057, position: 27.2 },
    { query: "化学物質 SDS", impressions: 28 * k, clicks: 1 * k, ctr: 0.036, position: 33.7 },
  ];

  const pages = [
    { page: "/chatbot", impressions: 92 * k, clicks: 6 * k, ctr: 0.065, position: 21.3 },
    { page: "/laws", impressions: 71 * k, clicks: 4 * k, ctr: 0.056, position: 24.5 },
    { page: "/ky", impressions: 54 * k, clicks: 3 * k, ctr: 0.056, position: 20.1 },
    { page: "/accidents", impressions: 47 * k, clicks: 2 * k, ctr: 0.043, position: 26.8 },
    { page: "/risk-prediction", impressions: 33 * k, clicks: 1 * k, ctr: 0.030, position: 31.4 },
  ];

  const countries = [
    { country: "jpn", impressions: 287 * k, clicks: 17 * k },
    { country: "usa", impressions: 12 * k, clicks: 0 },
    { country: "twn", impressions: 8 * k, clicks: 1 * k },
  ];

  const devices = [
    { device: "MOBILE", impressions: 184 * k, clicks: 11 * k },
    { device: "DESKTOP", impressions: 121 * k, clicks: 6 * k },
    { device: "TABLET", impressions: 15 * k, clicks: 1 * k },
  ];

  return {
    period,
    source: "mock",
    generatedAt: new Date().toISOString(),
    siteUrl: "",
    summary: {
      impressions,
      clicks,
      ctr,
      position: 23.6,
    },
    queries,
    pages,
    countries,
    devices,
    ...(error ? { error } : {}),
  };
}
