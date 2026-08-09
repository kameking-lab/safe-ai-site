export function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

const REQUIRED_LIGHTHOUSE_NUMBERS = [
  [
    "categories.performance.score",
    (report) => report?.categories?.performance?.score,
    1,
  ],
  [
    "categories.accessibility.score",
    (report) => report?.categories?.accessibility?.score,
    1,
  ],
  [
    "categories.best-practices.score",
    (report) => report?.categories?.["best-practices"]?.score,
    1,
  ],
  ["categories.seo.score", (report) => report?.categories?.seo?.score, 1],
  [
    "audits.largest-contentful-paint.numericValue",
    (report) => report?.audits?.["largest-contentful-paint"]?.numericValue,
  ],
  [
    "audits.first-contentful-paint.numericValue",
    (report) => report?.audits?.["first-contentful-paint"]?.numericValue,
  ],
  [
    "audits.cumulative-layout-shift.numericValue",
    (report) => report?.audits?.["cumulative-layout-shift"]?.numericValue,
  ],
  [
    "audits.total-blocking-time.numericValue",
    (report) => report?.audits?.["total-blocking-time"]?.numericValue,
  ],
];

function finiteNonNegative(value) {
  return Number.isFinite(value) && value >= 0;
}

function canonicalAuditUrl(value) {
  if (typeof value !== "string" || value.trim() !== value || value === "") {
    return null;
  }
  try {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      return null;
    }
    return {
      origin: url.origin,
      route: `${url.pathname}${url.search}`,
    };
  } catch {
    return null;
  }
}

function sameAuditDestination(actual, expected) {
  return actual.origin === expected.origin && actual.route === expected.route;
}

/**
 * Return true only for the intentional noindex exception used by the heat hub:
 * every weighted SEO failure must be `is-crawlable`, and a zero SEO score can
 * never be excused as policy compliance.
 */
export function lighthouseNoindexSeoPolicyCompliant(report) {
  const seoScore = report?.categories?.seo?.score;
  const auditRefs = report?.categories?.seo?.auditRefs;
  if (
    !(Number.isFinite(seoScore) && seoScore > 0) ||
    !Array.isArray(auditRefs)
  ) {
    return false;
  }
  const failedAuditIds = auditRefs
    .filter(
      (reference) =>
        reference?.weight > 0 && report?.audits?.[reference.id]?.score !== 1,
    )
    .map((reference) => reference.id);
  return failedAuditIds.length === 1 && failedAuditIds[0] === "is-crawlable";
}

/**
 * Evaluate the Lighthouse product score contract independently from optional
 * metric diagnostics. These failures are release failures even when callers
 * choose not to enforce CLS/TBT diagnostics locally.
 */
export function evaluateLighthouseScoreTargets({
  profile,
  scores,
  seoPolicyCompliant = false,
}) {
  const failures = [];

  function requireFiniteScore(id, value) {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      failures.push({
        id,
        actual: Number.isFinite(value) ? value : null,
        reason: "invalid-score",
      });
      return false;
    }
    return true;
  }

  const performanceValid = requireFiniteScore(
    "performance",
    scores?.performance,
  );
  const accessibilityValid = requireFiniteScore(
    "accessibility",
    scores?.accessibility,
  );
  const bestPracticesValid = requireFiniteScore(
    "best-practices",
    scores?.bestPractices,
  );
  const seoValid = requireFiniteScore("seo", scores?.seo);

  if (profile === "mobile" && performanceValid && scores.performance < 90) {
    failures.push({
      id: "performance",
      actual: scores.performance,
      minimum: 90,
    });
  }
  if (accessibilityValid && scores.accessibility !== 100) {
    failures.push({
      id: "accessibility",
      actual: scores.accessibility,
      expected: 100,
    });
  }
  if (bestPracticesValid && scores.bestPractices !== 100) {
    failures.push({
      id: "best-practices",
      actual: scores.bestPractices,
      expected: 100,
    });
  }
  if (
    seoValid &&
    scores.seo !== 100 &&
    !(seoPolicyCompliant === true && scores.seo > 0)
  ) {
    failures.push({ id: "seo", actual: scores.seo, expected: 100 });
  }

  return { valid: failures.length === 0, failures };
}

/**
 * Decide the Lighthouse runner exit status. Score targets are unconditional;
 * LIGHTHOUSE_ENFORCE_TARGETS only controls the remaining metric diagnostics.
 */
export function lighthouseRunMustFail({
  executionsComplete,
  adoptedRunCount,
  expectedRunCount,
  allScoreTargetsMet,
  allTargetsMet,
  enforceDiagnosticTargets,
}) {
  return (
    executionsComplete !== true ||
    adoptedRunCount !== expectedRunCount ||
    allScoreTargetsMet !== true ||
    (enforceDiagnosticTargets === true && allTargetsMet !== true)
  );
}

/**
 * Validate every raw Lighthouse field that feeds the performance summary or
 * CSS/JavaScript budget. Empty Script, Stylesheet, and render-blocking item
 * lists are valid; missing audit structures and malformed sizes are not.
 */
export function validateLighthouseReport(report, { expectedUrl } = {}) {
  const failures = [];
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    return { valid: false, failures: ["report:not-object"] };
  }
  if (report.runtimeError) failures.push("runtime-error");

  const expectedDestination = canonicalAuditUrl(expectedUrl);
  if (!expectedDestination) failures.push("expected-url:invalid");
  for (const field of ["requestedUrl", "finalDisplayedUrl"]) {
    const destination = canonicalAuditUrl(report[field]);
    if (!destination) {
      failures.push(`${field}:invalid-url`);
    } else if (
      expectedDestination &&
      !sameAuditDestination(destination, expectedDestination)
    ) {
      failures.push(`${field}:route-mismatch`);
    }
  }

  for (const [path, read, maximum] of REQUIRED_LIGHTHOUSE_NUMBERS) {
    const value = read(report);
    if (
      !finiteNonNegative(value) ||
      (Number.isFinite(maximum) && value > maximum)
    ) {
      failures.push(`${path}:invalid-number`);
    } else if (path.startsWith("categories.") && value === 0) {
      // A numeric zero is syntactically valid Lighthouse JSON, but it is not
      // usable release evidence and must never be hidden by median/warning
      // handling in a downstream gate.
      failures.push(`${path}:zero-score`);
    }
  }

  const networkItems = report?.audits?.["network-requests"]?.details?.items;
  if (!Array.isArray(networkItems)) {
    failures.push("audits.network-requests.details.items:not-array");
  } else {
    const documents = [];
    for (const [index, item] of networkItems.entries()) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        failures.push(`network-items[${index}]:not-object`);
        continue;
      }
      if (item.resourceType === "Document") {
        documents.push([index, item]);
        if (item.statusCode !== 200) {
          failures.push(
            `network-items[${index}].statusCode:not-successful-document`,
          );
        }
        const destination = canonicalAuditUrl(item.url);
        if (!destination) {
          failures.push(`network-items[${index}].url:invalid-document-url`);
        } else if (
          expectedDestination &&
          !sameAuditDestination(destination, expectedDestination)
        ) {
          failures.push(`network-items[${index}].url:route-mismatch`);
        }
      }
      if (
        ["Document", "Script", "Stylesheet"].includes(item.resourceType) &&
        !finiteNonNegative(item.transferSize)
      ) {
        failures.push(`network-items[${index}].transferSize:invalid-number`);
      }
    }
    if (documents.length === 0) {
      failures.push("network-items:missing-document");
    }
  }

  const renderBlocking = report?.audits?.["render-blocking-insight"];
  if (!renderBlocking || typeof renderBlocking !== "object") {
    failures.push("audits.render-blocking-insight:missing");
  } else {
    const renderItems = renderBlocking?.details?.items;
    if (!Array.isArray(renderItems)) {
      failures.push("audits.render-blocking-insight.details.items:not-array");
    } else {
      for (const [index, item] of renderItems.entries()) {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          failures.push(`render-blocking-items[${index}]:not-object`);
          continue;
        }
        const size = item.totalBytes ?? item.transferSize;
        if (!finiteNonNegative(size)) {
          failures.push(`render-blocking-items[${index}].size:invalid-number`);
        }
      }
    }
  }

  return { valid: failures.length === 0, failures };
}

function maximumRouteMetric(routeActuals, field, expectedRoutes) {
  const values = [];
  for (const route of expectedRoutes) {
    const value = routeActuals?.[route]?.[field];
    if (!finiteNonNegative(value)) return null;
    values.push(value);
  }
  return values.length > 0 ? Math.max(...values) : null;
}

/**
 * Evaluate the pure budget contract after Lighthouse and inventory collection.
 * Shared CSS is represented by the maximum route transfer and is gated once;
 * route-specific JavaScript remains in routeActuals as a diagnostic only.
 */
export function evaluatePerformanceBudget({
  budget,
  commonClientJsBytes,
  routeActuals,
  inventory,
  lighthouseScoreFailures = [],
}) {
  const failures = Array.isArray(lighthouseScoreFailures)
    ? [...lighthouseScoreFailures]
    : [{ id: "lighthouse-scores", reason: "invalid-evaluation" }];
  const expectedRoutes = Object.keys(budget.routes ?? {});
  const sharedActuals = {
    commonCssBytes: maximumRouteMetric(
      routeActuals,
      "cssBytes",
      expectedRoutes,
    ),
    renderBlockingCssBytes: maximumRouteMetric(
      routeActuals,
      "renderBlockingCssBytes",
      expectedRoutes,
    ),
  };

  function upperBound(id, actual, maximum) {
    if (!Number.isFinite(maximum) || maximum < 0) {
      failures.push({ id, reason: "invalid-budget" });
      return;
    }
    if (!finiteNonNegative(actual)) {
      failures.push({ id, reason: "missing-measurement" });
      return;
    }
    if (actual > maximum) failures.push({ id, actual, maximum });
  }

  function changeBand(id, actual, baseline, allowedFraction) {
    if (
      !Number.isFinite(baseline) ||
      baseline < 0 ||
      !Number.isFinite(allowedFraction) ||
      allowedFraction < 0 ||
      allowedFraction > 1
    ) {
      failures.push({ id, reason: "invalid-budget" });
      return;
    }
    if (!Number.isFinite(actual)) {
      failures.push({ id, reason: "missing-measurement" });
      return;
    }
    const lower = Math.floor(baseline * (1 - allowedFraction));
    const upper = Math.ceil(baseline * (1 + allowedFraction));
    if (actual < lower || actual > upper) {
      failures.push({ id, actual, expectedRange: [lower, upper], baseline });
    }
  }

  upperBound(
    "common-client-js",
    commonClientJsBytes,
    budget.shared.commonClientJsBytesMax,
  );
  upperBound(
    "common-css",
    sharedActuals.commonCssBytes,
    budget.shared.commonCssBytesMax,
  );
  upperBound(
    "render-blocking-css",
    sharedActuals.renderBlockingCssBytes,
    budget.shared.renderBlockingCssBytesMax,
  );

  const minimumRuns = budget.method.minimumRuns;
  const validMinimumRuns = Number.isInteger(minimumRuns) && minimumRuns >= 1;
  if (!validMinimumRuns) {
    failures.push({ id: "minimum-runs", reason: "invalid-budget" });
  }

  for (const [page, routeBudget] of Object.entries(budget.routes)) {
    const actual = routeActuals[page];
    if (!actual) {
      failures.push({ id: `route:${page}`, reason: "missing-measurement" });
      continue;
    }
    for (const [field, maximum] of Object.entries(routeBudget)) {
      if (!field.endsWith("Max")) continue;
      const actualField = field.slice(0, -3);
      upperBound(`${page}:${actualField}`, actual[actualField], maximum);
    }
    if (validMinimumRuns && !Number.isInteger(actual.adoptedRuns)) {
      failures.push({
        id: `${page}:minimum-runs`,
        reason: "missing-measurement",
      });
    } else if (validMinimumRuns && actual.adoptedRuns < minimumRuns) {
      failures.push({
        id: `${page}:minimum-runs`,
        actual: actual.adoptedRuns,
        minimum: minimumRuns,
      });
    }
  }

  changeBand(
    "sitemap-url-count",
    inventory.sitemapUrlCount,
    budget.inventory.sitemapUrlCountBaseline,
    budget.inventory.allowedChangeFraction,
  );
  changeBand(
    "static-page-count",
    inventory.staticPageCount,
    budget.inventory.staticPageCountBaseline,
    budget.inventory.allowedChangeFraction,
  );

  return { failures, sharedActuals };
}

function intersectUrls(scriptMaps) {
  let intersection = null;
  for (const scripts of scriptMaps) {
    const urls = new Set(scripts.keys());
    intersection =
      intersection === null
        ? urls
        : new Set([...intersection].filter((url) => urls.has(url)));
  }
  return intersection ?? new Set();
}

/**
 * Attribute JavaScript shared by every measured route globally, then by every
 * route/run in an explicitly configured layout cohort. A chunk shared by only
 * a few pages is deliberately left route-specific. This attribution is kept as
 * a diagnostic because Next.js chunk partitioning can change which subset of
 * routes shares a chunk; total client JavaScript is the stable hard gate.
 */
export function attributeClientScripts(scriptsByRoute, layoutCohorts = {}) {
  const routeIds = new Set(scriptsByRoute.keys());
  const cohortByRoute = new Map();
  for (const [cohortId, members] of Object.entries(layoutCohorts)) {
    if (!Array.isArray(members) || members.length < 2) {
      throw new Error(
        `Layout cohort ${cohortId} must contain at least two routes`,
      );
    }
    for (const routeId of members) {
      if (!routeIds.has(routeId)) {
        throw new Error(
          `Layout cohort ${cohortId} references unknown route ${routeId}`,
        );
      }
      if (cohortByRoute.has(routeId)) {
        throw new Error(
          `Route ${routeId} belongs to more than one layout cohort`,
        );
      }
      cohortByRoute.set(routeId, cohortId);
    }
  }

  const allScriptMaps = [...scriptsByRoute.values()].flat();
  const commonScriptUrls = intersectUrls(allScriptMaps);
  const commonClientJsBytes = median(
    allScriptMaps.map((scripts) =>
      [...commonScriptUrls].reduce(
        (total, url) => total + (scripts.get(url) ?? 0),
        0,
      ),
    ),
  );

  const cohortActuals = {};
  const cohortSharedUrls = new Map();
  for (const [cohortId, members] of Object.entries(layoutCohorts)) {
    const scriptMaps = members.flatMap((routeId) =>
      scriptsByRoute.get(routeId),
    );
    const sharedUrls = new Set(
      [...intersectUrls(scriptMaps)].filter(
        (url) => !commonScriptUrls.has(url),
      ),
    );
    cohortSharedUrls.set(cohortId, sharedUrls);
    cohortActuals[cohortId] = {
      routes: members,
      sharedClientJsBytes: median(
        scriptMaps.map((scripts) =>
          [...sharedUrls].reduce(
            (total, url) => total + (scripts.get(url) ?? 0),
            0,
          ),
        ),
      ),
      sharedScriptUrls: [...sharedUrls],
    };
  }

  const routeSpecificJsBytes = new Map();
  for (const [routeId, scriptMaps] of scriptsByRoute) {
    const cohortUrls =
      cohortSharedUrls.get(cohortByRoute.get(routeId)) ?? new Set();
    routeSpecificJsBytes.set(
      routeId,
      median(
        scriptMaps.map((scripts) =>
          [...scripts].reduce(
            (total, [url, bytes]) =>
              total +
              (commonScriptUrls.has(url) || cohortUrls.has(url) ? 0 : bytes),
            0,
          ),
        ),
      ),
    );
  }

  return {
    commonClientJsBytes,
    commonScriptUrls,
    cohortActuals,
    routeSpecificJsBytes,
  };
}

function findPageBranch(tree) {
  if (!Array.isArray(tree)) return null;
  if (tree[2]?.page) return [tree];
  for (const child of Object.values(tree[1] ?? {})) {
    const branch = findPageBranch(child);
    if (branch) return [tree, ...branch];
  }
  return null;
}

async function generatedParamsForTree(loaderTree) {
  const branch = findPageBranch(loaderTree);
  if (!branch) throw new Error("Compiled app page has no page loader branch");
  let paramsList = [{}];
  for (const node of branch) {
    for (const moduleKey of ["layout", "page"]) {
      const loader = node[2]?.[moduleKey]?.[0];
      if (typeof loader !== "function") continue;
      const userland = await loader();
      if (typeof userland.generateStaticParams !== "function") continue;
      const nextParams = [];
      for (const parentParams of paramsList) {
        const generated = await userland.generateStaticParams({
          params: parentParams,
        });
        if (!Array.isArray(generated)) {
          throw new Error("generateStaticParams must return an array");
        }
        for (const params of generated) {
          nextParams.push({ ...parentParams, ...params });
        }
      }
      paramsList = nextParams;
    }
  }
  return paramsList;
}

function materializeRoute(pattern, params) {
  let complete = true;
  const route = pattern.replace(
    /\[\[\.\.\.([^\]]+)\]\]|\[\.\.\.([^\]]+)\]|\[([^\]]+)\]/g,
    (token, optionalCatchAll, catchAll, single) => {
      const name = optionalCatchAll ?? catchAll ?? single;
      const value = params[name];
      if (value === undefined && optionalCatchAll) return "";
      if (value === undefined || value === null) {
        complete = false;
        return token;
      }
      const values = Array.isArray(value) ? value : [value];
      if (!optionalCatchAll && !catchAll && values.length !== 1) {
        complete = false;
        return token;
      }
      return values.map((part) => encodeURIComponent(String(part))).join("/");
    },
  );
  return complete ? route.replace(/\/+/g, "/") || "/" : null;
}

/**
 * Rebuild the concrete App Router page inventory from the compiled build.
 * This remains stable when a nonce intentionally makes pages dynamic and the
 * prerender manifest therefore contains only technical static handlers.
 */
export async function collectBuildRouteInventory({
  appPathsManifest,
  appPathRoutesManifest,
  loadCompiledPage,
}) {
  const concreteRoutes = new Set();
  const generatedRoutesByPattern = {};
  let pageDefinitionCount = 0;
  let dynamicPageDefinitionCount = 0;

  for (const [appPath, bundlePath] of Object.entries(appPathsManifest)) {
    if (!appPath.endsWith("/page")) continue;
    const routePattern = appPathRoutesManifest[appPath];
    if (!routePattern || routePattern.startsWith("/_")) continue;
    pageDefinitionCount += 1;
    if (!/\[[^\]]+\]/.test(routePattern)) {
      concreteRoutes.add(routePattern);
      continue;
    }

    dynamicPageDefinitionCount += 1;
    const compiledPage = await loadCompiledPage(bundlePath);
    const paramsList = await generatedParamsForTree(
      compiledPage?.routeModule?.userland?.loaderTree,
    );
    let generatedCount = 0;
    for (const params of paramsList) {
      const route = materializeRoute(routePattern, params);
      if (!route) continue;
      const sizeBefore = concreteRoutes.size;
      concreteRoutes.add(route);
      if (concreteRoutes.size > sizeBefore) generatedCount += 1;
    }
    generatedRoutesByPattern[routePattern] = generatedCount;
  }

  return {
    concreteRouteCount: concreteRoutes.size,
    pageDefinitionCount,
    dynamicPageDefinitionCount,
    generatedRouteCount:
      concreteRoutes.size - (pageDefinitionCount - dynamicPageDefinitionCount),
    generatedRoutesByPattern,
  };
}
