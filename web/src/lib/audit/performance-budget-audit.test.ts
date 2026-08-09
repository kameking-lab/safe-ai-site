import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  attributeClientScripts,
  collectBuildRouteInventory,
  evaluateLighthouseScoreTargets,
  evaluatePerformanceBudget,
  lighthouseRunMustFail,
  validateLighthouseReport,
} from "../../../scripts/audit/performance-budget-core.mjs";
import {
  resolvePerformanceBudgetRuntimePaths,
  selectFinalLighthouseComposite,
} from "../../../scripts/audit/performance-budget.mjs";

const FINAL_LIGHTHOUSE_ROOT = resolve(
  "../docs/audits/evidence/service-first-copy-reduction-2026-08-02/lighthouse-runs/final",
);
const PERFORMANCE_BUDGET = JSON.parse(
  readFileSync("config/performance-budgets.json", "utf8"),
);
const CURRENT_CI_RESULT = JSON.parse(
  readFileSync(
    "src/lib/audit/fixtures/performance-budget-ci-31264521002.json",
    "utf8",
  ),
);
type RouteHardGate = {
  totalClientJsBytesMax: number;
  routePayloadBytesMax: number;
  lcpMsMax: number;
  clsMax: number;
  tbtMsMax: number;
};
const PERFORMANCE_ROUTE_BUDGETS = PERFORMANCE_BUDGET.routes as Record<
  string,
  RouteHardGate
>;
const PERFORMANCE_ROUTES = Object.keys(PERFORMANCE_ROUTE_BUDGETS);
const EXPECTED_LIGHTHOUSE_URL = "http://127.0.0.1:3320/resources";

const STABLE_ROUTE_HARD_GATES = {
  home: [218000, 61000, 3850, 0.1, 200],
  "visual-ky": [230000, 90000, 3500, 0.1, 200],
  "visual-ky-scenario": [275000, 100000, 3800, 0.1, 200],
  "safety-ai": [218000, 42000, 3550, 0.1, 200],
  "project-story": [218000, 38000, 3550, 0.1, 200],
  automation: [226000, 98000, 3900, 0.1, 200],
  "heat-hub": [229000, 62000, 3300, 0.1, 200],
  "chemical-ra": [370000, 39000, 4350, 0.1, 200],
  ky: [365000, 51000, 4500, 0.1, 200],
  "safety-diary": [270000, 53000, 4000, 0.1, 200],
  signage: [301000, 25000, 4250, 0.1, 200],
  risk: [238500, 35000, 3650, 0.1, 200],
  chatbot: [291000, 36000, 3820, 0.1, 200],
  "law-search": [235000, 37000, 3400, 0.1, 200],
  laws: [275000, 60000, 3800, 0.1, 200],
  "accident-search": [220000, 90000, 3650, 0.1, 200],
  resources: [220000, 60000, 3400, 0.1, 200],
};

function finalEvidenceCandidate(
  sessionId: string,
  pages: string[],
  mtimeMs: number,
) {
  const sourceInventorySha256 = "fixture-source-inventory";
  const buildId = "fixture-build";
  const runs = pages.flatMap((page) =>
    Array.from({ length: page === "resources" ? 3 : 1 }, (_, index) => ({
      adopted: true,
      success: true,
      profile: "mobile",
      pageId: page,
      measurementId: `${sessionId}:${page}:${index + 1}`,
      runKind: "final",
      route: page === "home" ? "/" : `/${page}`,
      sourceInventorySha256,
      buildId,
      sessionId,
    })),
  );
  return {
    path: resolve(FINAL_LIGHTHOUSE_ROOT, sessionId, "lighthouse-summary.json"),
    mtimeMs,
    summary: {
      sessionId,
      runKind: "final",
      executionsComplete: false,
      method: {
        concurrentLighthouseRuns: 1,
        runsPerProfile: 3,
        profiles: ["mobile"],
      },
      provenance: { sourceInventorySha256, buildId },
      runs,
      medians: pages.map((page) => ({
        page,
        path: page === "home" ? "/" : `/${page}`,
        profile: "mobile",
        adoptedRunCount: page === "resources" ? 3 : 1,
      })),
    },
  };
}

function finalCompositeFixtures() {
  const mainPages = PERFORMANCE_ROUTES.filter((page) => page !== "resources");
  return {
    main: finalEvidenceCandidate(
      "20260802T220655-jst-63c54a6d",
      mainPages,
      100,
    ),
    supplemental: finalEvidenceCandidate(
      "20260802T222137-jst-164dca47",
      ["resources"],
      200,
    ),
  };
}

function scripts(entries: [string, number][]) {
  return new Map(entries);
}

function lighthouseReportFixture() {
  return {
    requestedUrl: EXPECTED_LIGHTHOUSE_URL,
    finalDisplayedUrl: EXPECTED_LIGHTHOUSE_URL,
    categories: {
      performance: { score: 1 },
      accessibility: { score: 1 },
      "best-practices": { score: 1 },
      seo: { score: 1 },
    },
    audits: {
      "largest-contentful-paint": { numericValue: 1000 },
      "first-contentful-paint": { numericValue: 500 },
      "cumulative-layout-shift": { numericValue: 0 },
      "total-blocking-time": { numericValue: 0 },
      "network-requests": {
        details: {
          items: [
            {
              resourceType: "Document",
              transferSize: 1234,
              statusCode: 200,
              url: EXPECTED_LIGHTHOUSE_URL,
            },
          ],
        },
      },
      "render-blocking-insight": { details: { items: [] } },
    },
  };
}

function compiledPage(userland: Record<string, unknown>) {
  return {
    routeModule: {
      userland: {
        loaderTree: [
          "",
          {
            children: [
              "__PAGE__",
              {},
              { page: [async () => userland, "fixture/page.tsx"] },
              [],
            ],
          },
          {},
          [],
        ],
      },
    },
  };
}

describe("performance budget measurement", () => {
  it("discovers the service-first final Lighthouse sessions with default CLI paths", () => {
    const runtime = resolvePerformanceBudgetRuntimePaths({
      env: { NODE_ENV: "test" },
      cwd: resolve("."),
    }) as { evidenceRoot: string; outputPath: string; baseUrl: string };

    expect(runtime.evidenceRoot).toBe(dirname(FINAL_LIGHTHOUSE_ROOT));
    expect(runtime.outputPath).toContain(
      "service-first-copy-reduction-2026-08-02",
    );
    expect(runtime.baseUrl).toBe("http://127.0.0.1:3320");

    const { main, supplemental } = finalCompositeFixtures();
    const selected = selectFinalLighthouseComposite(
      [main, supplemental],
      PERFORMANCE_ROUTES,
    ) as { composite: boolean };
    expect(selected.composite).toBe(true);
  });

  it("composes the final main and supplemental sessions without adopting superseded partial route runs", () => {
    const { main, supplemental } = finalCompositeFixtures();
    const selected = selectFinalLighthouseComposite(
      [main, supplemental],
      PERFORMANCE_ROUTES,
    ) as {
      composite: boolean;
      summary: {
        medians: Array<{ page: string }>;
        runs: Array<{ pageId: string; sessionId: string }>;
        composition: { sessionIds: string[] };
      };
    };

    expect(selected.composite).toBe(true);
    expect(selected.summary.composition.sessionIds).toEqual([
      "20260802T222137-jst-164dca47",
      "20260802T220655-jst-63c54a6d",
    ]);
    expect(selected.summary.medians.map((row) => row.page)).toHaveLength(
      PERFORMANCE_ROUTES.length,
    );
    const resourceRuns = selected.summary.runs.filter(
      (run) => run.pageId === "resources",
    );
    expect(resourceRuns).toHaveLength(3);
    expect(
      resourceRuns.every(
        (run) => run.sessionId === "20260802T222137-jst-164dca47",
      ),
    ).toBe(true);
  });

  it.each(["sourceInventorySha256", "buildId"] as const)(
    "rejects a composite when session %s differs",
    (identityField) => {
      const { main, supplemental } = finalCompositeFixtures();
      const changed = `${supplemental.summary.provenance[identityField]}-other`;
      supplemental.summary.provenance[identityField] = changed;
      for (const run of supplemental.summary.runs) {
        run[identityField] = changed;
      }

      expect(() =>
        selectFinalLighthouseComposite(
          [main, supplemental],
          PERFORMANCE_ROUTES,
        ),
      ).toThrow("same-source/build, same-method composite");
    },
  );

  it("rejects a session whose adopted route run disagrees with its summary identity", () => {
    const { main, supplemental } = finalCompositeFixtures();
    supplemental.summary.runs[0].buildId = "different-build";

    expect(() =>
      selectFinalLighthouseComposite([main, supplemental], PERFORMANCE_ROUTES),
    ).toThrow("same-source/build, same-method composite");
  });

  it("rejects a composite measured with different Lighthouse methods", () => {
    const { main, supplemental } = finalCompositeFixtures();
    supplemental.summary.method.runsPerProfile = 1;

    expect(() =>
      selectFinalLighthouseComposite([main, supplemental], PERFORMANCE_ROUTES),
    ).toThrow("same-source/build, same-method composite");
  });

  it("rejects an incomplete route union", () => {
    const { main } = finalCompositeFixtures();
    expect(() =>
      selectFinalLighthouseComposite([main], PERFORMANCE_ROUTES),
    ).toThrow("covers every performance-budget route");
  });

  it("does not charge a layout cohort's shared chunk to each route", () => {
    const attribution = attributeClientScripts(
      new Map([
        [
          "main-a",
          [
            scripts([
              ["/global.js", 100],
              ["/main-layout.js", 50],
              ["/pair.js", 7],
              ["/a.js", 10],
            ]),
          ],
        ],
        [
          "main-b",
          [
            scripts([
              ["/global.js", 100],
              ["/main-layout.js", 50],
              ["/b.js", 20],
            ]),
          ],
        ],
        [
          "fullscreen",
          [
            scripts([
              ["/global.js", 100],
              ["/pair.js", 7],
              ["/fullscreen.js", 30],
            ]),
          ],
        ],
      ]),
      { main: ["main-a", "main-b"] },
    ) as unknown as {
      commonClientJsBytes: number;
      cohortActuals: Record<
        string,
        { sharedClientJsBytes: number; sharedScriptUrls: string[] }
      >;
      routeSpecificJsBytes: Map<string, number>;
    };

    expect(attribution.commonClientJsBytes).toBe(100);
    expect(attribution.cohortActuals.main.sharedClientJsBytes).toBe(50);
    expect(attribution.cohortActuals.main.sharedScriptUrls).toEqual([
      "/main-layout.js",
    ]);
    expect(attribution.routeSpecificJsBytes.get("main-a")).toBe(17);
    expect(attribution.routeSpecificJsBytes.get("main-b")).toBe(20);
    expect(attribution.routeSpecificJsBytes.get("fullscreen")).toBe(37);
  });

  it("rejects a singleton cohort instead of erasing route-specific bytes", () => {
    expect(() =>
      attributeClientScripts(
        new Map([["only", [scripts([["/only.js", 10]])]]]),
        { invalid: ["only"] },
      ),
    ).toThrow("at least two routes");
  });

  it("keeps the recalibrated config schema and unrelated route hard gates fixed", () => {
    expect(PERFORMANCE_BUDGET.shared).toEqual({
      commonClientJsBytesMax: 218000,
      commonCssBytesMax: 46000,
      renderBlockingCssBytesMax: 42000,
    });
    expect(PERFORMANCE_BUDGET.method.notes).toContain(
      "Route-specific JavaScript attribution remains diagnostic",
    );
    expect(PERFORMANCE_BUDGET.method.notes).toContain(
      "total client JavaScript remains the route hard gate",
    );
    expect(PERFORMANCE_BUDGET.method).toMatchObject({
      minimumRuns: 3,
      aggregation: "median",
    });

    for (const routeBudget of Object.values(PERFORMANCE_ROUTE_BUDGETS)) {
      expect(Object.keys(routeBudget).sort()).toEqual([
        "clsMax",
        "lcpMsMax",
        "routePayloadBytesMax",
        "tbtMsMax",
        "totalClientJsBytesMax",
      ]);
    }

    expect(
      Object.fromEntries(
        Object.entries(PERFORMANCE_ROUTE_BUDGETS).map(
          ([route, routeBudget]) => [
            route,
            [
              routeBudget.totalClientJsBytesMax,
              routeBudget.routePayloadBytesMax,
              routeBudget.lcpMsMax,
              routeBudget.clsMax,
              routeBudget.tbtMsMax,
            ],
          ],
        ),
      ),
    ).toEqual(STABLE_ROUTE_HARD_GATES);
    expect({
      home: PERFORMANCE_BUDGET.routes.home.routePayloadBytesMax,
      "safety-ai": PERFORMANCE_BUDGET.routes["safety-ai"].routePayloadBytesMax,
      signage: PERFORMANCE_BUDGET.routes.signage.routePayloadBytesMax,
      "law-search":
        PERFORMANCE_BUDGET.routes["law-search"].routePayloadBytesMax,
    }).toEqual({
      home: 61000,
      "safety-ai": 42000,
      signage: 25000,
      "law-search": 37000,
    });
    expect(PERFORMANCE_BUDGET.inventory).toEqual({
      sitemapUrlCountBaseline: 3492,
      staticPageCountBaseline: 3180,
      allowedChangeFraction: 0.02,
    });
  });

  it("accepts the observed calibration sample while retaining route-specific JS diagnostics", () => {
    expect(CURRENT_CI_RESULT.source).toMatchObject({
      workflowRunId: 31264521002,
      artifactResultSha256:
        "016759a3108dae6f1ad612ef2a163f77396f6a213790b36f112a2ca771e2ee55",
      nodeVersion: "v20.20.2",
      cspPolicyMode: "report-only",
      methodologyUse: "calibration-sample-only",
    });
    const evaluation = evaluatePerformanceBudget({
      budget: PERFORMANCE_BUDGET,
      commonClientJsBytes: CURRENT_CI_RESULT.actual.commonClientJsBytes,
      routeActuals: CURRENT_CI_RESULT.actual.routes,
      inventory: CURRENT_CI_RESULT.actual.inventory,
    });

    expect(evaluation.failures).toEqual([]);
    expect(evaluation.sharedActuals).toEqual({
      commonCssBytes: 43324,
      renderBlockingCssBytes: 39837,
    });
    expect(CURRENT_CI_RESULT.actual.routes.laws.routeSpecificJsBytes).toBe(
      89668,
    );
  });

  it("gates each shared CSS maximum once without hard-failing route-specific JS", () => {
    const actual = structuredClone(CURRENT_CI_RESULT.actual);
    actual.routes.home.cssBytes = 46001;
    actual.routes["safety-ai"].cssBytes = 47000;
    actual.routes.signage.renderBlockingCssBytes = 42001;
    actual.routes.laws.renderBlockingCssBytes = 43000;
    actual.routes.laws.routeSpecificJsBytes = 999999;

    const evaluation = evaluatePerformanceBudget({
      budget: PERFORMANCE_BUDGET,
      commonClientJsBytes: actual.commonClientJsBytes,
      routeActuals: actual.routes,
      inventory: actual.inventory,
    });

    expect(evaluation.sharedActuals).toEqual({
      commonCssBytes: 47000,
      renderBlockingCssBytes: 43000,
    });
    expect(evaluation.failures).toEqual([
      { id: "common-css", actual: 47000, maximum: 46000 },
      { id: "render-blocking-css", actual: 43000, maximum: 42000 },
    ]);
  });

  it("keeps total client JavaScript and static inventory as hard gates", () => {
    const actual = structuredClone(CURRENT_CI_RESULT.actual);
    actual.routes.laws.totalClientJsBytes = 275001;
    actual.inventory.staticPageCount = 3245;

    const evaluation = evaluatePerformanceBudget({
      budget: PERFORMANCE_BUDGET,
      commonClientJsBytes: actual.commonClientJsBytes,
      routeActuals: actual.routes,
      inventory: actual.inventory,
    });

    expect(evaluation.failures).toEqual([
      {
        id: "laws:totalClientJsBytes",
        actual: 275001,
        maximum: 275000,
      },
      {
        id: "static-page-count",
        actual: 3245,
        expectedRange: [3116, 3244],
        baseline: 3180,
      },
    ]);
  });

  it("fails closed when a required limit or inventory baseline is invalid", () => {
    const budget = structuredClone(PERFORMANCE_BUDGET);
    budget.shared.commonCssBytesMax = undefined;
    budget.inventory.staticPageCountBaseline = Number.NaN;
    budget.method.minimumRuns = null;

    const evaluation = evaluatePerformanceBudget({
      budget,
      commonClientJsBytes: CURRENT_CI_RESULT.actual.commonClientJsBytes,
      routeActuals: CURRENT_CI_RESULT.actual.routes,
      inventory: CURRENT_CI_RESULT.actual.inventory,
    });

    expect(evaluation.failures).toEqual([
      { id: "common-css", reason: "invalid-budget" },
      { id: "minimum-runs", reason: "invalid-budget" },
      { id: "static-page-count", reason: "invalid-budget" },
    ]);
  });

  it("accepts valid Lighthouse reports with no script, stylesheet, or render-blocking items", () => {
    expect(
      validateLighthouseReport(lighthouseReportFixture(), {
        expectedUrl: EXPECTED_LIGHTHOUSE_URL,
      }),
    ).toEqual({ valid: true, failures: [] });
  });

  it.each([
    [
      "requestedUrl",
      (report: ReturnType<typeof lighthouseReportFixture>) => {
        report.requestedUrl = "http://127.0.0.1:3320/";
      },
    ],
    [
      "finalDisplayedUrl",
      (report: ReturnType<typeof lighthouseReportFixture>) => {
        report.finalDisplayedUrl = "http://127.0.0.1:3320/";
      },
    ],
    [
      "Document URL",
      (report: ReturnType<typeof lighthouseReportFixture>) => {
        report.audits["network-requests"].details.items[0].url =
          "http://127.0.0.1:3320/";
      },
    ],
  ])("rejects a /resources audit redirected at %s", (_field, mutate) => {
    const report = lighthouseReportFixture();
    mutate(report);

    expect(
      validateLighthouseReport(report, {
        expectedUrl: EXPECTED_LIGHTHOUSE_URL,
      }),
    ).toMatchObject({ valid: false });
  });

  it("requires callers to supply the configured Lighthouse route", () => {
    expect(validateLighthouseReport(lighthouseReportFixture())).toEqual({
      valid: false,
      failures: ["expected-url:invalid"],
    });
  });

  it.each([
    [
      "performance",
      { performance: 0, accessibility: 100, bestPractices: 100, seo: 100 },
    ],
    [
      "accessibility",
      { performance: 100, accessibility: 0, bestPractices: 100, seo: 100 },
    ],
    [
      "best-practices",
      { performance: 100, accessibility: 100, bestPractices: 0, seo: 100 },
    ],
    [
      "seo",
      { performance: 100, accessibility: 100, bestPractices: 100, seo: 0 },
    ],
  ])("hard-fails a zero %s score", (category, scores) => {
    const evaluation = evaluateLighthouseScoreTargets({
      profile: "mobile",
      scores,
      seoPolicyCompliant: category === "seo",
    });

    expect(evaluation.valid).toBe(false);
    expect(evaluation.failures).toContainEqual(
      expect.objectContaining({ id: category }),
    );
  });

  it("cannot disable score failures through the diagnostic target switch", () => {
    expect(
      lighthouseRunMustFail({
        executionsComplete: true,
        adoptedRunCount: 3,
        expectedRunCount: 3,
        allScoreTargetsMet: false,
        allTargetsMet: false,
        enforceDiagnosticTargets: false,
      }),
    ).toBe(true);
    expect(
      lighthouseRunMustFail({
        executionsComplete: true,
        adoptedRunCount: 3,
        expectedRunCount: 3,
        allScoreTargetsMet: true,
        allTargetsMet: false,
        enforceDiagnosticTargets: false,
      }),
    ).toBe(false);
  });

  it("keeps Lighthouse score failures hard in the performance-budget warning path", () => {
    const scoreFailure = {
      id: "resources:lighthouse-score:performance",
      category: "performance",
      actual: 0,
      minimum: 90,
    };
    const evaluation = evaluatePerformanceBudget({
      budget: PERFORMANCE_BUDGET,
      commonClientJsBytes: CURRENT_CI_RESULT.actual.commonClientJsBytes,
      routeActuals: CURRENT_CI_RESULT.actual.routes,
      inventory: CURRENT_CI_RESULT.actual.inventory,
      lighthouseScoreFailures: [scoreFailure] as never,
    });

    expect(evaluation.failures).toEqual([scoreFailure]);
  });

  it.each([
    [
      "basic numeric",
      (report: ReturnType<typeof lighthouseReportFixture>) => {
        report.audits["total-blocking-time"].numericValue = Number.NaN;
      },
    ],
    [
      "category score",
      (report: ReturnType<typeof lighthouseReportFixture>) => {
        report.categories.performance.score = 1.01;
      },
    ],
    [
      "zero category score",
      (report: ReturnType<typeof lighthouseReportFixture>) => {
        report.categories.performance.score = 0;
      },
    ],
    [
      "network items",
      (report: ReturnType<typeof lighthouseReportFixture>) => {
        report.audits["network-requests"].details.items = null as never;
      },
    ],
    [
      "document",
      (report: ReturnType<typeof lighthouseReportFixture>) => {
        report.audits["network-requests"].details.items = [];
      },
    ],
    [
      "document transfer size",
      (report: ReturnType<typeof lighthouseReportFixture>) => {
        report.audits["network-requests"].details.items[0].transferSize = -1;
      },
    ],
    [
      "document 204 status",
      (report: ReturnType<typeof lighthouseReportFixture>) => {
        report.audits["network-requests"].details.items[0].statusCode = 204;
      },
    ],
    [
      "document 206 status",
      (report: ReturnType<typeof lighthouseReportFixture>) => {
        report.audits["network-requests"].details.items[0].statusCode = 206;
      },
    ],
    [
      "document 404 status",
      (report: ReturnType<typeof lighthouseReportFixture>) => {
        report.audits["network-requests"].details.items[0].statusCode = 404;
      },
    ],
    [
      "document 500 status",
      (report: ReturnType<typeof lighthouseReportFixture>) => {
        report.audits["network-requests"].details.items[0].statusCode = 500;
      },
    ],
    [
      "missing document status",
      (report: ReturnType<typeof lighthouseReportFixture>) => {
        delete (
          report.audits["network-requests"].details.items[0] as {
            statusCode?: number;
          }
        ).statusCode;
      },
    ],
    [
      "script transfer size",
      (report: ReturnType<typeof lighthouseReportFixture>) => {
        report.audits["network-requests"].details.items.push({
          resourceType: "Script",
          transferSize: Number.POSITIVE_INFINITY,
          statusCode: 200,
          url: "http://127.0.0.1:3320/script.js",
        });
      },
    ],
    [
      "stylesheet transfer size",
      (report: ReturnType<typeof lighthouseReportFixture>) => {
        report.audits["network-requests"].details.items.push({
          resourceType: "Stylesheet",
          transferSize: undefined as never,
          statusCode: 200,
          url: "http://127.0.0.1:3320/style.css",
        });
      },
    ],
    [
      "render-blocking audit",
      (report: ReturnType<typeof lighthouseReportFixture>) => {
        delete (report.audits as Record<string, unknown>)[
          "render-blocking-insight"
        ];
      },
    ],
    [
      "render-blocking items",
      (report: ReturnType<typeof lighthouseReportFixture>) => {
        report.audits["render-blocking-insight"].details.items = null as never;
      },
    ],
    [
      "render-blocking item size",
      (report: ReturnType<typeof lighthouseReportFixture>) => {
        report.audits["render-blocking-insight"].details.items = [
          { totalBytes: -1 },
        ] as never;
      },
    ],
  ])("fails closed for a missing or invalid %s", (_label, mutate) => {
    const report = lighthouseReportFixture();
    mutate(report);

    expect(
      validateLighthouseReport(report, {
        expectedUrl: EXPECTED_LIGHTHOUSE_URL,
      }).valid,
    ).toBe(false);
  });

  it("fails shared CSS closed when one budget route has no finite measurement", () => {
    const actual = structuredClone(CURRENT_CI_RESULT.actual);
    delete actual.routes.home.cssBytes;
    actual.routes.signage.renderBlockingCssBytes = Number.NaN;

    const evaluation = evaluatePerformanceBudget({
      budget: PERFORMANCE_BUDGET,
      commonClientJsBytes: actual.commonClientJsBytes,
      routeActuals: actual.routes,
      inventory: actual.inventory,
    });

    expect(evaluation.sharedActuals).toEqual({
      commonCssBytes: null,
      renderBlockingCssBytes: null,
    });
    expect(evaluation.failures).toContainEqual({
      id: "common-css",
      reason: "missing-measurement",
    });
    expect(evaluation.failures).toContainEqual({
      id: "render-blocking-css",
      reason: "missing-measurement",
    });
  });

  it("counts compiled page candidates without a prerender manifest", async () => {
    const inventory = await collectBuildRouteInventory({
      appPathsManifest: {
        "/(main)/page": "app/(main)/page.js",
        "/(main)/docs/[slug]/page": "app/(main)/docs/[slug]/page.js",
        "/(main)/private/[id]/page": "app/(main)/private/[id]/page.js",
        "/_not-found/page": "app/_not-found/page.js",
      },
      appPathRoutesManifest: {
        "/(main)/page": "/",
        "/(main)/docs/[slug]/page": "/docs/[slug]",
        "/(main)/private/[id]/page": "/private/[id]",
        "/_not-found/page": "/_not-found",
      },
      async loadCompiledPage(bundlePath: string) {
        if (bundlePath.includes("docs")) {
          return compiledPage({
            generateStaticParams: () => [
              { slug: "first" },
              { slug: "second" },
              { slug: "second" },
            ],
          });
        }
        return compiledPage({});
      },
    });

    expect(inventory).toMatchObject({
      concreteRouteCount: 3,
      pageDefinitionCount: 3,
      dynamicPageDefinitionCount: 2,
      generatedRouteCount: 2,
      generatedRoutesByPattern: {
        "/docs/[slug]": 2,
        "/private/[id]": 0,
      },
    });
  });
});
