#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const PRODUCTION_ORIGIN = "https://www.anzen-ai-portal.jp";
const SITEMAP_URL = `${PRODUCTION_ORIGIN}/sitemap-index.xml`;
const PROPERTY_CANDIDATES = new Set([
  "sc-domain:anzen-ai-portal.jp",
  `${PRODUCTION_ORIGIN}/`,
  "https://anzen-ai-portal.jp/",
]);
const PRIORITY_PATHS = [
  "/",
  "/safety-ai",
  "/services/automation",
  "/chemical-ra",
  "/guides/chemical-ra-create-simple",
  "/ky/paper",
  "/guides/ky-sheet",
  "/guides/safety-signage",
  "/guides/anzeneho-ai-chatbot",
  "/law-search",
  "/accident-news",
];
const HOLD_PATHS = [
  "/heat-illness-prevention",
  "/heat-illness-prevention/slides",
  "/heat-illness-prevention/elearning",
];
const QUERY_CLUSTERS = [
  "安全AI",
  "安全AIポータル",
  "労働安全AI",
  "安全管理AI",
  "化学物質リスクアセスメント",
  "化学物質リスクアセスメント 無料",
  "KY用紙",
  "KY用紙 無料",
  "安全サイネージ",
  "安衛法 チャットボット",
  "安衛法 AI",
  "業務自動化 相談",
  "AI研修",
  "講習会 資料作成",
];

const argv = process.argv.slice(2);
const hasFlag = (name) => argv.includes(name);
const option = (name, fallback) => {
  const prefix = `${name}=`;
  return argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
};
const outputPath = resolve(
  option(
    "--output",
    "../docs/audits/evidence/post-launch-growth-operations-2026-07-29/search-console-production-operations.json",
  ),
);
const submitSitemap = hasFlag("--submit-sitemap");
const inspectUrls = hasFlag("--inspect-urls");

function isoDate(daysAgo) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

const dateRange = {
  startDate: isoDate(28),
  endDate: isoDate(1),
};

function productionUrl(pathname) {
  const url = new URL(pathname, PRODUCTION_ORIGIN);
  if (url.origin !== PRODUCTION_ORIGIN || url.search || url.hash) {
    throw new Error("non-production target rejected");
  }
  return url.toString();
}

function metricRow(row, dimensionName, fallbackValue) {
  return {
    [dimensionName]: row?.keys?.[0] ?? fallbackValue,
    impressions: row?.impressions ?? 0,
    clicks: row?.clicks ?? 0,
    ctr: row?.ctr ?? 0,
    averagePosition: row?.position ?? 0,
  };
}

async function refreshAccessToken() {
  const clientId = process.env.GSC_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GSC_OAUTH_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GSC_OAUTH_REFRESH_TOKEN?.trim();
  if (!clientId || !clientSecret || !refreshToken) {
    throw Object.assign(new Error("credentials_missing"), {
      stage: "oauth",
      status: null,
    });
  }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw Object.assign(new Error("oauth_refresh_failed"), {
      stage: "oauth",
      status: response.status,
    });
  }
  const payload = await response.json();
  if (typeof payload.access_token !== "string" || !payload.access_token) {
    throw Object.assign(new Error("oauth_token_missing"), {
      stage: "oauth",
      status: response.status,
    });
  }
  return payload.access_token;
}

async function googleJson(accessToken, url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw Object.assign(new Error("google_api_failed"), {
      stage: init.stage ?? "google-api",
      status: response.status,
    });
  }
  if (response.status === 204) return {};
  return response.json();
}

async function analyticsQuery(accessToken, property, dimensions, filter) {
  const encodedProperty = encodeURIComponent(property);
  const payload = {
    ...dateRange,
    dimensions,
    rowLimit: filter ? 10 : 25,
    dataState: "final",
    ...(filter
      ? {
          dimensionFilterGroups: [
            {
              filters: [
                {
                  dimension: filter.dimension,
                  operator: "equals",
                  expression: filter.expression,
                },
              ],
            },
          ],
        }
      : {}),
  };
  return googleJson(
    accessToken,
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodedProperty}/searchAnalytics/query`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      stage: "search-analytics",
    },
  );
}

function safeFailure(error) {
  return {
    code:
      error instanceof Error && /^[a-z0-9_-]{1,80}$/i.test(error.message)
        ? error.message
        : "external_operation_failed",
    stage:
      typeof error?.stage === "string" && /^[a-z0-9_-]{1,80}$/i.test(error.stage)
        ? error.stage
        : "unknown",
    httpStatus: Number.isInteger(error?.status) ? error.status : null,
  };
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  productionOrigin: PRODUCTION_ORIGIN,
  previewTargetsSubmitted: 0,
  holdUrlsInspected: 0,
  dateRange,
  access: "blocked-external",
  property: null,
  permissionLevel: null,
  sitemap: {
    url: SITEMAP_URL,
    publicHttpStatus: null,
    previouslySubmitted: false,
    submissionRequested: submitSitemap,
    submissionResult: "not-attempted",
    lastSubmitted: null,
    lastDownloaded: null,
    warnings: null,
    errors: null,
  },
  performance: {
    summary: null,
    queries: [],
    pages: [],
    countries: [],
    devices: [],
  },
  urlInspection: {
    requested: inspectUrls,
    indexRequestApiAvailable: false,
    results: [],
  },
  coreWebVitals: {
    source: "not-available-from-search-console-api",
    status: "blocked-external-ui-or-crux-access-required",
  },
  failure: null,
};

try {
  const publicSitemap = await fetch(SITEMAP_URL, {
    method: "GET",
    redirect: "manual",
    cache: "no-store",
  });
  report.sitemap.publicHttpStatus = publicSitemap.status;

  const accessToken = await refreshAccessToken();
  const sites = await googleJson(
    accessToken,
    "https://searchconsole.googleapis.com/webmasters/v3/sites",
    { stage: "site-list" },
  );
  const accessibleProductionSites = (sites.siteEntry ?? []).filter(
    (entry) =>
      PROPERTY_CANDIDATES.has(entry.siteUrl) &&
      typeof entry.permissionLevel === "string" &&
      entry.permissionLevel !== "siteUnverifiedUser",
  );
  const preferredConfigured = process.env.GSC_SITE_URL?.trim();
  const selected =
    accessibleProductionSites.find((entry) => entry.siteUrl === preferredConfigured) ??
    accessibleProductionSites.find((entry) => entry.siteUrl === "sc-domain:anzen-ai-portal.jp") ??
    accessibleProductionSites[0];
  if (!selected) {
    throw Object.assign(new Error("production_property_unavailable"), {
      stage: "property-access",
      status: null,
    });
  }

  report.access = "ready";
  report.property = selected.siteUrl;
  report.permissionLevel = selected.permissionLevel;
  const encodedProperty = encodeURIComponent(selected.siteUrl);
  const sitemapList = await googleJson(
    accessToken,
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodedProperty}/sitemaps`,
    { stage: "sitemap-list" },
  );
  const currentSitemap = (sitemapList.sitemap ?? []).find(
    (entry) => entry.path === SITEMAP_URL,
  );
  report.sitemap.previouslySubmitted = Boolean(currentSitemap);
  if (currentSitemap) {
    report.sitemap.lastSubmitted = currentSitemap.lastSubmitted ?? null;
    report.sitemap.lastDownloaded = currentSitemap.lastDownloaded ?? null;
    report.sitemap.warnings = Number(currentSitemap.warnings ?? 0);
    report.sitemap.errors = Number(currentSitemap.errors ?? 0);
  }

  if (!currentSitemap && submitSitemap) {
    try {
      await googleJson(
        accessToken,
        `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodedProperty}/sitemaps/${encodeURIComponent(SITEMAP_URL)}`,
        { method: "PUT", stage: "sitemap-submit" },
      );
      report.sitemap.submissionResult = "submitted";
    } catch (error) {
      report.sitemap.submissionResult = "blocked-external";
      report.sitemap.submissionFailure = safeFailure(error);
    }
  } else {
    report.sitemap.submissionResult = currentSitemap
      ? "already-submitted"
      : "not-requested";
  }

  const summary = await analyticsQuery(accessToken, selected.siteUrl, [], null);
  report.performance.summary = metricRow(summary.rows?.[0], "scope", "all");

  for (const query of QUERY_CLUSTERS) {
    const response = await analyticsQuery(accessToken, selected.siteUrl, ["query"], {
      dimension: "query",
      expression: query,
    });
    report.performance.queries.push(metricRow(response.rows?.[0], "query", query));
  }
  for (const pathname of PRIORITY_PATHS) {
    const page = productionUrl(pathname);
    const response = await analyticsQuery(accessToken, selected.siteUrl, ["page"], {
      dimension: "page",
      expression: page,
    });
    report.performance.pages.push(metricRow(response.rows?.[0], "page", page));
  }
  for (const dimension of ["country", "device"]) {
    const response = await analyticsQuery(accessToken, selected.siteUrl, [dimension], null);
    report.performance[dimension === "country" ? "countries" : "devices"] = (
      response.rows ?? []
    ).map((row) => metricRow(row, dimension, "unknown"));
  }

  if (inspectUrls) {
    for (const pathname of PRIORITY_PATHS) {
      const target = productionUrl(pathname);
      try {
        const response = await googleJson(
          accessToken,
          "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
          {
            method: "POST",
            body: JSON.stringify({
              inspectionUrl: target,
              siteUrl: selected.siteUrl,
              languageCode: "ja-JP",
            }),
            stage: "url-inspection",
          },
        );
        const index = response.inspectionResult?.indexStatusResult ?? {};
        report.urlInspection.results.push({
          url: target,
          verdict: index.verdict ?? "unknown",
          coverageState: index.coverageState ?? "unknown",
          indexingState: index.indexingState ?? "unknown",
          pageFetchState: index.pageFetchState ?? "unknown",
          robotsTxtState: index.robotsTxtState ?? "unknown",
          lastCrawlTime: index.lastCrawlTime ?? null,
        });
      } catch (error) {
        report.urlInspection.results.push({
          url: target,
          status: "blocked-external",
          failure: safeFailure(error),
        });
      }
    }
  }
} catch (error) {
  report.failure = safeFailure(error);
}

for (const heldPath of HOLD_PATHS) {
  if (report.urlInspection.results.some((entry) => entry.url === productionUrl(heldPath))) {
    throw new Error("heat hold URL inspection boundary violated");
  }
}

mkdirSync(dirname(outputPath), { recursive: true });
const encoded = `${JSON.stringify(report, null, 2)}\n`;
writeFileSync(outputPath, encoded, "utf8");
writeFileSync(
  resolve(dirname(outputPath), "search-console-priority-urls.csv"),
  `priority,url,action,heat_hold\n${PRIORITY_PATHS.map(
    (path, index) =>
      `${index < 3 ? "P0" : "P1"},${productionUrl(path)},inspect,false`,
  ).join("\n")}\n${HOLD_PATHS.map(
    (path) => `HOLD,${productionUrl(path)},do-not-inspect,true`,
  ).join("\n")}\n`,
  "utf8",
);
writeFileSync(
  resolve(dirname(outputPath), "search-console-query-clusters.csv"),
  `query,date_start,date_end\n${QUERY_CLUSTERS.map(
    (query) => `"${query.replaceAll('"', '""')}",${dateRange.startDate},${dateRange.endDate}`,
  ).join("\n")}\n`,
  "utf8",
);

process.stdout.write(
  `${JSON.stringify({
    ok: report.access === "ready",
    access: report.access,
    sitemap: report.sitemap.submissionResult,
    inspectedProductionUrls: report.urlInspection.results.length,
    inspectedHeatUrls: 0,
    outputPath,
    sha256: createHash("sha256").update(encoded).digest("hex"),
    environmentValuesIncluded: false,
  })}\n`,
);
