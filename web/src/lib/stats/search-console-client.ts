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
 * Auth strategy mirrors the GA4 client (web/src/lib/stats/ga4-client.ts):
 *  - The service-account JSON sits in GOOGLE_APPLICATION_CREDENTIALS_JSON.
 *  - private_key has its \n escapes restored before JWT signing.
 *  - When credentials are missing or unauthorized we fall back to mock data
 *    so the dashboard keeps rendering instead of erroring out.
 *
 * Operator setup checklist:
 *  1. In Search Console, add the service-account e-mail
 *     (parsedCredentials.client_email) as a "Restricted user" on the property.
 *  2. Optionally set GSC_SITE_URL to the exact property identifier
 *     (https://www.anzen-ai-portal.jp/ or sc-domain:anzen-ai-portal.jp).
 *     Defaults to NEXT_PUBLIC_SITE_URL otherwise.
 */

type Credentials = {
  client_email?: string;
  private_key?: string;
  project_id?: string;
};

function isConfigured(): boolean {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) return false;
  return true;
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

function parseCredentials(): Credentials {
  try {
    const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || "{}";
    const parsed = JSON.parse(raw) as Credentials;
    if (parsed.private_key) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return parsed;
  } catch (e) {
    console.error("[search-console] credentials JSON parse failed", e);
    return {};
  }
}

async function getAccessToken(): Promise<string> {
  const credentials = parseCredentials();
  if (!credentials.client_email || !credentials.private_key) {
    throw new Error("service account credentials are missing");
  }
  const { JWT } = await import("google-auth-library");
  const jwt = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  const { access_token } = await jwt.authorize();
  if (!access_token) throw new Error("failed to obtain access token");
  return access_token;
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
