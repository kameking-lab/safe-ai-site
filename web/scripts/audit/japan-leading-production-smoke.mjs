#!/usr/bin/env node

/**
 * Read-mostly production smoke for the 2026-07-31 gap-closure release.
 *
 * The only POST requests use fixed, non-PII payloads and exercise deterministic
 * fail-closed paths:
 * - emergency chatbot classification (before any model call),
 * - chemical ambiguity / name-CAS mismatch,
 * - unavailable automation intake (before request-body parsing or delivery).
 *
 * It never sends mail or push, creates a payment, submits Search Console data,
 * writes application data, or calls an external generative model.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const argv = process.argv.slice(2);

function option(name, fallback) {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : fallback;
}

const baseUrl = new URL(
  option("base-url", "https://www.anzen-ai-portal.jp"),
);
if (
  baseUrl.protocol !== "https:" ||
  baseUrl.hostname !== "www.anzen-ai-portal.jp"
) {
  throw new Error(
    "--base-url must be the production origin https://www.anzen-ai-portal.jp",
  );
}

const expectedDeploymentId = option("deployment-id", "");
if (!/^dpl_[A-Za-z0-9]+$/.test(expectedDeploymentId)) {
  throw new Error("--deployment-id must be an exact Vercel deployment ID");
}

const outputPath = path.resolve(
  option(
    "output",
    "../docs/audits/evidence/japan-leading-gap-closure-2026-07-31/production/production-smoke.json",
  ),
);
const screenshotDirectory = path.resolve(
  path.dirname(outputPath),
  "screenshots",
);
mkdirSync(path.dirname(outputPath), { recursive: true });
mkdirSync(screenshotDirectory, { recursive: true });

const checks = [];
const failures = [];
const observations = {
  browser: {
    consoleErrors: [],
    pageErrors: [],
    sameOriginAssetFailures: [],
    optionalTrackingRequests: [],
  },
  jma: null,
};

function record(id, passed, evidence, severity = "release") {
  const item = { id, passed: Boolean(passed), severity, evidence };
  checks.push(item);
  if (!item.passed) failures.push(item);
}

function headersFrom(response) {
  return Object.fromEntries(
    [
      "cache-control",
      "content-security-policy",
      "content-security-policy-report-only",
      "content-type",
      "location",
      "x-ai-used",
      "x-data-source",
      "x-robots-tag",
      "x-safe-ai-preview-mode",
    ].map((name) => [name, response.headers.get(name)]),
  );
}

async function request(route, init = {}) {
  const startedAt = performance.now();
  try {
    const response = await fetch(new URL(route, baseUrl), {
      redirect: "manual",
      signal: AbortSignal.timeout(45_000),
      ...init,
      headers: {
        "user-agent": "safe-ai-japan-leading-production-smoke/2026-07-30",
        ...(init.headers ?? {}),
      },
    });
    return {
      route,
      status: response.status,
      headers: headersFrom(response),
      body: await response.text(),
      durationMs: Math.round(performance.now() - startedAt),
      error: null,
    };
  } catch (error) {
    return {
      route,
      status: null,
      headers: {},
      body: "",
      durationMs: Math.round(performance.now() - startedAt),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function metaRobots(html) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const tag = tags.find(
    (candidate) =>
      /\bname=["']robots["']/i.test(candidate) ||
      /\bname=["']googlebot["']/i.test(candidate),
  );
  return tag?.match(/\bcontent=["']([^"']*)["']/i)?.[1] ?? "";
}

function canonical(html) {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  const tag = tags.find((candidate) =>
    /\brel=["'][^"']*\bcanonical\b[^"']*["']/i.test(candidate),
  );
  return (
    tag
      ?.match(/\bhref=["']([^"']+)["']/i)?.[1]
      ?.replaceAll("&amp;", "&") ?? ""
  );
}

function h1Count(html) {
  return (html.match(/<h1\b/gi) ?? []).length;
}

function jsonLdCount(html) {
  return (
    html.match(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>/gi,
    ) ?? []
  ).length;
}

function withoutReactSsrMarkers(html) {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

function cspDirective(policy, name) {
  return (
    policy
      ?.split(";")
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith(`${name} `)) ?? ""
  );
}

function firstRobotsGroup(body) {
  const groups = body
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .map((group) => group.split(/\r?\n/).map((line) => line.trim()));
  return (
    groups.find((group) =>
      group.some((line) => /^User-Agent:\s*\*$/i.test(line)),
    ) ?? []
  );
}

function json(body) {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

const publicRoutes = [
  "/",
  "/risk",
  "/chatbot",
  "/law-search",
  "/laws",
  "/chemical-ra",
  "/accident-news",
  "/accidents?acc_kw=%E5%A2%9C%E8%90%BD&acc_page=2",
  "/resources",
  "/education",
  "/education-certification/finder",
  "/training/visual-ky",
  "/ky/paper",
  "/signage",
  "/services/automation",
  "/about/quality",
  "/search?q=%E5%A2%9C%E8%90%BD",
];
const routeResults = await Promise.all(
  publicRoutes.map((route) => request(route)),
);

for (const result of routeResults) {
  const robots = metaRobots(result.body);
  const canonicalUrl = canonical(result.body);
  record(`${result.route}:http-200`, result.status === 200, {
    status: result.status,
    durationMs: result.durationMs,
    error: result.error,
  });
  record(`${result.route}:single-h1`, h1Count(result.body) === 1, {
    h1Count: h1Count(result.body),
  });
  record(
    `${result.route}:canonical-production`,
    canonicalUrl.startsWith(baseUrl.origin),
    { canonical: canonicalUrl },
  );
  record(
    `${result.route}:no-preview-header`,
    !result.headers["x-safe-ai-preview-mode"] &&
      !/noindex/i.test(result.headers["x-robots-tag"] ?? ""),
    {
      previewMode: result.headers["x-safe-ai-preview-mode"],
      xRobotsTag: result.headers["x-robots-tag"],
    },
  );
  if (result.route === "/") {
    record("home:indexable", !/noindex/i.test(robots), { robots });
    record(
      "home:csp-present",
      Boolean(result.headers["content-security-policy"]),
      { present: Boolean(result.headers["content-security-policy"]) },
    );
  }
}

const protectedGovernanceRoutes = [
  {
    route: "/chemical-ra/ledger",
    failClosedCopy: "接続状態: scope",
  },
  {
    route: "/education/progress",
    failClosedCopy: "接続状態: scope",
  },
  {
    route: "/signage/manage",
    failClosedCopy: "端末未登録・接続未確認",
  },
];
const protectedGovernanceResults = await Promise.all(
  protectedGovernanceRoutes.map(({ route }) => request(route)),
);
for (const [index, result] of protectedGovernanceResults.entries()) {
  const expectation = protectedGovernanceRoutes[index];
  const robots = metaRobots(result.body);
  record(`${result.route}:http-200`, result.status === 200, {
    status: result.status,
    durationMs: result.durationMs,
    error: result.error,
  });
  record(
    `${result.route}:fail-closed-without-scope`,
    withoutReactSsrMarkers(result.body).includes(expectation.failClosedCopy),
    { expectedState: "unscoped-and-unavailable" },
  );
  record(
    `${result.route}:noindex-noarchive`,
    /\bnoindex\b/i.test(robots) && /\bnoarchive\b/i.test(robots),
    { robots },
  );
  record(
    `${result.route}:no-canonical`,
    canonical(result.body) === "",
    { canonical: canonical(result.body) },
  );
}

const home = routeResults[0];
const productionCsp = home.headers["content-security-policy"] ?? "";
const productionScriptSource = cspDirective(
  productionCsp,
  "script-src",
);
const productionStyleSource = cspDirective(productionCsp, "style-src");
record(
  "csp:production-strict-script-enforced",
  /'nonce-[^']+'/.test(productionScriptSource) &&
    productionScriptSource.includes("'strict-dynamic'") &&
    !productionScriptSource.includes("'unsafe-inline'") &&
    !productionScriptSource.includes("'unsafe-eval'"),
  {
    noncePresent: /'nonce-[^']+'/.test(productionScriptSource),
    strictDynamic: productionScriptSource.includes("'strict-dynamic'"),
    unsafeInline: productionScriptSource.includes("'unsafe-inline'"),
    unsafeEval: productionScriptSource.includes("'unsafe-eval'"),
  },
);
record(
  "csp:production-no-report-only-fallback",
  !home.headers["content-security-policy-report-only"],
  {
    reportOnlyPresent: Boolean(
      home.headers["content-security-policy-report-only"],
    ),
  },
);
record(
  "csp:style-inline-isolated-and-explicit",
  productionStyleSource.includes("'unsafe-inline'"),
  {
    styleUnsafeInline: productionStyleSource.includes("'unsafe-inline'"),
    scriptUnsafeInline: productionScriptSource.includes("'unsafe-inline'"),
  },
  "documented-residual",
);
const flagshipPaths = [
  "/risk",
  "/chatbot",
  "/chemical-ra",
  "/accident-news",
  "/laws",
  "/resources",
  "/education-certification",
  "/training/visual-ky",
  "/services/automation",
];
for (const href of flagshipPaths) {
  record(`home:one-click:${href}`, home.body.includes(`href="${href}`), {
    href,
  });
}

const heatPaths = [
  "/heat-illness-prevention",
  "/heat-illness-prevention/slides",
  "/heat-illness-prevention/elearning",
];
const heatResults = await Promise.all(heatPaths.map((route) => request(route)));
for (const result of heatResults) {
  const robots = metaRobots(result.body);
  record(`${result.route}:http-200`, result.status === 200, {
    status: result.status,
    durationMs: result.durationMs,
  });
  record(
    `${result.route}:noindex-follow`,
    /\bnoindex\b/i.test(robots) && /\bfollow\b/i.test(robots),
    { robots },
  );
  record(
    `${result.route}:production-canonical`,
    canonical(result.body).startsWith(baseUrl.origin),
    { canonical: canonical(result.body) },
  );
}

record(
  "heat:ky-link",
  heatResults[0].body.includes("/ky/paper?topic=heat-illness"),
  { target: "/ky/paper?topic=heat-illness" },
);
record(
  "heat:education-link",
  heatResults[0].body.includes("/heat-illness-prevention/elearning"),
  { target: "/heat-illness-prevention/elearning" },
);

const [robotsResult, sitemapResult, sitemapIndexResult] = await Promise.all([
  request("/robots.txt"),
  request("/sitemap.xml"),
  request("/sitemap-index.xml"),
]);
record("robots:http-200", robotsResult.status === 200, {
  status: robotsResult.status,
});
const generalRobotsRules = firstRobotsGroup(robotsResult.body);
record(
  "robots:production-root-allowed",
  generalRobotsRules.some((line) => /^Allow:\s*\/$/i.test(line)) &&
    !generalRobotsRules.some((line) => /^Disallow:\s*\/$/i.test(line)),
  { generalUserAgentRules: generalRobotsRules },
);
record(
  "robots:sitemap-index-declared",
  robotsResult.body.includes(
    "Sitemap: https://www.anzen-ai-portal.jp/sitemap-index.xml",
  ),
  { declared: true },
);
record("sitemap:http-200", sitemapResult.status === 200, {
  status: sitemapResult.status,
});
record("sitemap-index:http-200", sitemapIndexResult.status === 200, {
  status: sitemapIndexResult.status,
});
record(
  "sitemap:home-present",
  /<loc>https:\/\/www\.anzen-ai-portal\.jp\/?<\/loc>/.test(
    sitemapResult.body,
  ),
  { home: baseUrl.origin },
);
for (const heatPath of heatPaths) {
  record(
    `sitemap:heat-excluded:${heatPath}`,
    !sitemapResult.body.includes(`${heatPath}</loc>`) &&
      !sitemapIndexResult.body.includes(`${heatPath}</loc>`),
    { path: heatPath },
  );
}
for (const excludedPath of [
  "/production-smoke-not-found-20260731",
  "/operations",
  "/admin/operations",
  "/admin/automation-consult-queue",
  "/chemical-ra/ledger",
  "/education/progress",
  "/signage/manage",
]) {
  record(
    `sitemap:nonindexable-excluded:${excludedPath}`,
    !sitemapResult.body.includes(`${excludedPath}</loc>`) &&
      !sitemapIndexResult.body.includes(`${excludedPath}</loc>`),
    { path: excludedPath },
  );
}

const blockedRoutes = [
  "/production-smoke-not-found-20260731",
  "/operations",
  "/admin/operations",
  "/admin/automation-consult-queue",
  "/accidents/synthetic-audit-case",
  "/circulars/mhlw-notice-0870",
  "/articles/chemical-ra-mandatory-substances",
  "/articles/elearning-tokubetsu-12-types",
  "/articles/fall-prevention-checklist-construction",
];
const blockedResults = await Promise.all(
  blockedRoutes.map((route) => request(route)),
);
for (const result of blockedResults) {
  record(`${result.route}:http-404`, result.status === 404, {
    status: result.status,
  });
  record(
    `${result.route}:no-canonical`,
    canonical(result.body) === "",
    { canonical: canonical(result.body) },
  );
  record(
    `${result.route}:no-json-ld`,
    jsonLdCount(result.body) === 0,
    { jsonLdCount: jsonLdCount(result.body) },
  );
  record(
    `${result.route}:noindex`,
    /\bnoindex\b/i.test(metaRobots(result.body)) ||
      /\bnoindex\b/i.test(result.headers["x-robots-tag"] ?? ""),
    {
      metaRobots: metaRobots(result.body),
      xRobotsTag: result.headers["x-robots-tag"],
    },
  );
}

const authErrorWithQuery = await request(
  "/auth/error?error=synthetic&token=synthetic",
);
const sanitizedAuthLocation = authErrorWithQuery.headers.location
  ? new URL(authErrorWithQuery.headers.location, baseUrl).href
  : "";
record(
  "metadata:auth-error-query-sanitized",
  authErrorWithQuery.status === 307 &&
    sanitizedAuthLocation === `${baseUrl.origin}/auth/error`,
  {
    status: authErrorWithQuery.status,
    locationIsQueryless:
      sanitizedAuthLocation === `${baseUrl.origin}/auth/error`,
  },
);

const emergency = await request("/api/chatbot", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    origin: baseUrl.origin,
  },
  body: JSON.stringify({
    message: "呼吸がありません",
    privacyConfirmed: true,
  }),
});
const emergencyPayload = json(emergency.body);
record("emergency:http-200", emergency.status === 200, {
  status: emergency.status,
});
record(
  "emergency:deterministic-safety-response",
  emergencyPayload?.source_type === "safety" &&
    emergencyPayload?.requiresHumanReview === true &&
    emergencyPayload?.answer?.includes("119") &&
    emergencyPayload?.answer?.includes("AED"),
  {
    sourceType: emergencyPayload?.source_type ?? null,
    safetyKind: emergencyPayload?.safetyKind ?? null,
    requiresHumanReview: emergencyPayload?.requiresHumanReview ?? null,
    includes119: emergencyPayload?.answer?.includes("119") ?? false,
    includesAed: emergencyPayload?.answer?.includes("AED") ?? false,
  },
);

const [ambiguousChemical, mismatchChemical] = await Promise.all([
  request("/api/chemical-ra", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: baseUrl.origin,
    },
    body: JSON.stringify({ chemicalName: "キシレン" }),
  }),
  request("/api/chemical-ra", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: baseUrl.origin,
    },
    body: JSON.stringify({
      chemicalName: "トルエン",
      casNumber: "1330-20-7",
    }),
  }),
]);
const ambiguousPayload = json(ambiguousChemical.body);
const mismatchPayload = json(mismatchChemical.body);
record(
  "chemical:ambiguous-fail-closed",
  ambiguousChemical.status === 422 &&
    ambiguousPayload?.error?.code === "AMBIGUOUS",
  {
    status: ambiguousChemical.status,
    code: ambiguousPayload?.error?.code ?? null,
  },
);
record(
  "chemical:name-cas-mismatch-fail-closed",
  mismatchChemical.status === 422 &&
    mismatchPayload?.error?.code === "CAS_MISMATCH",
  {
    status: mismatchChemical.status,
    code: mismatchPayload?.error?.code ?? null,
  },
);

const unavailableIntake = await request("/api/automation-consult", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    origin: baseUrl.origin,
  },
  body: "{}",
});
const intakePayload = json(unavailableIntake.body);
record(
  "automation:intake-fail-closed-before-pii",
  unavailableIntake.status === 503 &&
    intakePayload?.error?.code === "intake_unavailable",
  {
    status: unavailableIntake.status,
    code: intakePayload?.error?.code ?? null,
  },
);

const jmaResult = await request("/api/signage/jma");
const jmaPayload = json(jmaResult.body);
const warningRegions = Object.values(jmaPayload?.warnings?.byIso ?? {});
const nonLiveWithoutIssue = warningRegions.filter(
  (region) =>
    region?.sourceStatus !== "live" && !region?.sourceIssue,
);
const warningQuality = jmaPayload?.warnings?.quality?.status ?? null;
const warningTrust = jmaPayload?.trust?.warnings?.status ?? null;
observations.jma = {
  status: jmaResult.status,
  dataSource: jmaResult.headers["x-data-source"],
  degraded: jmaPayload?.degraded ?? null,
  warningQuality,
  warningTrust,
  regionCount: warningRegions.length,
  liveCount: warningRegions.filter(
    (region) => region?.sourceStatus === "live",
  ).length,
  nonLiveCount: warningRegions.filter(
    (region) => region?.sourceStatus !== "live",
  ).length,
  nonLiveWithoutIssue: nonLiveWithoutIssue.length,
};
record("jma:http-200", jmaResult.status === 200, observations.jma);
record(
  "jma:failure-state-is-explicit",
  warningRegions.length === 47 && nonLiveWithoutIssue.length === 0,
  observations.jma,
);
record(
  "jma:degraded-never-reported-live",
  warningQuality === "live" ||
    (jmaPayload?.degraded === true && warningTrust !== "live"),
  observations.jma,
);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  locale: "ja-JP",
  timezoneId: "Asia/Tokyo",
  serviceWorkers: "block",
  reducedMotion: "reduce",
});
await context.addInitScript(() => {
  localStorage.setItem("anzen-onboarding-v1-seen", "1");
  localStorage.setItem("a11y-hint-dismissed", "true");
  localStorage.setItem("safe-ai:local-storage-warning-dismissed:v1", "1");
  localStorage.setItem("safe-ai:optional-tracking-consent:v1", "denied");
  localStorage.setItem("pwa-install-dismissed-at", String(Date.now()));
});

const page = await context.newPage();
page.on("console", (message) => {
  if (message.type() === "error") {
    observations.browser.consoleErrors.push({
      url: page.url(),
      text: message.text().slice(0, 400),
    });
  }
});
page.on("pageerror", (error) => {
  observations.browser.pageErrors.push({
    url: page.url(),
    text: error.message.slice(0, 400),
  });
});
page.on("request", (browserRequest) => {
  if (
    /\/api\/rum(?:[/?]|$)|googletagmanager|google-analytics|vercelinsights/i.test(
      browserRequest.url(),
    )
  ) {
    observations.browser.optionalTrackingRequests.push(browserRequest.url());
  }
});
page.on("requestfailed", (browserRequest) => {
  const requestUrl = new URL(browserRequest.url());
  if (
    requestUrl.origin === baseUrl.origin &&
    ["document", "script", "stylesheet", "image"].includes(
      browserRequest.resourceType(),
    ) &&
    !/ERR_ABORTED/.test(browserRequest.failure()?.errorText ?? "")
  ) {
    observations.browser.sameOriginAssetFailures.push({
      url: browserRequest.url(),
      resourceType: browserRequest.resourceType(),
      error: browserRequest.failure()?.errorText ?? "unknown",
    });
  }
});

const browserTargets = [
  { route: "/", width: 320, height: 844, screenshot: "home-320.png" },
  { route: "/", width: 390, height: 844, screenshot: "home-390.png" },
  { route: "/", width: 768, height: 1024, screenshot: "home-768.png" },
  { route: "/", width: 1440, height: 900, screenshot: "home-1440.png" },
  { route: "/risk", width: 390, height: 844 },
  {
    route: "/heat-illness-prevention",
    width: 390,
    height: 844,
    screenshot: "heat-390.png",
  },
  { route: "/chatbot", width: 390, height: 844 },
  {
    route: "/chemical-ra",
    width: 390,
    height: 844,
    screenshot: "chemical-ra-390.png",
  },
  { route: "/chemical-ra/ledger", width: 390, height: 844 },
  { route: "/accident-news", width: 390, height: 844 },
  { route: "/accidents", width: 390, height: 844 },
  { route: "/laws", width: 390, height: 844 },
  { route: "/resources", width: 390, height: 844 },
  { route: "/education", width: 390, height: 844 },
  { route: "/education/progress", width: 390, height: 844 },
  {
    route: "/education-certification/finder",
    width: 390,
    height: 844,
  },
  { route: "/training/visual-ky", width: 390, height: 844 },
  { route: "/ky/paper", width: 390, height: 844 },
  { route: "/signage", width: 390, height: 844 },
  { route: "/signage/manage", width: 390, height: 844 },
  {
    route: "/services/automation",
    width: 390,
    height: 844,
    screenshot: "automation-390.png",
  },
];

for (const target of browserTargets) {
  await page.setViewportSize({
    width: target.width,
    height: target.height,
  });
  const response = await page.goto(new URL(target.route, baseUrl).href, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(450);
  const snapshot = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const mascotImages = [
      ...document.querySelectorAll('img[src*="/mascot/"]'),
    ];
    return {
      h1Count: document.querySelectorAll("h1").length,
      mainCount: document.querySelectorAll("main").length,
      overflow:
        Math.max(root.scrollWidth, body.scrollWidth) - root.clientWidth,
      title: document.title,
      bodyText: body.innerText,
      mainFormCount: document.querySelectorAll("main form").length,
      piiInputCount: document.querySelectorAll(
        'main input[type="email"], main input[type="tel"], main input[type="text"], main textarea:not([readonly])',
      ).length,
      submitButtonCount: document.querySelectorAll(
        'main button[type="submit"], main input[type="submit"]',
      ).length,
      readonlyTemplateCount: document.querySelectorAll(
        "main textarea[readonly]",
      ).length,
      mascotCount: mascotImages.length,
      brokenMascotCount: mascotImages.filter(
        (image) =>
          image.naturalWidth === 0 ||
          image.naturalHeight === 0 ||
          !image.getAttribute("width") ||
          !image.getAttribute("height"),
      ).length,
      allHrefs: [...document.querySelectorAll("a[href]")].map(
        (link) => link.getAttribute("href") ?? "",
      ),
    };
  });
  const prefix = `browser:${target.route}@${target.width}`;
  record(`${prefix}:http-200`, response?.status() === 200, {
    status: response?.status() ?? null,
  });
  record(`${prefix}:single-h1-main`, snapshot.h1Count === 1 && snapshot.mainCount === 1, {
    h1Count: snapshot.h1Count,
    mainCount: snapshot.mainCount,
  });
  record(`${prefix}:no-horizontal-overflow`, snapshot.overflow <= 2, {
    overflow: snapshot.overflow,
  });
  if (target.route === "/") {
    record(
      `${prefix}:primary-navigation`,
      flagshipPaths.every((href) => snapshot.allHrefs.includes(href)),
      {
        missing: flagshipPaths.filter(
          (href) => !snapshot.allHrefs.includes(href),
        ),
      },
    );
    record(
      `${prefix}:mascot-assets`,
      snapshot.mascotCount > 0 && snapshot.brokenMascotCount === 0,
      {
        mascotCount: snapshot.mascotCount,
        brokenMascotCount: snapshot.brokenMascotCount,
      },
    );
  }
  if (target.route === "/heat-illness-prevention") {
    record(
      `${prefix}:ky-and-education`,
      snapshot.allHrefs.some((href) =>
        href.startsWith("/ky/paper?topic=heat-illness"),
      ) &&
        snapshot.allHrefs.includes("/heat-illness-prevention/elearning"),
      {
        heatKy: snapshot.allHrefs.some((href) =>
          href.startsWith("/ky/paper?topic=heat-illness"),
        ),
        elearning: snapshot.allHrefs.includes(
          "/heat-illness-prevention/elearning",
        ),
      },
    );
  }
  if (target.route === "/accidents") {
    record(
      `${prefix}:synthetic-labelled`,
      /モック|合成|synthetic/i.test(snapshot.bodyText),
      { labelPresent: /モック|合成|synthetic/i.test(snapshot.bodyText) },
    );
  }
  if (target.route === "/services/automation") {
    const emailPattern =
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
    record(
      `${prefix}:preparing-no-pii-form`,
      /受付(?:は|の)?準備中/.test(snapshot.bodyText) &&
        snapshot.mainFormCount === 0 &&
        snapshot.piiInputCount === 0 &&
        snapshot.submitButtonCount === 0 &&
        snapshot.readonlyTemplateCount > 0 &&
        !emailPattern.test(snapshot.bodyText),
      {
        preparationLabel: /受付(?:は|の)?準備中/.test(snapshot.bodyText),
        mainFormCount: snapshot.mainFormCount,
        piiInputCount: snapshot.piiInputCount,
        submitButtonCount: snapshot.submitButtonCount,
        readonlyTemplateCount: snapshot.readonlyTemplateCount,
        emailExposed: emailPattern.test(snapshot.bodyText),
      },
    );
  }
  if (target.screenshot) {
    await page.screenshot({
      path: path.join(screenshotDirectory, target.screenshot),
      fullPage: false,
      animations: "disabled",
    });
  }
}

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(baseUrl.href, {
  waitUntil: "domcontentloaded",
  timeout: 60_000,
});
const text400 = await page.evaluate(
  () =>
    new Promise((resolve) => {
      document.documentElement.style.fontSize = "400%";
      requestAnimationFrame(() => {
        const root = document.documentElement;
        const body = document.body;
        resolve({
          overflow:
            Math.max(root.scrollWidth, body.scrollWidth) - root.clientWidth,
          h1Visible: Boolean(
            document.querySelector("h1")?.getBoundingClientRect().height,
          ),
        });
      });
    }),
);
record(
  "browser:home-400-percent",
  text400.h1Visible && text400.overflow <= 2,
  text400,
);

await page.goto(baseUrl.href, {
  waitUntil: "domcontentloaded",
  timeout: 60_000,
});
await page.keyboard.press("Tab");
const firstFocus = await page.evaluate(() => ({
  href: document.activeElement?.getAttribute("href") ?? "",
  text: document.activeElement?.textContent?.trim() ?? "",
}));
record("browser:keyboard-skip-link", firstFocus.href === "#main-content", {
  firstFocus,
});

const noJsContext = await browser.newContext({
  javaScriptEnabled: false,
  locale: "ja-JP",
  viewport: { width: 390, height: 844 },
  serviceWorkers: "block",
});
const noJsPage = await noJsContext.newPage();
const noJsResponse = await noJsPage.goto(baseUrl.href, {
  waitUntil: "domcontentloaded",
  timeout: 60_000,
});
const noJsSnapshot = await noJsPage.evaluate(() => ({
  h1Count: document.querySelectorAll("h1").length,
  mainCount: document.querySelectorAll("main").length,
  flagshipLinks: [
    ...document.querySelectorAll("a[href]"),
  ].map((link) => link.getAttribute("href") ?? ""),
}));
record(
  "browser:javascript-disabled-core-content",
  noJsResponse?.status() === 200 &&
    noJsSnapshot.h1Count === 1 &&
    noJsSnapshot.mainCount === 1 &&
    flagshipPaths.every((href) => noJsSnapshot.flagshipLinks.includes(href)),
  {
    status: noJsResponse?.status() ?? null,
    h1Count: noJsSnapshot.h1Count,
    mainCount: noJsSnapshot.mainCount,
    missing: flagshipPaths.filter(
      (href) => !noJsSnapshot.flagshipLinks.includes(href),
    ),
  },
);
await noJsContext.close();

const forcedColorsContext = await browser.newContext({
  forcedColors: "active",
  reducedMotion: "reduce",
  viewport: { width: 390, height: 844 },
  locale: "ja-JP",
  serviceWorkers: "block",
});
const forcedColorsPage = await forcedColorsContext.newPage();
await forcedColorsPage.goto(baseUrl.href, {
  waitUntil: "domcontentloaded",
  timeout: 60_000,
});
const forcedColors = await forcedColorsPage.evaluate(() => ({
  forcedColors: matchMedia("(forced-colors: active)").matches,
  reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  h1Visible: Boolean(
    document.querySelector("h1")?.getBoundingClientRect().height,
  ),
}));
record(
  "browser:forced-colors-reduced-motion",
  forcedColors.forcedColors &&
    forcedColors.reducedMotion &&
    forcedColors.h1Visible,
  forcedColors,
);
await forcedColorsContext.close();

record(
  "browser:no-page-errors",
  observations.browser.pageErrors.length === 0,
  observations.browser.pageErrors,
);
record(
  "browser:no-same-origin-asset-failures",
  observations.browser.sameOriginAssetFailures.length === 0,
  observations.browser.sameOriginAssetFailures,
);
record(
  "browser:no-console-errors",
  observations.browser.consoleErrors.length === 0,
  observations.browser.consoleErrors,
);
record(
  "privacy:no-optional-tracking-with-denied-consent",
  observations.browser.optionalTrackingRequests.length === 0,
  observations.browser.optionalTrackingRequests,
);

await context.close();
await browser.close();

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  baseUrl: baseUrl.origin,
  expectedDeploymentId,
  mode: "production-smoke-fixed-non-pii-fail-closed-probes",
  guarantees: {
    credentialValuesRecorded: false,
    piiSubmitted: false,
    consultationBodySubmitted: false,
    mailSent: false,
    pushSent: false,
    paymentsCreated: false,
    searchConsoleMutations: false,
    externalGenerativeAiCalls: false,
    applicationDataWrites: false,
  },
  passed: failures.length === 0,
  checkCount: checks.length,
  passedCount: checks.length - failures.length,
  failedCount: failures.length,
  failures,
  observations,
  checks,
};

writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify({
    passed: report.passed,
    checkCount: report.checkCount,
    passedCount: report.passedCount,
    failedCount: report.failedCount,
    failures: report.failures,
    jma: report.observations.jma,
    output: outputPath,
  }),
);

if (!report.passed) process.exitCode = 1;
