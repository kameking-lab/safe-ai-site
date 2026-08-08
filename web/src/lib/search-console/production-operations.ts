import "server-only";

import { createSign } from "node:crypto";

const PRODUCTION_ORIGIN = "https://www.anzen-ai-portal.jp";
const SITEMAP_URL = `${PRODUCTION_ORIGIN}/sitemap-index.xml`;
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const SITE_LIST_ENDPOINT =
  "https://searchconsole.googleapis.com/webmasters/v3/sites";
const READONLY_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const WRITE_SCOPE = "https://www.googleapis.com/auth/webmasters";
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
] as const;
const HOLD_PATHS = [
  "/heat-illness-prevention",
  "/heat-illness-prevention/slides",
  "/heat-illness-prevention/elearning",
] as const;
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
] as const;

type CredentialResult = {
  source: string;
  configured: boolean;
  parsed?: boolean;
  tokenAcquired: boolean;
  apiAccess: boolean;
  productionPropertyAccess: boolean;
  status:
    | "active"
    | "missing-credential"
    | "invalid-credential"
    | "blocked-external"
    | "not-applicable";
  httpStatus?: number | null;
  oauthError?: string;
  errorClass?: string;
};

type SiteEntry = {
  siteUrl?: string;
  permissionLevel?: string;
};

type CredentialAccess = {
  result: CredentialResult;
  accessToken: string | null;
  property: SiteEntry | null;
};

type SafeFailure = {
  code: string;
  stage: string;
  httpStatus: number | null;
};

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function parseCredentialJson(raw: string | undefined) {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function safeCode(value: unknown, fallback = "unknown"): string {
  return typeof value === "string" && /^[a-z0-9_-]{1,80}$/i.test(value)
    ? value
    : fallback;
}

function safeFailure(error: unknown): SafeFailure {
  const candidate = error as {
    message?: unknown;
    stage?: unknown;
    status?: unknown;
  };
  return {
    code: safeCode(candidate?.message, "external_operation_failed"),
    stage: safeCode(candidate?.stage, "unknown"),
    httpStatus: Number.isInteger(candidate?.status)
      ? Number(candidate.status)
      : null,
  };
}

function productionUrl(pathname: (typeof PRIORITY_PATHS)[number]) {
  return new URL(pathname, PRODUCTION_ORIGIN).toString();
}

function dateDaysAgo(days: number): string {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

async function providerJson(
  accessToken: string,
  url: string,
  init: RequestInit & { stage?: string } = {},
) {
  const { stage = "google-api", ...requestInit } = init;
  const response = await fetch(url, {
    ...requestInit,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(requestInit.body ? { "Content-Type": "application/json" } : {}),
      ...(requestInit.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw Object.assign(new Error("google_api_failed"), {
      stage,
      status: response.status,
    });
  }
  if (response.status === 204) return {};
  return response.json();
}

async function listProductionProperty(accessToken: string) {
  const response = await fetch(SITE_LIST_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    return {
      apiAccess: false,
      httpStatus: response.status,
      property: null,
    };
  }
  const payload = (await response.json()) as { siteEntry?: SiteEntry[] };
  const property =
    (payload.siteEntry ?? []).find(
      (entry) =>
        PROPERTY_CANDIDATES.has(entry.siteUrl ?? "") &&
        typeof entry.permissionLevel === "string" &&
        entry.permissionLevel !== "siteUnverifiedUser",
    ) ?? null;
  return { apiAccess: true, httpStatus: response.status, property };
}

async function probeServiceAccount(
  envName: string,
  scope: string,
): Promise<CredentialAccess> {
  const raw = process.env[envName];
  if (!raw?.trim()) {
    return {
      result: {
        source: envName,
        configured: false,
        parsed: false,
        tokenAcquired: false,
        apiAccess: false,
        productionPropertyAccess: false,
        status: "missing-credential",
      },
      accessToken: null,
      property: null,
    };
  }
  const credentials = parseCredentialJson(raw);
  const clientEmail = credentials?.client_email;
  const privateKey = credentials?.private_key;
  if (
    credentials?.type !== "service_account" ||
    typeof clientEmail !== "string" ||
    typeof privateKey !== "string"
  ) {
    return {
      result: {
        source: envName,
        configured: true,
        parsed: false,
        tokenAcquired: false,
        apiAccess: false,
        productionPropertyAccess: false,
        status: "invalid-credential",
      },
      accessToken: null,
      property: null,
    };
  }

  try {
    const issuedAt = Math.floor(Date.now() / 1_000);
    const encodedHeader = base64Url(
      JSON.stringify({ alg: "RS256", typ: "JWT" }),
    );
    const encodedClaim = base64Url(
      JSON.stringify({
        iss: clientEmail,
        scope,
        aud: TOKEN_ENDPOINT,
        iat: issuedAt,
        exp: issuedAt + 3_600,
      }),
    );
    const signingInput = `${encodedHeader}.${encodedClaim}`;
    const signer = createSign("RSA-SHA256");
    signer.update(signingInput);
    signer.end();
    const signature = signer
      .sign(privateKey.replace(/\\n/g, "\n"))
      .toString("base64url");
    const tokenResponse = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${signingInput}.${signature}`,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const tokenPayload = (await tokenResponse.json().catch(() => ({}))) as {
      access_token?: unknown;
      error?: unknown;
    };
    if (
      !tokenResponse.ok ||
      typeof tokenPayload.access_token !== "string" ||
      !tokenPayload.access_token
    ) {
      return {
        result: {
          source: envName,
          configured: true,
          parsed: true,
          tokenAcquired: false,
          apiAccess: false,
          productionPropertyAccess: false,
          httpStatus: tokenResponse.status,
          oauthError: safeCode(tokenPayload.error),
          status: "invalid-credential",
        },
        accessToken: null,
        property: null,
      };
    }
    const listed = await listProductionProperty(tokenPayload.access_token);
    return {
      result: {
        source: envName,
        configured: true,
        parsed: true,
        tokenAcquired: true,
        apiAccess: listed.apiAccess,
        productionPropertyAccess: Boolean(listed.property),
        httpStatus: listed.httpStatus,
        status: listed.property
          ? "active"
          : listed.apiAccess
            ? "blocked-external"
            : "invalid-credential",
      },
      accessToken: tokenPayload.access_token,
      property: listed.property,
    };
  } catch (error) {
    return {
      result: {
        source: envName,
        configured: true,
        parsed: true,
        tokenAcquired: false,
        apiAccess: false,
        productionPropertyAccess: false,
        errorClass:
          error && (error as { constructor?: { name?: string } }).constructor
            ? safeCode(
                (error as { constructor: { name?: string } }).constructor.name,
              )
            : "unknown",
        status: "invalid-credential",
      },
      accessToken: null,
      property: null,
    };
  }
}

async function probeOAuth(): Promise<CredentialAccess> {
  const clientId = process.env.GSC_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GSC_OAUTH_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GSC_OAUTH_REFRESH_TOKEN?.trim();
  if (!clientId || !clientSecret || !refreshToken) {
    return {
      result: {
        source: "oauth-refresh-token",
        configured: false,
        tokenAcquired: false,
        apiAccess: false,
        productionPropertyAccess: false,
        status: "missing-credential",
      },
      accessToken: null,
      property: null,
    };
  }
  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      access_token?: unknown;
      error?: unknown;
    };
    if (
      !response.ok ||
      typeof payload.access_token !== "string" ||
      !payload.access_token
    ) {
      return {
        result: {
          source: "oauth-refresh-token",
          configured: true,
          tokenAcquired: false,
          apiAccess: false,
          productionPropertyAccess: false,
          httpStatus: response.status,
          oauthError: safeCode(payload.error),
          status: "invalid-credential",
        },
        accessToken: null,
        property: null,
      };
    }
    const listed = await listProductionProperty(payload.access_token);
    return {
      result: {
        source: "oauth-refresh-token",
        configured: true,
        tokenAcquired: true,
        apiAccess: listed.apiAccess,
        productionPropertyAccess: Boolean(listed.property),
        httpStatus: listed.httpStatus,
        status: listed.property
          ? "active"
          : listed.apiAccess
            ? "blocked-external"
            : "invalid-credential",
      },
      accessToken: payload.access_token,
      property: listed.property,
    };
  } catch (error) {
    return {
      result: {
        source: "oauth-refresh-token",
        configured: true,
        tokenAcquired: false,
        apiAccess: false,
        productionPropertyAccess: false,
        errorClass:
          error && (error as { constructor?: { name?: string } }).constructor
            ? safeCode(
                (error as { constructor: { name?: string } }).constructor.name,
              )
            : "unknown",
        status: "invalid-credential",
      },
      accessToken: null,
      property: null,
    };
  }
}

async function resolveCredential(allowMutations: boolean) {
  const scope = allowMutations ? WRITE_SCOPE : READONLY_SCOPE;
  const serviceAccounts: CredentialResult[] = [];
  let selected: CredentialAccess | null = null;

  for (const envName of [
    "GA4_SERVICE_ACCOUNT_JSON",
    "GOOGLE_APPLICATION_CREDENTIALS_JSON",
  ]) {
    if (selected) {
      serviceAccounts.push({
        source: envName,
        configured: Boolean(process.env[envName]?.trim()),
        tokenAcquired: false,
        apiAccess: false,
        productionPropertyAccess: false,
        status: "not-applicable",
      });
      continue;
    }
    const result = await probeServiceAccount(envName, scope);
    serviceAccounts.push(result.result);
    if (result.property && result.accessToken) selected = result;
  }

  let oauth: CredentialResult;
  if (selected) {
    oauth = {
      source: "oauth-refresh-token",
      configured: Boolean(
        process.env.GSC_OAUTH_CLIENT_ID?.trim() &&
          process.env.GSC_OAUTH_CLIENT_SECRET?.trim() &&
          process.env.GSC_OAUTH_REFRESH_TOKEN?.trim(),
      ),
      tokenAcquired: false,
      apiAccess: false,
      productionPropertyAccess: false,
      status: "not-applicable",
    };
  } else {
    const oauthResult = await probeOAuth();
    oauth = oauthResult.result;
    if (oauthResult.property && oauthResult.accessToken) selected = oauthResult;
  }

  return { serviceAccounts, oauth, selected };
}

function metricRow(
  row: {
    keys?: string[];
    impressions?: number;
    clicks?: number;
    ctr?: number;
    position?: number;
  } | undefined,
  key: string,
  value: string,
) {
  return {
    [key]: row?.keys?.[0] ?? value,
    impressions: Number(row?.impressions ?? 0),
    clicks: Number(row?.clicks ?? 0),
    ctr: Number(row?.ctr ?? 0),
    averagePosition: Number(row?.position ?? 0),
  };
}

async function searchAnalytics(
  accessToken: string,
  property: string,
  dimensions: string[],
  filter?: { dimension: string; expression: string },
) {
  return providerJson(
    accessToken,
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`,
    {
      method: "POST",
      body: JSON.stringify({
        startDate: dateDaysAgo(28),
        endDate: dateDaysAgo(1),
        dimensions,
        rowLimit: filter ? 1 : 10,
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
      }),
      stage: "search-analytics",
    },
  ) as Promise<{
    rows?: Array<{
      keys?: string[];
      impressions?: number;
      clicks?: number;
      ctr?: number;
      position?: number;
    }>;
  }>;
}

async function queryCrux() {
  const apiKey = process.env.PSI_API_KEY?.trim();
  if (!apiKey) return { status: "missing-credential", metrics: {} };
  try {
    const response = await fetch(
      `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin: PRODUCTION_ORIGIN }),
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (response.status === 404) {
      return { status: "configured-no-data", metrics: {} };
    }
    if (!response.ok) {
      return { status: "blocked-external", httpStatus: response.status, metrics: {} };
    }
    const payload = (await response.json()) as {
      record?: {
        metrics?: Record<
          string,
          {
            percentiles?: { p75?: unknown };
            histogram?: Array<{ density?: unknown }>;
          }
        >;
      };
    };
    const metrics = Object.fromEntries(
      Object.entries(payload.record?.metrics ?? {}).map(([name, value]) => [
        name,
        {
          p75:
            typeof value.percentiles?.p75 === "number" ||
            typeof value.percentiles?.p75 === "string"
              ? value.percentiles.p75
              : null,
          histogramDensities: (value.histogram ?? []).map((bucket) =>
            typeof bucket.density === "number" ? bucket.density : null,
          ),
        },
      ]),
    );
    return { status: "active", metrics };
  } catch {
    return { status: "blocked-external", metrics: {} };
  }
}

export async function runProductionSearchConsoleOperations(options: {
  allowMutations: boolean;
  inspectUrls: boolean;
}) {
  const credential = await resolveCredential(options.allowMutations);
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    productionOrigin: PRODUCTION_ORIGIN,
    access: "blocked-external",
    credential: {
      serviceAccounts: credential.serviceAccounts,
      oauth: credential.oauth,
      tokensIncluded: false,
      accountAddressesIncluded: false,
      credentialValuesIncluded: false,
    },
    property: null as string | null,
    permissionLevel: null as string | null,
    requiredExternalAction: null as string | null,
    sitemap: {
      url: SITEMAP_URL,
      publicHttpStatus: null as number | null,
      previouslySubmitted: false,
      submissionResult: "not-attempted",
      lastSubmitted: null as string | null,
      lastDownloaded: null as string | null,
      warnings: null as number | null,
      errors: null as number | null,
    },
    performance: {
      dateRange: {
        startDate: dateDaysAgo(28),
        endDate: dateDaysAgo(1),
      },
      summary: null as ReturnType<typeof metricRow> | null,
      queryClusters: [] as Array<ReturnType<typeof metricRow>>,
      priorityPages: [] as Array<ReturnType<typeof metricRow>>,
      countries: [] as Array<ReturnType<typeof metricRow>>,
      devices: [] as Array<ReturnType<typeof metricRow>>,
    },
    urlInspection: {
      requested: options.inspectUrls,
      productionUrls: PRIORITY_PATHS.length,
      previewUrls: 0,
      heatHoldUrls: 0,
      results: [] as Array<Record<string, unknown>>,
    },
    coreWebVitals: { status: "not-attempted", metrics: {} as Record<string, unknown> },
    failure: null as SafeFailure | null,
  };

  try {
    const publicSitemap = await fetch(SITEMAP_URL, {
      method: "HEAD",
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    report.sitemap.publicHttpStatus = publicSitemap.status;
  } catch {
    report.sitemap.publicHttpStatus = null;
  }

  const selected = credential.selected;
  if (!selected?.accessToken || !selected.property?.siteUrl) {
    const validButUnshared = [
      ...credential.serviceAccounts,
      credential.oauth,
    ].some(
      (item) => item.tokenAcquired && item.apiAccess && !item.productionPropertyAccess,
    );
    report.requiredExternalAction = validButUnshared
      ? "grant-existing-credential-access-to-existing-production-property"
      : "reauthorize-existing-search-console-credential-once";
    return report;
  }

  const accessToken = selected.accessToken;
  const property = selected.property.siteUrl;
  report.access = "active";
  report.property = property;
  report.permissionLevel = selected.property.permissionLevel ?? null;
  report.requiredExternalAction = null;

  try {
    const encodedProperty = encodeURIComponent(property);
    const sitemapList = (await providerJson(
      accessToken,
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodedProperty}/sitemaps`,
      { stage: "sitemap-list" },
    )) as {
      sitemap?: Array<{
        path?: string;
        lastSubmitted?: string;
        lastDownloaded?: string;
        warnings?: string | number;
        errors?: string | number;
      }>;
    };
    const current = (sitemapList.sitemap ?? []).find(
      (entry) => entry.path === SITEMAP_URL,
    );
    report.sitemap.previouslySubmitted = Boolean(current);
    if (current) {
      report.sitemap.lastSubmitted = current.lastSubmitted ?? null;
      report.sitemap.lastDownloaded = current.lastDownloaded ?? null;
      report.sitemap.warnings = Number(current.warnings ?? 0);
      report.sitemap.errors = Number(current.errors ?? 0);
      report.sitemap.submissionResult = "already-submitted";
    } else if (options.allowMutations) {
      try {
        await providerJson(
          accessToken,
          `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodedProperty}/sitemaps/${encodeURIComponent(SITEMAP_URL)}`,
          { method: "PUT", stage: "sitemap-submit" },
        );
        report.sitemap.submissionResult = "submitted";
      } catch (error) {
        report.sitemap.submissionResult = "blocked-external";
        report.failure = safeFailure(error);
      }
    } else {
      report.sitemap.submissionResult = "ready-for-manual-verification";
    }

    const summary = await searchAnalytics(accessToken, property, []);
    report.performance.summary = metricRow(summary.rows?.[0], "scope", "all");
    report.performance.queryClusters = await Promise.all(
      QUERY_CLUSTERS.map(async (query) => {
        const response = await searchAnalytics(accessToken, property, ["query"], {
          dimension: "query",
          expression: query,
        });
        return metricRow(response.rows?.[0], "query", query);
      }),
    );
    report.performance.priorityPages = await Promise.all(
      PRIORITY_PATHS.map(async (pathname) => {
        const page = productionUrl(pathname);
        const response = await searchAnalytics(accessToken, property, ["page"], {
          dimension: "page",
          expression: page,
        });
        return metricRow(response.rows?.[0], "page", page);
      }),
    );
    for (const dimension of ["country", "device"] as const) {
      const response = await searchAnalytics(accessToken, property, [dimension]);
      report.performance[
        dimension === "country" ? "countries" : "devices"
      ] = (response.rows ?? []).map((row) =>
        metricRow(row, dimension, "unknown"),
      );
    }

    if (options.inspectUrls) {
      report.urlInspection.results = await Promise.all(
        PRIORITY_PATHS.map(async (pathname) => {
          const url = productionUrl(pathname);
          try {
            const response = (await providerJson(
              accessToken,
              "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
              {
                method: "POST",
                body: JSON.stringify({
                  inspectionUrl: url,
                  siteUrl: property,
                  languageCode: "ja-JP",
                }),
                stage: "url-inspection",
              },
            )) as {
              inspectionResult?: {
                indexStatusResult?: Record<string, unknown>;
                mobileUsabilityResult?: Record<string, unknown>;
                richResultsResult?: {
                  verdict?: unknown;
                  detectedItems?: Array<{ richResultType?: unknown }>;
                };
              };
            };
            const index = response.inspectionResult?.indexStatusResult ?? {};
            const mobile =
              response.inspectionResult?.mobileUsabilityResult ?? {};
            const rich = response.inspectionResult?.richResultsResult ?? {};
            return {
              url,
              status: "active",
              verdict: index.verdict ?? "unknown",
              coverageState: index.coverageState ?? "unknown",
              indexingState: index.indexingState ?? "unknown",
              pageFetchState: index.pageFetchState ?? "unknown",
              robotsTxtState: index.robotsTxtState ?? "unknown",
              lastCrawlTime: index.lastCrawlTime ?? null,
              googleCanonical: index.googleCanonical ?? null,
              userCanonical: index.userCanonical ?? null,
              mobileUsabilityVerdict: mobile.verdict ?? "unknown",
              richResultsVerdict: rich.verdict ?? "unknown",
              richResultTypes: (rich.detectedItems ?? [])
                .map((item) => item.richResultType)
                .filter((value): value is string => typeof value === "string"),
            };
          } catch (error) {
            return {
              url,
              status: "blocked-external",
              failure: safeFailure(error),
            };
          }
        }),
      );
    }
    report.coreWebVitals = await queryCrux();
  } catch (error) {
    report.failure = safeFailure(error);
  }

  if (
    report.urlInspection.results.some((result) =>
      HOLD_PATHS.some(
        (pathname) =>
          result.url === new URL(pathname, PRODUCTION_ORIGIN).toString(),
      ),
    )
  ) {
    throw new Error("heat_hold_boundary_violated");
  }

  return report;
}
