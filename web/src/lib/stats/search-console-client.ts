import { buildMockSearchConsoleResponse } from "@/data/mock/search-console-mock";
import type {
  SearchConsoleCountryRow,
  SearchConsoleDeviceRow,
  SearchConsolePageRow,
  SearchConsoleQueryRow,
  SearchConsoleResponse,
  StatsPeriod,
} from "./types";

/**
 * Google Search Console wrapper used by /api/search-console.
 *
 * Auth strategy: user OAuth with a long-lived refresh token.
 *
 * Why not the service account that GA4 uses: Google rejects service-account
 * email addresses in the GSC "Add user" flow for personal Gmail-owned
 * properties, and Workspace-only workarounds (Group, Domain-wide Delegation)
 * are unavailable. The owner therefore authorises a user-OAuth client once
 * via scripts/etl/gsc-oauth-init.mjs and the refresh token is stored as a
 * Vercel env var.
 *
 * Required env vars (all three must be set):
 *   GSC_OAUTH_CLIENT_ID
 *   GSC_OAUTH_CLIENT_SECRET
 *   GSC_OAUTH_REFRESH_TOKEN
 *
 * Optional:
 *   GSC_SITE_URL  — property identifier; defaults to NEXT_PUBLIC_SITE_URL or
 *                   https://www.anzen-ai-portal.jp/. The OAuth user must own
 *                   this property in Search Console.
 *
 * When any required var is missing or the live call fails we fall back to
 * mock data so the dashboard keeps rendering. See docs/gsc-oauth-setup.md.
 */

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

function isConfigured(): boolean {
  return Boolean(
    process.env.GSC_OAUTH_CLIENT_ID &&
      process.env.GSC_OAUTH_CLIENT_SECRET &&
      process.env.GSC_OAUTH_REFRESH_TOKEN,
  );
}

function resolveSiteUrl(): string {
  const explicit = process.env.GSC_SITE_URL;
  if (explicit && explicit.trim().length > 0) return explicit.trim();
  const publicUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (publicUrl && publicUrl.trim().length > 0) {
    const v = publicUrl.trim();
    return v.endsWith("/") ? v : `${v}/`;
  }
  return "https://www.anzen-ai-portal.jp/";
}

function periodDates(period: StatsPeriod): { startDate: string; endDate: string } {
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const end = new Date();
  const start = new Date();
  start.setUTCDate(end.getUTCDate() - days);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.GSC_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GSC_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GSC_OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("OAuth credentials are missing");
  }
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GSC token refresh ${res.status}: ${text.slice(0, 240)}`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("token response missing access_token");
  return json.access_token;
}

type QueryDimension = "query" | "page" | "country" | "device";

type SearchAnalyticsRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

async function runSearchAnalytics(params: {
  siteUrl: string;
  accessToken: string;
  startDate: string;
  endDate: string;
  dimensions: QueryDimension[];
  rowLimit: number;
}): Promise<SearchAnalyticsRow[]> {
  const { siteUrl, accessToken, startDate, endDate, dimensions, rowLimit } = params;
  const encodedSite = encodeURIComponent(siteUrl);
  const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions,
      rowLimit,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GSC ${res.status}: ${body.slice(0, 240)}`);
  }
  const json = (await res.json()) as { rows?: SearchAnalyticsRow[] };
  return json.rows ?? [];
}

function rowToQuery(r: SearchAnalyticsRow): SearchConsoleQueryRow {
  return {
    query: r.keys?.[0] ?? "",
    impressions: r.impressions ?? 0,
    clicks: r.clicks ?? 0,
    ctr: r.ctr ?? 0,
    position: r.position ?? 0,
  };
}

function rowToPage(r: SearchAnalyticsRow): SearchConsolePageRow {
  return {
    page: r.keys?.[0] ?? "",
    impressions: r.impressions ?? 0,
    clicks: r.clicks ?? 0,
    ctr: r.ctr ?? 0,
    position: r.position ?? 0,
  };
}

function rowToCountry(r: SearchAnalyticsRow): SearchConsoleCountryRow {
  return {
    country: r.keys?.[0] ?? "",
    impressions: r.impressions ?? 0,
    clicks: r.clicks ?? 0,
  };
}

function rowToDevice(r: SearchAnalyticsRow): SearchConsoleDeviceRow {
  return {
    device: r.keys?.[0] ?? "",
    impressions: r.impressions ?? 0,
    clicks: r.clicks ?? 0,
  };
}

export async function fetchSearchConsole(
  period: StatsPeriod,
): Promise<SearchConsoleResponse> {
  if (!isConfigured()) {
    return buildMockSearchConsoleResponse(period, "credentials missing");
  }

  const siteUrl = resolveSiteUrl();
  const { startDate, endDate } = periodDates(period);

  try {
    const accessToken = await getAccessToken();

    const [summaryRows, queryRows, pageRows, countryRows, deviceRows] = await Promise.all([
      runSearchAnalytics({ siteUrl, accessToken, startDate, endDate, dimensions: [], rowLimit: 1 }),
      runSearchAnalytics({ siteUrl, accessToken, startDate, endDate, dimensions: ["query"], rowLimit: 30 }),
      runSearchAnalytics({ siteUrl, accessToken, startDate, endDate, dimensions: ["page"], rowLimit: 30 }),
      runSearchAnalytics({ siteUrl, accessToken, startDate, endDate, dimensions: ["country"], rowLimit: 10 }),
      runSearchAnalytics({ siteUrl, accessToken, startDate, endDate, dimensions: ["device"], rowLimit: 5 }),
    ]);

    const summaryRow = summaryRows[0];

    return {
      period,
      source: "gsc",
      generatedAt: new Date().toISOString(),
      siteUrl,
      summary: {
        impressions: summaryRow?.impressions ?? 0,
        clicks: summaryRow?.clicks ?? 0,
        ctr: summaryRow?.ctr ?? 0,
        position: summaryRow?.position ?? 0,
      },
      queries: queryRows.map(rowToQuery),
      pages: pageRows.map(rowToPage),
      countries: countryRows.map(rowToCountry),
      devices: deviceRows.map(rowToDevice),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[search-console] live fetch failed, falling back to mock:", message);
    return buildMockSearchConsoleResponse(period, message);
  }
}
