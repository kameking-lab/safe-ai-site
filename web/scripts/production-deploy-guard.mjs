#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const PRODUCTION_BRANCH = "main";
export const FORBIDDEN_PUBLIC_ROUTES = ["/e-learning/exams", "/exam-quiz"];

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const WEB_ROOT = resolve(dirname(SCRIPT_PATH), "..");
const REPOSITORY_ROOT = resolve(WEB_ROOT, "..");

function fail(message) {
  throw new Error(`production deploy guard: ${message}`);
}

function posixPath(value) {
  return value.split(sep).join("/").replaceAll("\\", "/");
}

export function routeFromAppFile(filePath) {
  const normalized = posixPath(filePath).replace(/^\.\//u, "");
  const marker = "src/app/";
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex < 0 || !/(?:^|\/)page\.[cm]?[jt]sx?$/u.test(normalized)) {
    return null;
  }

  const routeParts = normalized
    .slice(markerIndex + marker.length)
    .split("/")
    .slice(0, -1)
    .filter((part) => part.length > 0 && !(part.startsWith("(") && part.endsWith(")")));
  return `/${routeParts.join("/")}`.replace(/\/$/u, "") || "/";
}

export function normalizeBuiltRoute(route) {
  if (typeof route !== "string" || route.length === 0) return null;
  const normalized = route
    .replaceAll("\\", "/")
    .replace(/^(?:.*\/)?server\/app/u, "")
    .replace(/\.(?:html|rsc)$/u, "")
    .replace(/\/(?:page|route)$/u, "")
    .replace(/\/+/gu, "/");
  if (!normalized.startsWith("/")) return `/${normalized}`;
  return normalized || "/";
}

export function forbiddenRouteFor(candidate) {
  const normalized = normalizeBuiltRoute(candidate);
  if (normalized === null) return null;
  return FORBIDDEN_PUBLIC_ROUTES.find(
    (route) => normalized === route || normalized.startsWith(`${route}/`),
  ) ?? null;
}

/**
 * @param {{ sourceFiles?: string[], builtRoutes?: string[] }} routes
 */
export function assertNoForbiddenRoutes({ sourceFiles = [], builtRoutes = [] }) {
  const sourceViolations = sourceFiles.flatMap((filePath) => {
    const route = routeFromAppFile(filePath);
    const forbidden = route === null ? null : forbiddenRouteFor(route);
    return forbidden === null ? [] : [{ filePath, route, forbidden }];
  });
  const builtViolations = builtRoutes.flatMap((candidate) => {
    const route = normalizeBuiltRoute(candidate);
    const forbidden = route === null ? null : forbiddenRouteFor(route);
    return forbidden === null ? [] : [{ candidate, route, forbidden }];
  });

  const violations = [...sourceViolations, ...builtViolations];
  if (violations.length > 0) {
    const details = violations
      .map((item) => item.filePath ?? item.candidate ?? item.route)
      .join(", ");
    fail(`forbidden exam route would be published (${details})`);
  }
  return { sourceFilesChecked: sourceFiles.length, builtRoutesChecked: builtRoutes.length };
}

export function assertProductionGitState({
  statusPorcelain,
  branch,
  head,
  originMain,
  vercelGitCommitRef,
}) {
  if (statusPorcelain.trim().length > 0) fail("git working tree is not clean");
  if (branch !== PRODUCTION_BRANCH) {
    fail(`current branch must be ${PRODUCTION_BRANCH}; received ${branch || "(detached)"}`);
  }
  if (!head || head !== originMain) fail("HEAD must exactly match origin/main");
  if (vercelGitCommitRef !== PRODUCTION_BRANCH) {
    fail(`VERCEL_GIT_COMMIT_REF must be ${PRODUCTION_BRANCH}`);
  }
  return { branch, head, vercelGitCommitRef };
}

/** @param {Record<string, string | undefined>} environment */
export function assertProductionBuildEnvironment(environment = process.env) {
  if (environment.VERCEL_ENV !== "production") return;
  if (environment.VERCEL_GIT_COMMIT_REF !== PRODUCTION_BRANCH) {
    fail(
      `production builds require VERCEL_GIT_COMMIT_REF=${PRODUCTION_BRANCH}; received ${environment.VERCEL_GIT_COMMIT_REF ?? "(missing)"}`,
    );
  }
}

function git(args, cwd = REPOSITORY_ROOT) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export function readSourceFiles(repositoryRoot = REPOSITORY_ROOT) {
  const appRoot = resolve(repositoryRoot, "web", "src", "app");
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = resolve(directory, entry.name);
      if (entry.isDirectory()) visit(absolutePath);
      else if (entry.isFile()) files.push(posixPath(absolutePath.slice(repositoryRoot.length + 1)));
    }
  };
  visit(appRoot);
  return files;
}

function readBuildRoutes(webRoot = WEB_ROOT) {
  const routes = [];
  const appPathsManifest = resolve(webRoot, ".next", "server", "app-paths-manifest.json");
  const routesManifest = resolve(webRoot, ".next", "routes-manifest.json");
  if (!existsSync(appPathsManifest) || !existsSync(routesManifest)) {
    fail("Next.js build route manifests are missing");
  }
  const appManifest = JSON.parse(readFileSync(appPathsManifest, "utf8"));
  routes.push(...Object.keys(appManifest));

  const routeManifest = JSON.parse(readFileSync(routesManifest, "utf8"));
  for (const key of ["staticRoutes", "dynamicRoutes"]) {
    for (const entry of routeManifest[key] ?? []) {
      if (typeof entry?.page === "string") routes.push(entry.page);
      if (typeof entry?.route === "string") routes.push(entry.route);
    }
  }
  return routes;
}

export function runSourceBoundary({ repositoryRoot = REPOSITORY_ROOT } = {}) {
  return assertNoForbiddenRoutes({
    sourceFiles: readSourceFiles(repositoryRoot),
  });
}

export function runBuildBoundary({
  repositoryRoot = REPOSITORY_ROOT,
  webRoot = WEB_ROOT,
  environment = process.env,
} = {}) {
  assertProductionBuildEnvironment(environment);
  return assertNoForbiddenRoutes({
    sourceFiles: readSourceFiles(repositoryRoot),
    builtRoutes: readBuildRoutes(webRoot),
  });
}

export function runLocalProductionPreflight({
  repositoryRoot = REPOSITORY_ROOT,
  environment = process.env,
  fetchOrigin = true,
} = {}) {
  if (fetchOrigin) {
    execFileSync("git", ["fetch", "--quiet", "origin", PRODUCTION_BRANCH], {
      cwd: repositoryRoot,
      stdio: "inherit",
    });
  }
  const branch = git(["branch", "--show-current"], repositoryRoot);
  const state = assertProductionGitState({
    statusPorcelain: git(["status", "--porcelain=v1", "--untracked-files=all"], repositoryRoot),
    branch,
    head: git(["rev-parse", "HEAD"], repositoryRoot),
    originMain: git(["rev-parse", "origin/main"], repositoryRoot),
    vercelGitCommitRef: environment.VERCEL_GIT_COMMIT_REF ?? branch,
  });
  const routes = runSourceBoundary({ repositoryRoot });
  return { ...state, ...routes };
}

function main() {
  const mode = process.argv[2];
  let result;
  if (mode === "--source") result = runSourceBoundary();
  else if (mode === "--build") result = runBuildBoundary();
  else if (mode === "--preflight") result = runLocalProductionPreflight();
  else fail("use --source, --build, or --preflight");
  process.stdout.write(`production deploy guard passed: ${JSON.stringify(result)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
