import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  attributeClientScripts,
  collectBuildRouteInventory,
} from "../../../scripts/audit/performance-budget-core.mjs";
import {
  resolvePerformanceBudgetRuntimePaths,
  selectFinalLighthouseComposite,
} from "../../../scripts/audit/performance-budget.mjs";

const FINAL_LIGHTHOUSE_ROOT = resolve(
  "../docs/audits/evidence/service-first-copy-reduction-2026-08-02/lighthouse-runs/final",
);
const PERFORMANCE_ROUTES = Object.keys(
  JSON.parse(readFileSync("config/performance-budgets.json", "utf8")).routes,
);

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
      selectFinalLighthouseComposite(
        [main, supplemental],
        PERFORMANCE_ROUTES,
      ),
    ).toThrow("same-source/build, same-method composite");
  });

  it("rejects a composite measured with different Lighthouse methods", () => {
    const { main, supplemental } = finalCompositeFixtures();
    supplemental.summary.method.runsPerProfile = 1;

    expect(() =>
      selectFinalLighthouseComposite(
        [main, supplemental],
        PERFORMANCE_ROUTES,
      ),
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
