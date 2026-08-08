#!/usr/bin/env node

/**
 * Performance-budget gate.
 *
 * Input is an immutable Lighthouse session created by
 * best-in-class-lighthouse.mjs. The gate verifies every referenced raw hash
 * before it calculates budgets, so a rewritten report cannot silently become
 * the adopted CI value.
 */
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  attributeClientScripts,
  collectBuildRouteInventory,
  evaluateLighthouseScoreTargets,
  evaluatePerformanceBudget,
  lighthouseNoindexSeoPolicyCompliant,
  median,
  validateLighthouseReport,
} from "./performance-budget-core.mjs";

globalThis.AsyncLocalStorage ??= AsyncLocalStorage;
const require = createRequire(import.meta.url);

const repositoryRoot = resolve(process.cwd(), "..");
const DEFAULT_SERVICE_FIRST_EVIDENCE =
  "../docs/audits/evidence/service-first-copy-reduction-2026-08-02";
const REQUIRED_NOINDEX_PAGE_IDS = new Set(["heat-hub"]);

export function resolvePerformanceBudgetRuntimePaths({
  env = process.env,
  cwd = process.cwd(),
} = {}) {
  return {
    evidenceRoot: resolve(
      cwd,
      env.LIGHTHOUSE_EVIDENCE_ROOT ??
        `${DEFAULT_SERVICE_FIRST_EVIDENCE}/lighthouse-runs`,
    ),
    outputPath: resolve(
      cwd,
      env.PERFORMANCE_BUDGET_OUTPUT ??
        `${DEFAULT_SERVICE_FIRST_EVIDENCE}/performance-budget/performance-budget-result.json`,
    ),
    baseUrl: env.PERFORMANCE_BUDGET_BASE_URL ?? "http://127.0.0.1:3320",
  };
}

const configPath = resolve(
  process.env.PERFORMANCE_BUDGET_CONFIG ?? "config/performance-budgets.json",
);
const { evidenceRoot, outputPath, baseUrl } =
  resolvePerformanceBudgetRuntimePaths();
const budget = JSON.parse(readFileSync(configPath, "utf8"));

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function loadSummaryCandidate(path) {
  try {
    return {
      path,
      mtimeMs: statSync(path).mtimeMs,
      summary: JSON.parse(readFileSync(path, "utf8")),
    };
  } catch {
    return null;
  }
}

function sourceBuildIdentity(summary) {
  const sourceInventorySha256 =
    summary?.provenance?.sourceInventorySha256;
  const buildId = summary?.provenance?.buildId;
  if (
    typeof sourceInventorySha256 !== "string" ||
    sourceInventorySha256.length === 0 ||
    typeof buildId !== "string" ||
    buildId.length === 0
  ) {
    return null;
  }
  return {
    sourceInventorySha256,
    buildId,
    key: `${sourceInventorySha256}\u0000${buildId}`,
  };
}

function methodIdentity(summary) {
  const method = summary?.method;
  if (!method || method.concurrentLighthouseRuns !== 1) return null;
  return JSON.stringify(method);
}

function inspectCandidate(candidate, expectedRoutes) {
  const { summary } = candidate;
  if (summary?.runKind !== "final") return null;
  const identity = sourceBuildIdentity(summary);
  const methodKey = methodIdentity(summary);
  if (!identity || !methodKey) return null;

  const rows = (summary.medians ?? []).filter(
    (row) => row.profile === "mobile",
  );
  const rowPages = rows.map((row) => row.page);
  if (
    rows.length === 0 ||
    new Set(rowPages).size !== rowPages.length ||
    rowPages.some((page) => !expectedRoutes.has(page))
  ) {
    return null;
  }

  const relevantRuns = (summary.runs ?? []).filter(
    (run) =>
      run.adopted &&
      run.success &&
      run.profile === "mobile" &&
      expectedRoutes.has(run.pageId),
  );
  const measurementIds = relevantRuns.map((run) => run.measurementId);
  if (new Set(measurementIds).size !== measurementIds.length) return null;

  for (const row of rows) {
    const routeRuns = relevantRuns.filter((run) => run.pageId === row.page);
    if (
      routeRuns.length === 0 ||
      routeRuns.length !== Number(row.adoptedRunCount)
    ) {
      return null;
    }
    if (
      routeRuns.some(
        (run) =>
          run.runKind !== "final" ||
          run.route !== row.path ||
          run.sourceInventorySha256 !== identity.sourceInventorySha256 ||
          run.buildId !== identity.buildId,
      )
    ) {
      return null;
    }
  }

  return {
    ...candidate,
    identity,
    methodKey,
    rows,
    relevantRuns,
  };
}

function composeSelection(assignments, expectedRoutes) {
  const primary = assignments[0].candidate;
  const identity = primary.identity;
  const summaryPaths = assignments.map(({ candidate }) => candidate.path);
  const sessionIds = assignments.map(
    ({ candidate }) => candidate.summary.sessionId,
  );
  const medians = assignments.flatMap(({ candidate, routes }) =>
    candidate.rows.filter((row) => routes.has(row.page)),
  );
  const runs = assignments.flatMap(({ candidate, routes }) =>
    candidate.relevantRuns.filter((run) => routes.has(run.pageId)),
  );
  const measurementIds = runs.map((run) => run.measurementId);
  if (
    medians.length !== expectedRoutes.size ||
    new Set(medians.map((row) => row.page)).size !== expectedRoutes.size ||
    new Set(measurementIds).size !== measurementIds.length
  ) {
    throw new Error("Lighthouse composite has duplicate or missing evidence");
  }

  if (assignments.length === 1) {
    return {
      summary: primary.summary,
      summaryPaths,
      identity,
      composite: false,
    };
  }

  const summary = {
    ...primary.summary,
    sessionId: `composite:${sessionIds.join("+")}`,
    executionsComplete: true,
    expectedRunCount: runs.length,
    successfulRunCount: runs.length,
    adoptedRunCount: runs.length,
    runs,
    medians,
    executionFailures: assignments.flatMap(
      ({ candidate }) => candidate.summary.executionFailures ?? [],
    ),
    targetFailures: assignments.flatMap(
      ({ candidate }) => candidate.summary.targetFailures ?? [],
    ),
    provenance: {
      ...primary.summary.provenance,
      sourceInventorySha256: identity.sourceInventorySha256,
      buildId: identity.buildId,
    },
    composition: {
      sessionIds,
      summaryPaths,
      routeSources: Object.fromEntries(
        assignments.flatMap(({ candidate, routes }) =>
          [...routes].map((route) => [route, candidate.summary.sessionId]),
        ),
      ),
    },
  };
  return { summary, summaryPaths, identity, composite: true };
}

export function selectFinalLighthouseComposite(candidates, expectedRouteIds) {
  const expectedRoutes = new Set(expectedRouteIds);
  if (expectedRoutes.size === 0) {
    throw new Error("Performance-budget route set is empty");
  }
  const inspected = candidates
    .map((candidate) => inspectCandidate(candidate, expectedRoutes))
    .filter(Boolean)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  const groups = new Map();
  for (const candidate of inspected) {
    const key = `${candidate.identity.key}\u0000${candidate.methodKey}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(candidate);
  }

  for (const group of groups.values()) {
    const completeSingle = group.find(
      (candidate) =>
        candidate.summary.executionsComplete === true &&
        candidate.rows.length === expectedRoutes.size &&
        candidate.rows.every((row) => expectedRoutes.has(row.page)),
    );
    if (completeSingle) {
      return composeSelection(
        [{ candidate: completeSingle, routes: new Set(expectedRoutes) }],
        expectedRoutes,
      );
    }

    const assignedRoutes = new Set();
    const assignments = [];
    for (const candidate of group) {
      const routes = new Set(
        candidate.rows
          .map((row) => row.page)
          .filter((page) => !assignedRoutes.has(page)),
      );
      if (routes.size === 0) continue;
      for (const route of routes) assignedRoutes.add(route);
      assignments.push({ candidate, routes });
      if (assignedRoutes.size === expectedRoutes.size) break;
    }
    if (
      assignments.length > 1 &&
      assignedRoutes.size === expectedRoutes.size &&
      [...expectedRoutes].every((route) => assignedRoutes.has(route))
    ) {
      return composeSelection(assignments, expectedRoutes);
    }
  }

  throw new Error(
    "No complete final Lighthouse summary or same-source/build, same-method composite covers every performance-budget route",
  );
}

function latestFinalSummary() {
  const expectedRoutes = Object.keys(budget.routes);
  if (process.env.PERFORMANCE_LIGHTHOUSE_SUMMARY) {
    const path = resolve(process.env.PERFORMANCE_LIGHTHOUSE_SUMMARY);
    const candidate = loadSummaryCandidate(path);
    if (!candidate) {
      throw new Error(`Unable to read Lighthouse summary: ${path}`);
    }
    return selectFinalLighthouseComposite([candidate], expectedRoutes);
  }
  const root = resolve(evidenceRoot, "final");
  if (!existsSync(root)) {
    throw new Error(`final Lighthouse evidence directory not found: ${root}`);
  }
  const candidates = readdirSync(root)
    .map((name) => resolve(root, name, "lighthouse-summary.json"))
    .filter(existsSync)
    .map(loadSummaryCandidate)
    .filter(Boolean);
  if (candidates.length === 0) {
    throw new Error("No final Lighthouse summary was found");
  }
  return selectFinalLighthouseComposite(candidates, expectedRoutes);
}

function artifactPath(repoRelativePath) {
  const absolute = resolve(repositoryRoot, repoRelativePath);
  if (!absolute.startsWith(repositoryRoot)) {
    throw new Error("Lighthouse artifact escaped the repository");
  }
  return absolute;
}

async function main() {
const selection = latestFinalSummary();
const { summary, summaryPaths } = selection;
const parsedPerformanceBaseUrl = new URL(baseUrl);
if (summary.runKind !== "final" || !summary.executionsComplete) {
  throw new Error("Performance budgets require a complete final session");
}
if (summary.method?.concurrentLighthouseRuns !== 1) {
  throw new Error("Concurrent Lighthouse evidence is not eligible");
}

const rawByMeasurement = new Map();
for (const run of summary.runs ?? []) {
  if (!run.adopted || !run.success) continue;
  const raw = run.artifacts?.find((item) =>
    item.name.endsWith(".report.json"),
  );
  if (!raw) throw new Error(`Missing raw report for ${run.measurementId}`);
  const absolute = artifactPath(raw.path);
  if (!existsSync(absolute) || sha256File(absolute) !== raw.sha256) {
    throw new Error(`Raw report hash mismatch: ${raw.path}`);
  }
  const report = JSON.parse(readFileSync(absolute, "utf8"));
  if (typeof run.route !== "string" || !run.route.startsWith("/")) {
    throw new Error(`Invalid configured route for ${run.measurementId}`);
  }
  const expectedUrl = new URL(run.route, parsedPerformanceBaseUrl);
  if (expectedUrl.origin !== parsedPerformanceBaseUrl.origin) {
    throw new Error(`Configured route escaped the audit origin: ${run.route}`);
  }
  const validation = validateLighthouseReport(report, {
    expectedUrl: expectedUrl.href,
  });
  if (!validation.valid) {
    throw new Error(
      `Invalid raw Lighthouse report for ${run.measurementId}: ${validation.failures.join(", ")}`,
    );
  }
  rawByMeasurement.set(run.measurementId, report);
}

const mobileMedians = (summary.medians ?? []).filter(
  (row) => row.profile === "mobile",
);
if (mobileMedians.length !== Object.keys(budget.routes).length) {
  throw new Error(
    `Expected ${Object.keys(budget.routes).length} mobile routes; got ${mobileMedians.length}`,
  );
}

function canonicalRequestUrl(value) {
  try {
    const url = new URL(value);
    return `${url.pathname}${url.search}`;
  } catch {
    return value;
  }
}

const scriptsByRoute = new Map();
for (const row of mobileMedians) {
  const routeRuns = (summary.runs ?? []).filter(
    (run) =>
      run.adopted &&
      run.success &&
      run.profile === "mobile" &&
      run.pageId === row.page,
  );
  const scriptMaps = routeRuns.map((run) => {
    const report = rawByMeasurement.get(run.measurementId);
    const requests = report?.audits?.["network-requests"]?.details?.items ?? [];
    return new Map(
      requests
        .filter((item) => item.resourceType === "Script")
        .map((item) => [
          canonicalRequestUrl(item.url),
          Number(item.transferSize ?? 0),
        ]),
    );
  });
  scriptsByRoute.set(row.page, scriptMaps);
}

const scriptAttribution = attributeClientScripts(
  scriptsByRoute,
  budget.layoutCohorts,
);
const { commonClientJsBytes, commonScriptUrls } = scriptAttribution;

const routeActuals = {};
const lighthouseScoreFailures = [];
for (const row of mobileMedians) {
  const routeRuns = (summary.runs ?? []).filter(
    (run) =>
      run.adopted &&
      run.success &&
      run.profile === "mobile" &&
      run.pageId === row.page,
  );
  const reports = routeRuns.map((run) =>
    rawByMeasurement.get(run.measurementId),
  );
  const mainThreadGroup = (report, group) =>
    report?.audits?.["mainthread-work-breakdown"]?.details?.items?.find(
      (item) => item.group === group,
    )?.duration ?? 0;
  const phaseValue = (report, subpart) =>
    report?.audits?.["lcp-breakdown-insight"]?.details?.items?.[0]?.items?.find(
      (item) => item.subpart === subpart,
    )?.duration ?? 0;
  const renderBlockingBytes = (report) =>
    (
      report?.audits?.["render-blocking-insight"]?.details?.items ?? []
    ).reduce(
      (total, item) =>
        total + Number(item.totalBytes ?? item.transferSize ?? 0),
      0,
    );
  const lighthouseScores = {
    performance: median(
      reports.map((report) => report.categories.performance.score * 100),
    ),
    accessibility: median(
      reports.map((report) => report.categories.accessibility.score * 100),
    ),
    bestPractices: median(
      reports.map(
        (report) => report.categories["best-practices"].score * 100,
      ),
    ),
    seo: median(reports.map((report) => report.categories.seo.score * 100)),
  };
  const seoPolicyCompliant =
    REQUIRED_NOINDEX_PAGE_IDS.has(row.page) &&
    reports.every(lighthouseNoindexSeoPolicyCompliant);
  const scoreEvaluation = evaluateLighthouseScoreTargets({
    profile: "mobile",
    scores: lighthouseScores,
    seoPolicyCompliant,
  });
  lighthouseScoreFailures.push(
    ...scoreEvaluation.failures.map((failure) => ({
      ...failure,
      id: `${row.page}:lighthouse-score:${failure.id}`,
      category: failure.id,
    })),
  );
  routeActuals[row.page] = {
    path: row.path,
    totalClientJsBytes: row.javascriptTransferredBytes,
    routeSpecificJsBytes: scriptAttribution.routeSpecificJsBytes.get(row.page),
    routePayloadBytes: row.routePayloadBytes,
    cssBytes: row.cssTransferredBytes,
    lcpMs: row.lanternSimulatedLcpMs,
    chromeObservedLcpMs: row.chromeObservedLcpMs,
    fcpMs: row.fcpMs,
    chromeObservedFcpMs: row.chromeObservedFcpMs,
    ttfbMs: row.ttfbMs,
    cls: row.cls,
    tbtMs: row.tbtMs,
    lighthouseScores,
    seoPolicyCompliant,
    mainThreadWorkMs: row.mainThreadWorkMs,
    bootupTimeMs: row.bootupTimeMs,
    lcpPhasesMs: {
      ttfb: median(reports.map((report) => phaseValue(report, "timeToFirstByte"))),
      loadDelay: median(reports.map((report) => phaseValue(report, "resourceLoadDelay"))),
      resourceLoad: median(reports.map((report) => phaseValue(report, "resourceLoadDuration"))),
      renderDelay: median(reports.map((report) => phaseValue(report, "elementRenderDelay"))),
    },
    scriptEvaluationMs: median(
      reports.map((report) => mainThreadGroup(report, "scriptEvaluation")),
    ),
    styleLayoutMs: median(
      reports.map((report) => mainThreadGroup(report, "styleLayout")),
    ),
    parseHtmlCssMs: median(
      reports.map((report) => mainThreadGroup(report, "parseHTML")),
    ),
    renderBlockingCssBytes: median(reports.map(renderBlockingBytes)),
    fontTransferredBytes: median(
      reports.map((report) =>
        (
          report?.audits?.["network-requests"]?.details?.items ?? []
        )
          .filter((item) => item.resourceType === "Font")
          .reduce((total, item) => total + Number(item.transferSize ?? 0), 0),
      ),
    ),
    hydration: {
      explicitTraceMarkerAvailable: false,
      conservativeUpperBound: "scriptEvaluationMs",
    },
    serverTiming: {
      exposedToLighthouse: false,
      fallbackMetric: "ttfbMs",
    },
    adoptedRuns: row.adoptedRunCount,
  };
}

const sitemapResponse = await fetch(new URL("/sitemap.xml", baseUrl), {
  signal: AbortSignal.timeout(30000),
});
if (!sitemapResponse.ok) {
  throw new Error(`sitemap.xml returned ${sitemapResponse.status}`);
}
const sitemapBody = await sitemapResponse.text();
const rootSitemapUrls = (sitemapBody.match(/<loc>/g) ?? []).length;
const sitemapIndexResponse = await fetch(
  new URL("/sitemap-index.xml", baseUrl),
  { signal: AbortSignal.timeout(30000) },
);
if (!sitemapIndexResponse.ok) {
  throw new Error(`sitemap-index.xml returned ${sitemapIndexResponse.status}`);
}
const sitemapIndexBody = await sitemapIndexResponse.text();
const childSitemapUrls = [
  ...sitemapIndexBody.matchAll(/<loc>([^<]+)<\/loc>/g),
].map((match) => match[1].replaceAll("&amp;", "&"));
if (childSitemapUrls.length === 0) {
  throw new Error("sitemap-index.xml has no child sitemap");
}
const indexedUrls = new Set();
for (const child of childSitemapUrls) {
  const publicUrl = new URL(child);
  const response = await fetch(new URL(`${publicUrl.pathname}${publicUrl.search}`, baseUrl), {
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    throw new Error(`${publicUrl.pathname} returned ${response.status}`);
  }
  const xml = await response.text();
  for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    indexedUrls.add(match[1].replaceAll("&amp;", "&"));
  }
}
const sitemapUrlCount = indexedUrls.size;
const prerenderManifest = JSON.parse(
  readFileSync(resolve(".next/prerender-manifest.json"), "utf8"),
);
const appPathsManifest = JSON.parse(
  readFileSync(resolve(".next/server/app-paths-manifest.json"), "utf8"),
);
const appPathRoutesManifest = JSON.parse(
  readFileSync(resolve(".next/app-path-routes-manifest.json"), "utf8"),
);
const buildRouteInventory = await collectBuildRouteInventory({
  appPathsManifest,
  appPathRoutesManifest,
  loadCompiledPage(bundlePath) {
    return require(resolve(".next/server", bundlePath));
  },
});
const prerenderManifestRouteCount = Object.keys(
  prerenderManifest.routes ?? {},
).length;
const staticPageCount = buildRouteInventory.concreteRouteCount;

const budgetEvaluation = evaluatePerformanceBudget({
  budget,
  commonClientJsBytes,
  routeActuals,
  inventory: { sitemapUrlCount, staticPageCount },
  lighthouseScoreFailures,
});
const { failures, sharedActuals } = budgetEvaluation;
const warnings = [];

if ((summary.executionFailures ?? []).length > 0) {
  warnings.push({
    id: "execution-failures-excluded",
    count: summary.executionFailures.length,
    note:
      "Failed attempts were not adopted. The complete route/profile sample is composed only of successful retry artifacts whose hashes were verified.",
  });
}
if ((summary.targetFailures ?? []).length > 0) {
  warnings.push({
    id: "lighthouse-product-targets",
    note:
      "Raw Lighthouse score targets are hard-gated; this warning retains runner-level score and metric diagnostics.",
    targetFailures: summary.targetFailures,
  });
}

const result = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  accepted: failures.length === 0,
  safetyGatePrecedence:
    "This budget is a secondary gate and never overrides a failed safety, privacy, legal, chemical, qualification, or weather gate.",
  inputs: {
    configPath,
    summaryPath: summaryPaths[0],
    summarySha256: sha256File(summaryPaths[0]),
    summaryPaths,
    summarySha256s: summaryPaths.map((path) => ({
      path,
      sha256: sha256File(path),
    })),
    lighthouseSessionId: summary.sessionId,
    lighthouseSessionIds:
      summary.composition?.sessionIds ?? [summary.sessionId],
    compositeSession: selection.composite,
    sourceBuildIdentity: {
      sourceInventorySha256: selection.identity.sourceInventorySha256,
      buildId: selection.identity.buildId,
    },
    minimumRuns: budget.method.minimumRuns,
    aggregation: "median",
  },
  actual: {
    commonClientJsBytes,
    commonCssBytes: sharedActuals.commonCssBytes,
    renderBlockingCssBytes: sharedActuals.renderBlockingCssBytes,
    commonScriptUrls: [...commonScriptUrls],
    layoutCohorts: scriptAttribution.cohortActuals,
    routes: routeActuals,
    inventory: {
      sitemapUrlCount,
      childSitemapCount: childSitemapUrls.length,
      legacyRootSitemapUrls: rootSitemapUrls,
      staticPageCount,
      staticPageCountMethod: "compiled-app-page-route-inventory",
      prerenderManifestRouteCount,
      pageDefinitionCount: buildRouteInventory.pageDefinitionCount,
      dynamicPageDefinitionCount:
        buildRouteInventory.dynamicPageDefinitionCount,
      generatedRouteCount: buildRouteInventory.generatedRouteCount,
      generatedRoutesByPattern:
        buildRouteInventory.generatedRoutesByPattern,
    },
  },
  failures,
  warnings,
};
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, {
  encoding: "utf8",
  flag: "wx",
});
process.stdout.write(
  `${JSON.stringify(
    {
      outputPath,
      accepted: result.accepted,
      commonClientJsBytes,
      commonCssBytes: sharedActuals.commonCssBytes,
      renderBlockingCssBytes: sharedActuals.renderBlockingCssBytes,
      routeCount: Object.keys(routeActuals).length,
      sitemapUrlCount,
      childSitemapCount: childSitemapUrls.length,
      staticPageCount,
      failureCount: failures.length,
      warningCount: warnings.length,
    },
    null,
    2,
  )}\n`,
);
if (!result.accepted) process.exitCode = 1;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
