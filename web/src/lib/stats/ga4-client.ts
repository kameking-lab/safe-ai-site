import type { StatsPeriod, StatsResponse } from "./types";
import { buildMockStatsResponse } from "@/data/mock/stats-mock";

/**
 * GA4 Data API 呼び出しのラッパ。
 */
function isGa4Configured(): boolean {
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

export async function fetchStats(period: StatsPeriod): Promise<StatsResponse> {
        // 診断情報をレスポンスに直接埋め込む（一時的、原因特定後に削除）
  const debugInfo: Record<string, unknown> = {
            GA4_PROPERTY_ID_set: !!process.env.GA4_PROPERTY_ID,
            GA4_PROPERTY_ID_length: process.env.GA4_PROPERTY_ID?.length ?? 0,
            GOOGLE_APPLICATION_CREDENTIALS_JSON_set: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
            GOOGLE_APPLICATION_CREDENTIALS_JSON_length: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.length ?? 0,
            GOOGLE_APPLICATION_CREDENTIALS_set: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
            env_keys_GA4_GOOGLE: Object.keys(process.env)
              .filter(k => k.startsWith("GA4") || k.startsWith("GOOGLE"))
              .sort(),
            is_configured: isGa4Configured(),
            NODE_ENV: process.env.NODE_ENV,
            VERCEL_ENV: process.env.VERCEL_ENV,
  };

  if (!isGa4Configured()) {
            const mockResponse = buildMockStatsResponse(period);
            return { ...mockResponse, _debug: debugInfo } as StatsResponse & { _debug: typeof debugInfo };
  }

  try {
            const result = await fetchFromGa4(period);
            return { ...result, _debug: debugInfo } as StatsResponse & { _debug: typeof debugInfo };
  } catch (error) {
            console.error("[stats] GA4 fetch failed, falling back to mock:", error);

          // エラー詳細を完全展開（一時的、原因特定後に削除）
          const errorDetails: Record<string, unknown> = {};
            if (error && typeof error === "object") {
                        const err = error as Record<string, unknown>;
                        errorDetails.message = err.message;
                        errorDetails.code = err.code;
                        errorDetails.details = err.details;
                        errorDetails.statusCode = err.statusCode;
                        errorDetails.errorMessage = err.errorMessage;
                        errorDetails.reason = err.reason;
                        errorDetails.constructorName = (error as { constructor?: { name?: string } }).constructor?.name;
                        errorDetails.stringified = String(error);
                        if (err.metadata) {
                                      try {
                                                      errorDetails.metadata = JSON.stringify(err.metadata);
                                      } catch {
                                                      errorDetails.metadata = "unstringifiable";
                                      }
                        }
                        if (err.stack) {
                                      errorDetails.stack = String(err.stack).substring(0, 1500);
                        }
                        errorDetails.allKeys = Object.getOwnPropertyNames(err);
            } else {
                        errorDetails.raw = String(error);
                        errorDetails.type = typeof error;
            }

          const mockResponse = buildMockStatsResponse(period);
            return {
                        ...mockResponse,
                        _debug: {
                                      ...debugInfo,
                                      ga4_fetch_error_details: errorDetails,
                        },
            } as StatsResponse & { _debug: typeof debugInfo & { ga4_fetch_error_details: typeof errorDetails } };
  }
}

async function fetchFromGa4(period: StatsPeriod): Promise<StatsResponse> {
        const { BetaAnalyticsDataClient } = await import("@google-analytics/data");

  const credentials = (() => {
            const json = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
            if (!json) return undefined;
            try {
                        return JSON.parse(json);
            } catch {
                        return undefined;
            }
  })();

  const client = new BetaAnalyticsDataClient(
            credentials ? { credentials } : undefined
          );

  const property = `properties/${process.env.GA4_PROPERTY_ID}`;
        const dateRange = periodToDates(period);

  const [summaryResp] = await client.runReport({
            property,
            dateRanges: [dateRange],
            metrics: [
                  { name: "activeUsers" },
                  { name: "screenPageViews" },
                  { name: "averageSessionDuration" },
                  { name: "bounceRate" },
                      ],
  });
        const summaryRow = summaryResp.rows?.[0];
        const dau = Number(summaryRow?.metricValues?.[0]?.value ?? 0);
        const pv = Number(summaryRow?.metricValues?.[1]?.value ?? 0);
        const avgSessionSec = Number(summaryRow?.metricValues?.[2]?.value ?? 0);
        const bounceRate = Number(summaryRow?.metricValues?.[3]?.value ?? 0);

  const [mauResp] = await client.runReport({
            property,
            dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
            metrics: [{ name: "activeUsers" }],
  });
        const mau = Number(mauResp.rows?.[0]?.metricValues?.[0]?.value ?? 0);

  const [pagesResp] = await client.runReport({
            property,
            dateRanges: [dateRange],
            dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
            metrics: [{ name: "screenPageViews" }, { name: "averageSessionDuration" }],
            orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
            limit: 10,
  });
        const pages = (pagesResp.rows ?? []).map((r) => ({
                  url: r.dimensionValues?.[0]?.value ?? "",
                  title: r.dimensionValues?.[1]?.value ?? "",
                  pv: Number(r.metricValues?.[0]?.value ?? 0),
                  avgSec: Math.round(Number(r.metricValues?.[1]?.value ?? 0)),
        }));

  const [sourcesResp] = await client.runReport({
            property,
            dateRanges: [dateRange],
            dimensions: [{ name: "sessionSource" }],
            metrics: [{ name: "sessions" }],
            orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
            limit: 10,
  });
        const totalSessions = (sourcesResp.rows ?? []).reduce(
                  (acc, r) => acc + Number(r.metricValues?.[0]?.value ?? 0),
                  0
                );
        const sources = (sourcesResp.rows ?? []).map((r) => {
                  const sessions = Number(r.metricValues?.[0]?.value ?? 0);
                  return {
                              source: r.dimensionValues?.[0]?.value ?? "",
                              sessions,
                              pct: totalSessions > 0 ? sessions / totalSessions : 0,
                  };
        });

  const fallback = buildMockStatsResponse(period);

  return {
            period,
            source: "ga4",
            generatedAt: new Date().toISOString(),
            summary: {
                        dau,
                        mau,
                        pv,
                        avgSessionSec: Math.round(avgSessionSec),
                        bounceRate,
                        deltas: fallback.summary.deltas,
            },
            features: fallback.features,
            pages,
            sources,
            flow: fallback.flow,
            conversions: fallback.conversions,
            chatbot: fallback.chatbot,
            insights: fallback.insights,
  };
}
