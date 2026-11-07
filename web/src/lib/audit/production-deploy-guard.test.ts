import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertNoForbiddenRoutes,
  assertProductionBuildEnvironment,
  assertProductionGitState,
  forbiddenRouteFor,
  normalizeBuiltRoute,
  readSourceFiles,
  routeFromAppFile,
  runBuildBoundary,
} from "../../../scripts/production-deploy-guard.mjs";

const SHA = "917f061acf565eb09d009e7a2ff3b3cdb6244f24";

describe("production deploy guard", () => {
  it("checks the configured build manifests without falling back to a different build", () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "production-build-route-guard-"));
    const webRoot = join(fixtureRoot, "web");
    const customDir = ".next/reviewed-build";
    const manifests = (dir: string, route: string) => {
      mkdirSync(join(webRoot, dir, "server"), { recursive: true });
      writeFileSync(join(webRoot, dir, "server", "app-paths-manifest.json"), JSON.stringify({ [route]: "app/resources/page.js" }));
      writeFileSync(join(webRoot, dir, "routes-manifest.json"), JSON.stringify({ staticRoutes: [{ page: route }], dynamicRoutes: [] }));
    };
    try {
      mkdirSync(join(webRoot, "src", "app"), { recursive: true });
      manifests(".next", "/resources/page");
      expect(runBuildBoundary({ repositoryRoot: fixtureRoot, webRoot, environment: { NODE_ENV: "test" } }).builtRoutesChecked).toBe(2);
      expect(() => runBuildBoundary({ repositoryRoot: fixtureRoot, webRoot, environment: { NODE_ENV: "test", NEXT_DIST_DIR: customDir } })).toThrow("build route manifests are missing");
      manifests(customDir, "/exam-quiz/page");
      expect(() => runBuildBoundary({ repositoryRoot: fixtureRoot, webRoot, environment: { NODE_ENV: "test", NEXT_DIST_DIR: customDir } })).toThrow("forbidden exam route would be published");
      manifests(customDir, "/resources/page");
      expect(runBuildBoundary({ repositoryRoot: fixtureRoot, webRoot, environment: { NODE_ENV: "test", NEXT_DIST_DIR: customDir } }).builtRoutesChecked).toBe(2);
      for (const dir of ["../outside", "..\\outside", "/tmp/outside", "C:/outside", "."]) {
        expect(() => runBuildBoundary({ repositoryRoot: fixtureRoot, webRoot, environment: { NODE_ENV: "test", NEXT_DIST_DIR: dir } })).toThrow("build directory must stay inside web");
      }
      const external = join(fixtureRoot, "external-build");
      mkdirSync(join(external, "server"), { recursive: true });
      writeFileSync(join(external, "server", "app-paths-manifest.json"), "{}");
      writeFileSync(join(external, "routes-manifest.json"), "{}");
      symlinkSync(external, join(webRoot, "linked-build"), "junction");
      expect(() => runBuildBoundary({ repositoryRoot: fixtureRoot, webRoot, environment: { NODE_ENV: "test", NEXT_DIST_DIR: "linked-build" } })).toThrow("build manifests must be regular files inside web");
      mkdirSync(join(webRoot, "shifted-build"), { recursive: true });
      symlinkSync(join(external, "server"), join(webRoot, "shifted-build", "server"), "junction");
      writeFileSync(join(webRoot, "shifted-build", "routes-manifest.json"), "{}");
      expect(() => runBuildBoundary({ repositoryRoot: fixtureRoot, webRoot, environment: { NODE_ENV: "test", NEXT_DIST_DIR: "shifted-build" } })).toThrow("build manifests must be regular files inside web");
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("accepts only a clean main checkout at exact origin/main", () => {
    expect(
      assertProductionGitState({
        statusPorcelain: "",
        branch: "main",
        head: SHA,
        originMain: SHA,
        vercelGitCommitRef: "main",
      }),
    ).toEqual({ branch: "main", head: SHA, vercelGitCommitRef: "main" });

    for (const invalid of [
      { statusPorcelain: " M web/package.json" },
      { branch: "fix/unsafe-production" },
      { originMain: "61bbdd930427b575c9baa0c3a75a0c9d688fc0c3" },
      { vercelGitCommitRef: "fix/unsafe-production" },
    ]) {
      expect(() =>
        assertProductionGitState({
          statusPorcelain: "",
          branch: "main",
          head: SHA,
          originMain: SHA,
          vercelGitCommitRef: "main",
          ...invalid,
        }),
      ).toThrow("production deploy guard");
    }
  });

  it("requires production Vercel builds to identify main", () => {
    expect(() =>
      assertProductionBuildEnvironment({
        VERCEL_ENV: "production",
        VERCEL_GIT_COMMIT_REF: "fix/unsafe-production",
      }),
    ).toThrow("VERCEL_GIT_COMMIT_REF=main");
    expect(() =>
      assertProductionBuildEnvironment({
        VERCEL_ENV: "production",
        VERCEL_GIT_COMMIT_REF: "main",
      }),
    ).not.toThrow();
    expect(() => assertProductionBuildEnvironment({ VERCEL_ENV: "preview" })).not.toThrow();
  });

  it("derives public routes from App Router source and build manifests", () => {
    expect(routeFromAppFile("web/src/app/(main)/e-learning/exams/[id]/page.tsx")).toBe(
      "/e-learning/exams/[id]",
    );
    expect(routeFromAppFile("web/src/app/(main)/resources/page.tsx")).toBe("/resources");
    expect(normalizeBuiltRoute("/e-learning/exams/[id]/page")).toBe(
      "/e-learning/exams/[id]",
    );
    expect(forbiddenRouteFor("/exam-quiz/boiler/page")).toBe("/exam-quiz");
    expect(forbiddenRouteFor("/education/exams")).toBeNull();
  });

  it("fails closed when either forbidden exam route would be published", () => {
    expect(() =>
      assertNoForbiddenRoutes({
        sourceFiles: ["web/src/app/(main)/e-learning/exams/page.tsx"],
      }),
    ).toThrow("forbidden exam route would be published");
    expect(() =>
      assertNoForbiddenRoutes({
        builtRoutes: ["/exam-quiz/[examId]/page"],
      }),
    ).toThrow("forbidden exam route would be published");
    expect(
      assertNoForbiddenRoutes({
        sourceFiles: ["web/src/app/(main)/education/page.tsx"],
        builtRoutes: ["/resources/page"],
      }),
    ).toEqual({ sourceFilesChecked: 1, builtRoutesChecked: 1 });
  });

  it("scans source files without Git metadata and never follows storage junctions", () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "production-route-guard-"));
    try {
      const appRoot = join(fixtureRoot, "web", "src", "app");
      const externalStorage = join(fixtureRoot, "external-storage");
      mkdirSync(join(appRoot, "(main)", "privacy"), { recursive: true });
      mkdirSync(join(externalStorage, "e-learning", "exams"), { recursive: true });
      writeFileSync(join(appRoot, "(main)", "privacy", "page.tsx"), "export default null;\n");
      writeFileSync(
        join(externalStorage, "e-learning", "exams", "page.tsx"),
        "export default null;\n",
      );
      symlinkSync(externalStorage, join(appRoot, "storage-junction"), "junction");

      expect(readSourceFiles(fixtureRoot)).toEqual([
        "web/src/app/(main)/privacy/page.tsx",
      ]);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});
