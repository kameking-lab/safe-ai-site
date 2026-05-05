import type { StatsPeriod, StatsResponse } from "./types";
import { buildMockStatsResponse } from "@/data/mock/stats-mock";

/**
 * GA4 Data API 呼び出しのラッパ。
 *
 * 環境変数 (`GA4_PROPERTY_ID`, `GOOGLE_APPLICATION_CREDENTIALS_JSON` または
 * `GOOGLE_APPLICATION_CREDENTIALS`) が設定されていなければモック応答を返す。
 *
 * セットアップ手順（運用者向けメモ）:
 *  1. GA4 プロパティの「プロパティID」を `GA4_PROPERTY_ID` に設定
 *  2. サービスアカウント JSON を Vercel に
 *     - 文字列で `GOOGLE_APPLICATION_CREDENTIALS_JSON` として置く、または
 *     - ファイルパスで `GOOGLE_APPLICATION_CREDENTIALS` として置く
 *  3. GA4 プロパティの管理 → アクセス管理にサービスアカウントを「閲覧者」で追加
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
  if (!isGa4Configured()) {
    return buildMockStatsResponse(period);
  }

  try {
    return await fetchFromGa4(period);
  } catch (e) {
    console.error("[stats] GA4 fetch failed, falling back to mock", e);
    const fallback = buildMockStatsResponse(period);
    return { ...fallback, source: "mock" };
  }
}

async function fetchFromGa4(period: StatsPeriod): Promise<StatsResponse> {
  // 動的 import — GA4 が使われる場合だけロード（コールドスタート短縮）
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

  // Section 1: サマリ（DAU/MAU/PV/平均セッション時間/直帰率）
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

  // MAU は activeUsers の範囲を 30 日固定で取る
  const [mauResp] = await client.runReport({
    property,
    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
    metrics: [{ name: "activeUsers" }],
  });
  const mau = Number(mauResp.rows?.[0]?.metricValues?.[0]?.value ?? 0);

  // Section 3: ページ別 TOP 10
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

  // Section 4: 流入元
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

  // 不足分はモックを骨格に補完（GA4 で未取得の Flow/Conversion/Chatbot/Insight）
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
      deltas: fallback.summary.deltas, // GA4 だけでは前期間比が取れないためモック値
    },
    features: fallback.features, // ページ別から推定するロジックは将来拡張
    pages,
    sources,
    flow: fallback.flow,
    conversions: fallback.conversions,
    chatbot: fallback.chatbot,
    insights: fallback.insights,
  };
}
