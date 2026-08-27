/**
 * Read-mostly production smoke for the 2026-07-31 gap-closure release.
 *
 * By default, the only POST requests use fixed, non-PII payloads and exercise deterministic
 * fail-closed paths:
 * - emergency chatbot classification (before any model call),
 * - chemical ambiguity / name-CAS mismatch,
 * - unavailable automation intake (before request-body parsing or delivery).
 *
 * It never sends mail or push, creates a payment, submits Search Console data,
 * writes application data, or calls an external generative model. Pass
 * `--get-only` when rechecking read-only production state after a harness change.
 */
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

export function resolveRepositoryExternalEvidencePath({
  configuredPath,
  repositoryRoot,
}) {
  if (!configuredPath || !path.isAbsolute(configuredPath)) {
    throw new Error(
      "--output must be an explicit absolute repository-external path",
    );
  }
  const resolvedOutput = path.resolve(configuredPath);
  const relativeOutput = path.relative(repositoryRoot, resolvedOutput);
  if (
    relativeOutput === "" ||
    (!relativeOutput.startsWith(`..${path.sep}`) && relativeOutput !== "..")
  ) {
    throw new Error("Production smoke evidence must remain outside the repository");
  }
  return resolvedOutput;
}

export function assertProductionAliasDeployment({
  expectedDeploymentId,
  productionHostname,
  linkedProject,
  deploymentMetadata,
  aliasMetadata,
}) {
  if (!/^dpl_[A-Za-z0-9]+$/u.test(expectedDeploymentId ?? "")) {
    throw new Error("Expected deployment ID is invalid");
  }
  if (
    typeof productionHostname !== "string" ||
    productionHostname.length === 0
  ) {
    throw new Error("Production hostname is invalid");
  }

  function ownerId(metadata) {
    return metadata?.ownerId ?? metadata?.team?.id ?? null;
  }

  function assertLinkedReadyProduction(metadata, source) {
    if (
      metadata?.id !== expectedDeploymentId ||
      metadata?.projectId !== linkedProject.projectId ||
      ownerId(metadata) !== linkedProject.orgId ||
      metadata?.name !== linkedProject.projectName ||
      metadata?.target !== "production" ||
      metadata?.readyState !== "READY" ||
      typeof metadata?.url !== "string" ||
      !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.vercel\.app$/iu.test(
        metadata.url,
      )
    ) {
      throw new Error(
        `${source} metadata does not prove the expected READY production deployment in the linked project`,
      );
    }
  }

  assertLinkedReadyProduction(deploymentMetadata, "deployment ID");
  assertLinkedReadyProduction(aliasMetadata, "production alias");
  if (aliasMetadata.url !== deploymentMetadata.url) {
    throw new Error(
      "Production alias and deployment ID resolved to different immutable URLs",
    );
  }
  if (
    !Array.isArray(aliasMetadata.alias) ||
    !aliasMetadata.alias.includes(productionHostname)
  ) {
    throw new Error(
      `Production alias metadata does not include ${productionHostname}`,
    );
  }

  return {
    deploymentId: expectedDeploymentId,
    productionHostname,
    projectId: linkedProject.projectId,
    orgId: linkedProject.orgId,
    target: deploymentMetadata.target,
    readyState: deploymentMetadata.readyState,
    immutableUrl: deploymentMetadata.url,
    exactAliasMatch: true,
  };
}

async function main() {
const argv = process.argv.slice(2);
const getOnly = argv.includes("--get-only");

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

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../../..");
const linkedProject = JSON.parse(
  readFileSync(path.join(repositoryRoot, ".vercel", "project.json"), "utf8"),
);
if (
  linkedProject.projectId !== "prj_b2brgXdwQpnpmEN6gc3vtNFm6m7a" ||
  linkedProject.orgId !== "team_fmzwEegB8SRsADNmwXkBUN34" ||
  linkedProject.projectName !== "safe-ai-site" ||
  linkedProject.settings?.rootDirectory !== "web"
) {
  throw new Error(".vercel/project.json is not the linked Safe AI web project");
}

function vercelCommand() {
  if (process.platform !== "win32") return { command: "vercel", prefix: [] };
  return {
    command: process.execPath,
    prefix: [
      path.join(
        process.env.APPDATA ?? "",
        "npm",
        "node_modules",
        "vercel",
        "dist",
        "vc.js",
      ),
    ],
  };
}

function sanitizedVercelEnvironment() {
  const environment = { ...process.env };
  delete environment.ANSWER_FIRST_PREVIEW_BYPASS_SECRET;
  delete environment.VERCEL_AUTOMATION_BYPASS_SECRET;
  delete environment.VERCEL_DEBUG;
  delete environment.DEBUG;
  return environment;
}

function redactVercelSecrets(value) {
  let redacted = value;
  for (const secret of [
    process.env.VERCEL_TOKEN,
    process.env.ANSWER_FIRST_PREVIEW_BYPASS_SECRET,
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
  ]) {
    if (secret) redacted = redacted.replaceAll(secret, "[REDACTED]");
  }
  return redacted;
}

function runVercelApi(endpoint) {
  return new Promise((resolve, reject) => {
    const executable = vercelCommand();
    const child = spawn(
      executable.command,
      [...executable.prefix, "api", endpoint],
      {
        cwd: repositoryRoot,
        env: sanitizedVercelEnvironment(),
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    let outputExceeded = false;
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      if (stdout.length + chunk.length > 4 * 1024 * 1024) {
        outputExceeded = true;
        child.kill();
        return;
      }
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      if (stderr.length < 64 * 1024) stderr += chunk;
    });
    child.once("error", (error) => {
      reject(
        new Error(
          `Unable to run authenticated Vercel metadata lookup: ${redactVercelSecrets(error.message)}`,
        ),
      );
    });
    child.once("close", (code) => {
      if (outputExceeded) {
        reject(new Error("Vercel metadata output exceeded the memory limit"));
        return;
      }
      if (code !== 0) {
        reject(
          new Error(
            `Vercel metadata lookup failed (${code ?? 1}): ${redactVercelSecrets(stderr).slice(-800)}`,
          ),
        );
        return;
      }
      resolve(stdout);
    });
  });
}

async function readDeploymentMetadata(identifier) {
  const endpoint = `/v13/deployments/${encodeURIComponent(
    identifier,
  )}?teamId=${encodeURIComponent(linkedProject.orgId)}`;
  const output = await runVercelApi(endpoint);
  try {
    return JSON.parse(output);
  } catch {
    throw new Error("Vercel returned invalid deployment metadata");
  }
}

// Both lookups are authenticated and read-only. Resolving the mutable
// production hostname independently prevents a syntactically valid stale ID
// from being accepted as the deployment currently serving production.
const [deploymentMetadata, productionAliasMetadata] = await Promise.all([
  readDeploymentMetadata(expectedDeploymentId),
  readDeploymentMetadata(baseUrl.hostname),
]);
const deploymentVerification = assertProductionAliasDeployment({
  expectedDeploymentId,
  productionHostname: baseUrl.hostname,
  linkedProject,
  deploymentMetadata,
  aliasMetadata: productionAliasMetadata,
});

const outputPath = resolveRepositoryExternalEvidencePath({
  configuredPath: option("output", undefined),
  repositoryRoot,
});
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

record(
  "deployment:production-alias-exact-match",
  deploymentVerification.exactAliasMatch,
  deploymentVerification,
);

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

function h1CountsByRenderMode(html) {
  const noscriptBlocks =
    html.match(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi) ?? [];
  const noScript = noscriptBlocks.reduce(
    (count, block) => count + h1Count(block),
    0,
  );
  const interactive = h1Count(
    html.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ""),
  );
  return { interactive, noScript };
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
  "/materials/safety-images",
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
  const h1ByMode = h1CountsByRenderMode(result.body);
  record(`${result.route}:http-200`, result.status === 200, {
    status: result.status,
    durationMs: result.durationMs,
    error: result.error,
  });
  record(
    `${result.route}:single-h1-per-render-mode`,
    h1ByMode.interactive === 1 &&
      (h1ByMode.noScript === 0 || h1ByMode.noScript === 1),
    h1ByMode,
  );
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
    requiredCopies: [
      "組織台帳は接続されていません",
      "現在はfail-closed",
    ],
    validReasons: [
      "authentication_not_configured",
      "authentication_required",
      "database_unavailable",
      "membership_required",
      "insufficient_role",
      "ledger_unavailable",
    ],
  },
  {
    route: "/signage/manage",
    requiredCopies: ["端末未登録・接続未確認"],
    validReasons: [],
  },
];

const educationProgressRedirect = await request("/education/progress");
record(
  "/education/progress:permanent-redirect",
  educationProgressRedirect.status === 308 &&
    educationProgressRedirect.headers.location === "/e-learning",
  {
    status: educationProgressRedirect.status,
    location: educationProgressRedirect.headers.location,
    error: educationProgressRedirect.error,
  },
);
const protectedGovernanceResults = await Promise.all(
  protectedGovernanceRoutes.map(({ route }) => request(route)),
);
for (const [index, result] of protectedGovernanceResults.entries()) {
  const expectation = protectedGovernanceRoutes[index];
  const robots = metaRobots(result.body);
  const renderedBody = withoutReactSsrMarkers(result.body);
  const matchedReason = expectation.validReasons.find((reason) =>
    renderedBody.includes(`接続状態: ${reason}`),
  );
  record(`${result.route}:http-200`, result.status === 200, {
    status: result.status,
    durationMs: result.durationMs,
    error: result.error,
  });
  record(
    `${result.route}:fail-closed-without-scope`,
    expectation.requiredCopies.every((copy) => renderedBody.includes(copy)) &&
      (expectation.validReasons.length === 0 || Boolean(matchedReason)),
    {
      requiredCopiesPresent: expectation.requiredCopies.map((copy) => ({
        copy,
        present: renderedBody.includes(copy),
      })),
      matchedReason: matchedReason ?? null,
    },
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
// Keep this list aligned with COMPACT_NAV_CATEGORIES. /resources remains a
// public, indexable feature reached through /features; it is intentionally not
// part of the compact one-click navigation contract.
const compactNavigationPaths = [
  "/risk",
  "/heat-illness-prevention",
  "/ky/paper",
  "/signage",
  "/materials/safety-images",
  "/tools/construction-calculators",
  "/chatbot",
  "/law-search",
  "/chemical-ra",
  "/laws",
  "/accident-news",
  "/training/visual-ky",
  "/education-certification",
  "/services/automation",
  "/safety-ai",
  "/search",
  "/features",
];
record(
  "home:compact-navigation-contract",
  compactNavigationPaths.length === 17 &&
    new Set(compactNavigationPaths).size === 17 &&
    !compactNavigationPaths.includes("/resources"),
  {
    expectedCount: 17,
    actualCount: compactNavigationPaths.length,
    uniqueCount: new Set(compactNavigationPaths).size,
    resourcesIncluded: compactNavigationPaths.includes("/resources"),
  },
);
for (const href of compactNavigationPaths) {
  record(`home:one-click:${href}`, home.body.includes(`href="${href}`), {
    href,
  });
}
const resourceDiscoveryResults = await Promise.all(
  ["/features"].map((route) => request(route)),
);
record(
  "resources:discoverable-from-site-navigation",
  resourceDiscoveryResults.some(
    (result) => result.status === 200 && result.body.includes('href="/resources"'),
  ),
  {
    routes: resourceDiscoveryResults.map((result) => ({
      route: result.route,
      status: result.status,
      linked: result.body.includes('href="/resources"'),
    })),
  },
);

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
record(
  "sitemap:resources-present",
  sitemapResult.body.includes("/resources</loc>"),
  { path: "/resources" },
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

if (getOnly) {
  record(
    "smoke:get-only-post-probes-skipped",
    true,
    {
      skipped: [
        "/api/chatbot",
        "/api/chemical-ra",
        "/api/automation-consult",
      ],
    },
    "informational",
  );
} else {
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
}

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
const chatbotBrowserRequests = [];
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
  const requestUrl = new URL(browserRequest.url());
  if (
    requestUrl.pathname === "/api/chatbot/stream" &&
    browserRequest.method() === "POST"
  ) {
    let body = null;
    try {
      body = browserRequest.postDataJSON();
    } catch {
      // The checks below fail closed when a JSON body cannot be inspected.
    }
    chatbotBrowserRequests.push({
      body,
      urlHasQuery: Boolean(requestUrl.search),
    });
  }
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
      mailDraftFormCount: document.querySelectorAll(
        'main form[method="post"][action="/contact/automation-email/draft"]',
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
      compactNavigationPaths.every((href) => snapshot.allHrefs.includes(href)),
      {
        missing: compactNavigationPaths.filter(
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
    const syntheticLabelPattern = /架空の学習例/;
    record(
      `${prefix}:synthetic-labelled`,
      syntheticLabelPattern.test(snapshot.bodyText),
      { labelPresent: syntheticLabelPattern.test(snapshot.bodyText) },
    );
  }
  if (target.route === "/services/automation") {
    const emailPattern =
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
    record(
      `${prefix}:mail-client-no-pii-form`,
      snapshot.bodyText.includes("メール相談受付中") &&
        snapshot.bodyText.includes(
          "Webフォームへ相談本文を入力する方式ではありません",
        ) &&
        snapshot.mainFormCount === 1 &&
        snapshot.piiInputCount === 0 &&
        snapshot.submitButtonCount === 1 &&
        snapshot.readonlyTemplateCount > 0 &&
        snapshot.mailDraftFormCount === 1 &&
        !emailPattern.test(snapshot.bodyText),
      {
        mailClientLabel: snapshot.bodyText.includes("メール相談受付中"),
        webFormDisabledCopy: snapshot.bodyText.includes(
          "Webフォームへ相談本文を入力する方式ではありません",
        ),
        mainFormCount: snapshot.mainFormCount,
        piiInputCount: snapshot.piiInputCount,
        submitButtonCount: snapshot.submitButtonCount,
        readonlyTemplateCount: snapshot.readonlyTemplateCount,
        mailDraftFormCount: snapshot.mailDraftFormCount,
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

if (!getOnly) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(new URL("/chatbot", baseUrl).href, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  const sendChatbotQuestion = async (question) => {
    const answers = page.locator("[data-chatbot-answer]");
    const answerCount = await answers.count();
    const composer = page.locator("[data-chatbot-composer]");
    await composer.locator("textarea").fill(question);
    const responsePromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/chatbot/stream" &&
        response.request().method() === "POST",
    );
    await composer.getByRole("button", { name: "送信" }).click();
    const response = await responsePromise;
    const answer = answers.nth(answerCount);
    await answer
      .locator("[data-chatbot-structured-answer]")
      .waitFor({ state: "visible", timeout: 30_000 });
    return { answer, response };
  };

  const broad = await sendChatbotQuestion(
    "電気の点検する時に必要な資格ある？",
  );
  const broadText = await broad.answer.innerText();
  const broadQuickReplies = await broad.answer
    .locator("[data-chatbot-quick-reply]")
    .allTextContents();
  const broadSourceDetails = broad.answer.locator(
    "[data-chatbot-source-details]",
  );
  const broadSourceSummary = await broadSourceDetails
    .locator("summary")
    .innerText();
  const broadUseful =
    /盤の外.*一律の国家資格が必要とは限りません/u.test(broadText) &&
    /盤を開け.*測定/u.test(broadText) &&
    /電気工事士.*特別教育/u.test(broadText) &&
    /電気主任技術者.*保安監督/u.test(broadText) &&
    !/酸欠|有機溶剤|石綿|玉掛け/u.test(broadText);
  record("chatbot:electric-broad-answer-first", broadUseful, {
    hasVisualBranch: /盤の外/u.test(broadText),
    hasMeasurementBranch: /盤を開け.*測定/u.test(broadText),
    distinguishesSchemes: /電気工事士.*特別教育/u.test(broadText),
    distinguishesChiefEngineer: /電気主任技術者.*保安監督/u.test(
      broadText,
    ),
  });
  record(
    "chatbot:electric-broad-quick-replies",
    JSON.stringify(broadQuickReplies.map((value) => value.trim())) ===
      JSON.stringify([
        "見るだけ",
        "盤を開けて測定",
        "配線・充電部を扱う",
      ]),
    { count: broadQuickReplies.length },
  );
  record(
    "chatbot:electric-source-disclosure",
    /^根拠 \d+件$/u.test(broadSourceSummary.trim()) &&
      !(await broadSourceDetails.evaluate((element) => element.open)),
    { summary: broadSourceSummary.trim() },
  );
  await broad.answer.getByRole("button", { name: "違う" }).click();
  const mismatchFocused = await page
    .locator("[data-chatbot-composer] textarea")
    .evaluate((element) => element === document.activeElement);
  record(
    "chatbot:feedback-mismatch-keeps-conversation",
    mismatchFocused &&
      (await broad.answer.locator("[data-chatbot-quick-reply]").count()) === 0,
    { mismatchFocused },
  );
  await page.screenshot({
    path: path.join(screenshotDirectory, "chatbot-electric-broad-390.png"),
    fullPage: false,
    animations: "disabled",
  });

  const startCheck = await sendChatbotQuestion("作業開始前点検");
  const startCheckText = await startCheck.answer.innerText();
  record(
    "chatbot:electric-start-check-context",
    /資格名ではなく.*手順|資格名ではなく.*時点/u.test(startCheckText) &&
      /盤を開け.*充電中/u.test(startCheckText) &&
      !/定期自主検査|性能検査|酸欠|有機溶剤|石綿|玉掛け/u.test(
        startCheckText,
      ),
    {
      explainsProcedure: /資格名ではなく/u.test(startCheckText),
      retainsElectricalWork: /盤を開け.*充電中/u.test(startCheckText),
    },
  );
  await page.screenshot({
    path: path.join(
      screenshotDirectory,
      "chatbot-electric-start-check-390.png",
    ),
    fullPage: false,
    animations: "disabled",
  });

  await page.getByRole("button", { name: "新しい相談" }).click();
  const specialEducation = await sendChatbotQuestion(
    "電気作業の特別教育について教えて",
  );
  const specialEducationText = await specialEducation.answer.innerText();
  record(
    "chatbot:electric-special-education",
    /国家資格の免状ではありません/u.test(specialEducationText) &&
      /高圧・特別高圧.*敷設・点検・修理・操作/u.test(
        specialEducationText,
      ) &&
      /低圧.*敷設・修理.*露出充電部/u.test(specialEducationText) &&
      /電気工事士/u.test(specialEducationText),
    {
      distinguishesLicense: /国家資格の免状ではありません/u.test(
        specialEducationText,
      ),
      explainsHighVoltage: /高圧・特別高圧/u.test(specialEducationText),
      explainsLowVoltage: /低圧/u.test(specialEducationText),
    },
  );
  await page.screenshot({
    path: path.join(
      screenshotDirectory,
      "chatbot-electric-special-education-390.png",
    ),
    fullPage: false,
    animations: "disabled",
  });

  const browserChatBoundary = await page.evaluate(() => {
    const composer = document.querySelector("[data-chatbot-composer]");
    const composerFrame = composer?.firstElementChild;
    const bottomNav = document.querySelector('[data-mobile-nav="bottom"]');
    const cookieControl = [...document.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "Cookie設定",
    );
    const rect = (element) => element?.getBoundingClientRect() ?? null;
    const overlaps = (left, right) =>
      Boolean(
        left &&
          right &&
          left.width > 0 &&
          left.height > 0 &&
          right.width > 0 &&
          right.height > 0 &&
          left.left < right.right &&
          left.right > right.left &&
          left.top < right.bottom &&
          left.bottom > right.top,
      );
    const composerRect = rect(composer);
    const frameRect = rect(composerFrame);
    return {
      composerWithinViewport: Boolean(
        composerRect &&
          composerRect.left >= 0 &&
          composerRect.right <= innerWidth &&
          composerRect.top >= 0 &&
          composerRect.bottom <= innerHeight,
      ),
      bottomNavOverlap: overlaps(frameRect, rect(bottomNav)),
      cookieControlOverlap: overlaps(frameRect, rect(cookieControl)),
      storageContainsQuestion: [localStorage, sessionStorage].some((storage) =>
        Array.from({ length: storage.length }, (_, index) => {
          const key = storage.key(index);
          return `${key ?? ""}:${key ? storage.getItem(key) ?? "" : ""}`;
        })
          .join("\n")
          .includes("電気の点検する時に必要な資格ある？"),
      ),
    };
  });
  const safeStructuredRequests =
    chatbotBrowserRequests.length === 3 &&
    chatbotBrowserRequests.every(
      ({ body, urlHasQuery }) =>
        body &&
        !("history" in body) &&
        urlHasQuery === false,
    ) &&
    chatbotBrowserRequests[1]?.body?.context?.topicDomain === "electrical";
  const aiUseProvenFalse = [
    broad.response,
    startCheck.response,
    specialEducation.response,
  ].every(
    (response) =>
      response.headers()["x-ai-used"] === "false" ||
      (response.headers()["x-ai-used"] === undefined &&
        response.headers()["x-cache-hit"] === "true"),
  );
  record(
    "chatbot:memory-only-structured-context",
    safeStructuredRequests &&
      !browserChatBoundary.storageContainsQuestion &&
      aiUseProvenFalse,
    {
      requestCount: chatbotBrowserRequests.length,
      rawHistorySent: chatbotBrowserRequests.some(({ body }) =>
        Boolean(body && "history" in body),
      ),
      rawQuestionStored: browserChatBoundary.storageContainsQuestion,
      externalAiUsed: !aiUseProvenFalse,
    },
  );
  record(
    "chatbot:composer-mobile-boundary",
    browserChatBoundary.composerWithinViewport &&
      !browserChatBoundary.bottomNavOverlap &&
      !browserChatBoundary.cookieControlOverlap,
    browserChatBoundary,
  );
} else {
  record(
    "chatbot:electric-browser-flow-skipped-get-only",
    true,
    { skipped: true },
    "informational",
  );
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
    compactNavigationPaths.every((href) =>
      noJsSnapshot.flagshipLinks.includes(href),
    ),
  {
    status: noJsResponse?.status() ?? null,
    h1Count: noJsSnapshot.h1Count,
    mainCount: noJsSnapshot.mainCount,
    missing: compactNavigationPaths.filter(
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
  deploymentVerification,
  mode: getOnly
    ? "production-smoke-get-only"
    : "production-smoke-fixed-non-pii-fail-closed-probes",
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
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
