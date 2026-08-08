#!/usr/bin/env node

/**
 * Staging release smoke probe.
 *
 * This command is deliberately read-only: it only issues GET requests and
 * inspects environment-variable presence. It never submits a consultation,
 * sends mail/push, calls a paid AI model, creates a checkout, or mutates
 * shared state. `--dry-run` is mandatory so an operator cannot accidentally
 * mistake this probe for an end-to-end delivery test.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";

const args = new Set(process.argv.slice(2));
if (!args.has("--dry-run")) {
  process.stderr.write(
    "Refusing to run without --dry-run. This smoke probe must remain non-mutating.\n",
  );
  process.exit(2);
}
const previewSafetyMode =
  args.has("--preview-safety") ||
  process.env.SAFE_AI_STAGING_MODE?.trim().toLowerCase() === "true" ||
  process.env.VERCEL_ENV === "preview";

function option(name, fallback) {
  const prefix = `${name}=`;
  const value = process.argv.slice(2).find((item) => item.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

const baseUrl = new URL(
  option("--base-url", process.env.STAGING_BASE_URL ?? "http://127.0.0.1:3320"),
);
if (!["http:", "https:"].includes(baseUrl.protocol)) {
  throw new Error("--base-url must use http or https");
}

const outputPath = resolve(
  option(
    "--output",
    "../docs/audits/evidence/final-polish-staging-readiness-2026-07-27/staging-smoke/staging-readonly-smoke.json",
  ),
);
const timeoutMs = Number(option("--timeout-ms", "20000"));
if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 60000) {
  throw new Error("--timeout-ms must be an integer from 1000 to 60000");
}

const envPresent = (name) => Boolean(process.env[name]?.trim());
const environment = {
  automationConsult: {
    recipientsConfigured: envPresent("AUTOMATION_CONSULT_RECIPIENTS"),
    fromConfigured:
      envPresent("AUTOMATION_CONSULT_FROM") || envPresent("NOTIFY_FROM"),
    resendConfigured: envPresent("RESEND_API_KEY"),
    sharedStateBackendRequested:
      process.env.AUTOMATION_CONSULT_STATE_BACKEND?.trim().toLowerCase() ===
      "upstash",
    sharedStateConfigured:
      envPresent("UPSTASH_REDIS_REST_URL") &&
      envPresent("UPSTASH_REDIS_REST_TOKEN") &&
      envPresent("AUTOMATION_CONSULT_STATE_HASH_SECRET"),
  },
  auth: {
    configured:
      envPresent("AUTH_SECRET") &&
      envPresent("AUTH_GOOGLE_ID") &&
      envPresent("AUTH_GOOGLE_SECRET"),
  },
  ai: {
    configured: envPresent("GEMINI_API_KEY") || envPresent("GOOGLE_API_KEY"),
    probeMode: "configuration-only-no-inference",
  },
  supabase: {
    configured:
      envPresent("NEXT_PUBLIC_SUPABASE_URL") &&
      envPresent("SUPABASE_SERVICE_ROLE_KEY"),
  },
  stripe: {
    configured:
      envPresent("STRIPE_SECRET_KEY") &&
      envPresent("STRIPE_WEBHOOK_SECRET") &&
      envPresent("NEXT_PUBLIC_STRIPE_PRICE_PREMIUM") &&
      envPresent("NEXT_PUBLIC_STRIPE_PRICE_PRO"),
  },
  push: {
    configured:
      envPresent("NEXT_PUBLIC_VAPID_PUBLIC_KEY") &&
      envPresent("VAPID_PRIVATE_KEY") &&
      envPresent("VAPID_SUBJECT"),
  },
  cron: { configured: envPresent("CRON_SECRET") },
  analytics: {
    configured: envPresent("NEXT_PUBLIC_GA_MEASUREMENT_ID"),
    activeInThisProbe: false,
  },
};

async function get(path) {
  const url = new URL(path, baseUrl);
  const startedAt = performance.now();
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: {
        "user-agent": "safe-ai-staging-readonly-smoke/1.0",
        "x-safe-ai-smoke-mode": "dry-run",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    return {
      path,
      status: response.status,
      headers: Object.fromEntries(
        [
          "cache-control",
          "content-security-policy",
          "content-type",
          "location",
          "x-robots-tag",
        ].map((name) => [name, response.headers.get(name)]),
      ),
      body: await response.text(),
      durationMs: Math.round(performance.now() - startedAt),
      error: null,
    };
  } catch (error) {
    return {
      path,
      status: null,
      headers: {},
      body: "",
      durationMs: Math.round(performance.now() - startedAt),
      error: error instanceof Error ? error.name : "request-failed",
    };
  }
}

function xmlLocations(body) {
  return [...body.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) =>
    match[1].replaceAll("&amp;", "&").trim(),
  );
}

function localSitemapPath(location) {
  try {
    const parsed = new URL(location, baseUrl);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

const checks = [];
function addCheck(id, passed, evidence, severity = "release") {
  checks.push({ id, passed: Boolean(passed), severity, evidence });
}

const home = await get("/");
addCheck("home-200", home.status === 200, {
  status: home.status,
  durationMs: home.durationMs,
});
addCheck(
  "home-automation-visible",
  home.body.includes("/services/automation") &&
    home.body.includes("業務自動化") &&
    home.body.includes("講習"),
  { hrefFound: home.body.includes("/services/automation") },
);
addCheck(
  "csp-present",
  Boolean(home.headers["content-security-policy"]),
  { present: Boolean(home.headers["content-security-policy"]) },
);
addCheck(
  "analytics-inactive-in-dry-run",
  !home.body.includes("googletagmanager.com/gtag/js") ||
    baseUrl.hostname === "www.anzen-ai-portal.jp",
  { dryRunDoesNotEmitAnalyticsEvent: true },
);

const automation = await get("/services/automation");
addCheck("automation-200", automation.status === 200, {
  status: automation.status,
  durationMs: automation.durationMs,
});
addCheck(
  "automation-ssr-offer",
  ["初回30分", "料金", "講習", "資料作成"].every((text) =>
    automation.body.includes(text),
  ),
  {
    initialConsultation: automation.body.includes("初回30分"),
    pricing: automation.body.includes("料金"),
    training: automation.body.includes("講習"),
    materials: automation.body.includes("資料作成"),
  },
);
addCheck(
  "automation-form-unsubmitted",
  automation.body.includes("consult-form") &&
    !automation.body.includes("受付番号"),
  {
    formPresent: automation.body.includes("consult-form"),
    noSubmittedReceiptRendered: !automation.body.includes("受付番号"),
  },
);
addCheck(
  "shared-state-configuration",
  !environment.automationConsult.sharedStateBackendRequested ||
    environment.automationConsult.sharedStateConfigured,
  environment.automationConsult,
  "configuration",
);
addCheck(
  "mail-configuration",
  !environment.automationConsult.resendConfigured ||
    (environment.automationConsult.recipientsConfigured &&
      environment.automationConsult.fromConfigured),
  environment.automationConsult,
  "configuration",
);
addCheck(
  "auth-configuration-recorded",
  true,
  environment.auth,
  "configuration",
);
addCheck(
  "ai-off-path-recorded",
  !environment.ai.configured,
  {
    configured: environment.ai.configured,
    expectedBehavior: "RAG/static fallback; no paid inference executed",
  },
  "observation",
);
addCheck(
  "ai-available-path-recorded",
  environment.ai.configured,
  {
    configured: environment.ai.configured,
    verification: "presence only; paid inference intentionally not executed",
  },
  "observation",
);

const jma = await get("/api/signage/jma?area=130000");
addCheck(
  "jma-readonly",
  jma.status === 200 || jma.status === 503,
  {
    status: jma.status,
    durationMs: jma.durationMs,
    acceptedStatuses: [200, 503],
  },
);
const weather = await get(
  "/api/signage-weather?latitude=35.6812&longitude=139.7671",
);
addCheck(
  "open-meteo-readonly",
  weather.status === 200 || weather.status === 503,
  {
    status: weather.status,
    durationMs: weather.durationMs,
    acceptedStatuses: [200, 503],
  },
);

const quarantinePaths = (
  process.env.STAGING_QUARANTINE_PATHS ??
  "/articles/chemical-ra-mandatory-substances,/articles/elearning-tokubetsu-12-types,/articles/fall-prevention-checklist-construction"
)
  .split(",")
  .map((path) => path.trim())
  .filter((path) => path.startsWith("/"));
for (const path of quarantinePaths) {
  const result = await get(path);
  addCheck(`quarantine-404:${path}`, result.status === 404, {
    path,
    status: result.status,
  });
}

const accidents = await get("/accident-news");
addCheck(
  "synthetic-provenance-visible",
  accidents.status === 200 &&
    (accidents.body.includes("synthetic") ||
      accidents.body.includes("模擬") ||
      accidents.body.includes("モック")),
  {
    status: accidents.status,
    provenanceLabelFound:
      accidents.body.includes("synthetic") ||
      accidents.body.includes("模擬") ||
      accidents.body.includes("モック"),
  },
);

const rootSitemap = await get("/sitemap.xml");
const rootSitemapUrls = xmlLocations(rootSitemap.body);
addCheck(
  "sitemap-root-readable",
  rootSitemap.status === 200 &&
    /<urlset[\s>]/i.test(rootSitemap.body) &&
    rootSitemapUrls.length > 0,
  {
    status: rootSitemap.status,
    urlCount: rootSitemapUrls.length,
    xmlShapeValid: /<urlset[\s>]/i.test(rootSitemap.body),
  },
);

const sitemapIndex = await get("/sitemap-index.xml");
const childLocations = xmlLocations(sitemapIndex.body);
addCheck(
  "sitemap-index-readable",
  sitemapIndex.status === 200 &&
    /<sitemapindex[\s>]/i.test(sitemapIndex.body) &&
    childLocations.length > 0,
  {
    status: sitemapIndex.status,
    childCount: childLocations.length,
    xmlShapeValid: /<sitemapindex[\s>]/i.test(sitemapIndex.body),
  },
);

const childSitemaps = [];
for (const location of childLocations) {
  const path = localSitemapPath(location);
  if (!path) {
    childSitemaps.push({
      path: null,
      status: null,
      body: "",
      malformedLocation: true,
    });
    continue;
  }
  const result = await get(path);
  childSitemaps.push({
    path,
    status: result.status,
    body: result.body,
    malformedLocation: false,
  });
}
const unreadableChildren = childSitemaps.filter(
  (item) =>
    item.malformedLocation ||
    item.status !== 200 ||
    !/<urlset[\s>]/i.test(item.body),
);
addCheck(
  "sitemap-children-readable",
  childSitemaps.length > 0 && unreadableChildren.length === 0,
  {
    childCount: childSitemaps.length,
    unreadableChildCount: unreadableChildren.length,
    statuses: childSitemaps.map((item) => item.status),
  },
);

const childPageUrls = childSitemaps.flatMap((item) =>
  xmlLocations(item.body),
);
const uniqueChildPageUrls = new Set(childPageUrls);
const childDuplicateUrlCount = childPageUrls.length - uniqueChildPageUrls.size;
const uniquePageUrls =
  uniqueChildPageUrls.size > 0
    ? uniqueChildPageUrls
    : new Set(rootSitemapUrls);
const legacyRootOverlapCount = rootSitemapUrls.filter((url) =>
  uniqueChildPageUrls.has(url),
).length;
addCheck(
  "sitemap-readable",
  uniquePageUrls.size > 0 &&
    unreadableChildren.length === 0 &&
    childDuplicateUrlCount === 0,
  {
    rootUrlCount: rootSitemapUrls.length,
    childUrlCount: childPageUrls.length,
    uniqueUrlCount: uniquePageUrls.size,
    childDuplicateUrlCount,
    legacyRootOverlapCount,
  },
);
const heatPaths = [
  "/heat-illness-prevention",
  "/heat-illness-prevention/slides",
  "/heat-illness-prevention/elearning",
];
const sitemapPagePaths = new Set(
  [...uniquePageUrls]
    .map((location) => localSitemapPath(location))
    .filter(Boolean),
);
const includedHeatPaths = heatPaths.filter((path) =>
  sitemapPagePaths.has(path),
);
addCheck("heat-pages-sitemap-excluded", includedHeatPaths.length === 0, {
  checkedPathCount: heatPaths.length,
  includedCount: includedHeatPaths.length,
  excluded: includedHeatPaths.length === 0,
});

const heat = await get("/heat-illness-prevention");
addCheck(
  "heat-noindex-follow",
  heat.status === 200 &&
    /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex[^"']*follow/i.test(
      heat.body,
    ),
  { status: heat.status, noindexFollowFound: heat.body.includes("noindex") },
);
addCheck(
  "canonical-home",
  /<link[^>]+rel=["']canonical["'][^>]+href=["'][^"']+["']/i.test(home.body),
  { present: /rel=["']canonical["']/i.test(home.body) },
);
addCheck(
  "canonical-automation",
  /<link[^>]+rel=["']canonical["'][^>]+href=["'][^"']+\/services\/automation["']/i.test(
    automation.body,
  ),
  { present: /rel=["']canonical["']/i.test(automation.body) },
);

const sw = await get("/sw.js");
addCheck(
  "service-worker-readable",
  sw.status === 200 &&
    sw.body.includes("CACHE_NAME") &&
    sw.body.includes("navigationNetworkFirst"),
  {
    status: sw.status,
    cacheVersionHash: createHash("sha256")
      .update(sw.body)
      .digest("hex")
      .slice(0, 16),
  },
);
const robots = await get("/robots.txt");
addCheck(
  "robots-readable",
  robots.status === 200 &&
    (previewSafetyMode
      ? /Disallow:\s*\/(?:\s|$)/i.test(robots.body) &&
        !robots.body.includes("Sitemap:")
      : robots.body.includes("Sitemap:")),
  {
    status: robots.status,
    sitemapDirective: robots.body.includes("Sitemap:"),
    previewSafetyMode,
  },
);
const missing = await get("/__staging-smoke-missing-readonly__");
addCheck("not-found-404", missing.status === 404, { status: missing.status });
const protectedHealth = await get("/api/admin/health");
addCheck(
  "health-endpoint-protected",
  [401, 404, 503].includes(protectedHealth.status),
  {
    status: protectedHealth.status,
    acceptedStatuses: [401, 404, 503],
    note:
      "503 is the expected fail-closed result when ADMIN_HEALTH_KEY itself is not configured.",
  },
);

const releaseFailures = checks.filter(
  (check) => !check.passed && check.severity === "release",
);
const configurationFindings = checks.filter(
  (check) => !check.passed && check.severity === "configuration",
);
const observations = checks.filter(
  (check) => !check.passed && check.severity === "observation",
);
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  baseUrl: baseUrl.origin,
  mode: "dry-run-read-only",
  guarantees: {
    httpMethods: ["GET"],
    consultationSubmitted: false,
    sharedStateWritten: false,
    emailSent: false,
    pushSent: false,
    paymentCreated: false,
    paidAiInferenceExecuted: false,
    piiIncluded: false,
  },
  environment,
  summary: {
    checkCount: checks.length,
    passed: checks.filter((check) => check.passed).length,
    releaseFailures: releaseFailures.length,
    configurationFindings: configurationFindings.length,
    observations: observations.length,
    accepted: releaseFailures.length === 0,
  },
  checks,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, {
  encoding: "utf8",
  flag: "wx",
});
process.stdout.write(
  `${JSON.stringify(
    {
      outputPath,
      ...report.summary,
      guarantees: report.guarantees,
    },
    null,
    2,
  )}\n`,
);
if (releaseFailures.length > 0) process.exitCode = 1;
