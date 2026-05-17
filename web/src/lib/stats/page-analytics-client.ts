import { buildMockPageAnalyticsResponse } from "@/data/mock/page-analytics-mock";
import type {
  DeviceShare,
  EngagementMetrics,
  PageAnalyticsPage,
  PageAnalyticsResponse,
  ReferralRow,
  StatsPeriod,
} from "./types";

/**
 * GA4 page-analytics expansion: returns engagement / device / referral
 * breakdowns on top of the page-level PV list already produced by
 * /api/stats. Shares the same GOOGLE_APPLICATION_CREDENTIALS_JSON +
 * GA4_PROPERTY_ID env vars and the same fallback semantics.
 */
function isConfigured(): boolean {
  if (!process.env.GA4_PROPERTY_ID) return false;
  if (
    !process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON &&
    !process.env.GOOGLE_APPLICATION_CREDENTIALS
  ) {
    return false;
  }
  return true;
}

function periodToDates(period: StatsPeriod): { startDate: string; endDate: string } {
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  return { startDate: `${days}daysAgo`, endDate: "today" };
}

export async function fetchPageAnalytics(
  period: StatsPeriod,
): Promise<PageAnalyticsResponse> {
  if (!isConfigured()) {
    return buildMockPageAnalyticsResponse(period, "ga4 credentials missing");
  }
  try {
    return await fetchFromGa4(period);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[page-analytics] GA4 fetch failed, falling back to mock:", message);
    return buildMockPageAnalyticsResponse(period, message);
  }
}

async function fetchFromGa4(period: StatsPeriod): Promise<PageAnalyticsResponse> {
  const { BetaAnalyticsDataClient } = await import("@google-analytics/data");
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || "{}";
  let parsed: { client_email?: string; private_key?: string; project_id?: string } = {};
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error("[page-analytics] credentials JSON parse failed:", e);
  }

  const client = new BetaAnalyticsDataClient({
    fallback: true,
    credentials: {
      client_email: parsed.client_email,
      private_key: parsed.private_key?.replace(/\\n/g, "\n"),
    },
    projectId: parsed.project_id,
  });

  const property = `properties/${process.env.GA4_PROPERTY_ID}`;
  const dateRange = periodToDates(period);

  // Page-level engagement: PV / avg time / engagement rate / bounce rate.
  const [pagesResp] = await client.runReport({
    property,
    dateRanges: [dateRange],
    dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
    metrics: [
      { name: "screenPageViews" },
      { name: "averageSessionDuration" },
      { name: "engagementRate" },
      { name: "bounceRate" },
    ],
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit: 10,
  });
  const pages: PageAnalyticsPage[] = (pagesResp.rows ?? []).map((r) => ({
    url: r.dimensionValues?.[0]?.value ?? "",
    title: r.dimensionValues?.[1]?.value ?? "",
    pv: Number(r.metricValues?.[0]?.value ?? 0),
    avgSec: Math.round(Number(r.metricValues?.[1]?.value ?? 0)),
    engagementRate: Number(r.metricValues?.[2]?.value ?? 0),
    bounceRate: Number(r.metricValues?.[3]?.value ?? 0),
  }));

  // Site-wide engagement snapshot.
  const [engageResp] = await client.runReport({
    property,
    dateRanges: [dateRange],
    metrics: [
      { name: "engagementRate" },
      { name: "averageSessionDuration" },
      { name: "screenPageViewsPerSession" },
    ],
  });
  const engageRow = engageResp.rows?.[0];
  const engagement: EngagementMetrics = {
    engagementRate: Number(engageRow?.metricValues?.[0]?.value ?? 0),
    avgSessionSec: Math.round(Number(engageRow?.metricValues?.[1]?.value ?? 0)),
    pagesPerSession: Number(engageRow?.metricValues?.[2]?.value ?? 0),
  };

  // Device-category breakdown with locally derived share %.
  const [deviceResp] = await client.runReport({
    property,
    dateRanges: [dateRange],
    dimensions: [{ name: "deviceCategory" }],
    metrics: [{ name: "sessions" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 5,
  });
  const deviceTotal = (deviceResp.rows ?? []).reduce(
    (acc, r) => acc + Number(r.metricValues?.[0]?.value ?? 0),
    0,
  );
  const devices: DeviceShare[] = (deviceResp.rows ?? []).map((r) => {
    const sessions = Number(r.metricValues?.[0]?.value ?? 0);
    return {
      device: r.dimensionValues?.[0]?.value ?? "",
      sessions,
      pct: deviceTotal > 0 ? sessions / deviceTotal : 0,
    };
  });

  // Referral breakdown: source + medium.
  const [refResp] = await client.runReport({
    property,
    dateRanges: [dateRange],
    dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
    metrics: [{ name: "sessions" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 10,
  });
  const referrals: ReferralRow[] = (refResp.rows ?? []).map((r) => ({
    source: r.dimensionValues?.[0]?.value ?? "",
    medium: r.dimensionValues?.[1]?.value ?? "",
    sessions: Number(r.metricValues?.[0]?.value ?? 0),
  }));

  return {
    period,
    source: "ga4",
    generatedAt: new Date().toISOString(),
    pages,
    engagement,
    devices,
    referrals,
  };
}
