#!/usr/bin/env node

/**
 * Immutable Lighthouse evidence runner.
 *
 * Each invocation creates a unique session and each measurement gets its own
 * directory. Raw reports and traces are never reused or overwritten. Only
 * complete, successful baseline/final runs are eligible for adopted medians.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { hostname, platform, release, arch } from "node:os";
import { basename, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const LIGHTHOUSE_VERSION = "12.8.2";
const DEFAULT_EVIDENCE_ROOT =
  "../docs/audits/evidence/final-polish-staging-readiness-2026-07-27/lighthouse-runs";
const RUN_KINDS = new Set(["baseline", "final", "diagnostic"]);
const runKind = process.env.LIGHTHOUSE_RUN_KIND ?? "diagnostic";
if (!RUN_KINDS.has(runKind)) {
  throw new Error(
    "LIGHTHOUSE_RUN_KIND は baseline / final / diagnostic のいずれかです。",
  );
}

const baseUrl = process.env.LIGHTHOUSE_BASE_URL ?? "http://127.0.0.1:3320";
const parsedBaseUrl = new URL(baseUrl);
if (!["http:", "https:"].includes(parsedBaseUrl.protocol)) {
  throw new Error("LIGHTHOUSE_BASE_URL は http(s) URL で指定してください。");
}
const evidenceRoot = resolve(
  process.cwd(),
  process.env.LIGHTHOUSE_EVIDENCE_ROOT ?? DEFAULT_EVIDENCE_ROOT,
);
const repositoryRoot = resolve(process.cwd(), "..");
const serverCommand =
  process.env.LIGHTHOUSE_SERVER_COMMAND ?? "not-recorded (diagnostic only)";
const serverPidRaw = process.env.LIGHTHOUSE_SERVER_PID ?? "";
const serverPid = /^\d+$/.test(serverPidRaw) ? Number(serverPidRaw) : null;
if (runKind !== "diagnostic" && (!serverPid || !process.env.LIGHTHOUSE_SERVER_COMMAND)) {
  throw new Error(
    "baseline/final 採用実行には LIGHTHOUSE_SERVER_COMMAND と LIGHTHOUSE_SERVER_PID が必要です。",
  );
}

const allPages = [
  { id: "home", path: "/", mobileLcpTargetMs: 2_500 },
  {
    id: "visual-ky",
    path: "/training/visual-ky",
    mobileLcpTargetMs: 2_500,
  },
  {
    id: "visual-ky-scenario",
    path: "/training/visual-ky/rain-wind-delivery",
    mobileLcpTargetMs: 2_500,
  },
  { id: "safety-ai", path: "/safety-ai", mobileLcpTargetMs: 2_500 },
  {
    id: "project-story",
    path: "/about/project-story",
    mobileLcpTargetMs: 2_500,
  },
  { id: "automation", path: "/services/automation", mobileLcpTargetMs: 2_500 },
  {
    id: "heat-hub",
    path: "/heat-illness-prevention",
    mobileLcpTargetMs: 2_500,
    // This hub and its two heat pages intentionally remain noindex. Treat the
    // expected crawlability audit as policy compliance, while every other
    // weighted SEO audit must still score 100.
    requiredNoindex: true,
  },
  { id: "chemical-ra", path: "/chemical-ra", mobileLcpTargetMs: 3_000 },
  { id: "ky", path: "/ky/paper", mobileLcpTargetMs: 3_000 },
  { id: "safety-diary", path: "/safety-diary", mobileLcpTargetMs: 3_000 },
  { id: "signage", path: "/signage", mobileLcpTargetMs: 3_000 },
  { id: "risk", path: "/risk", mobileLcpTargetMs: 3_000 },
  { id: "chatbot", path: "/chatbot", mobileLcpTargetMs: 3_000 },
  { id: "law-search", path: "/law-search", mobileLcpTargetMs: 3_000 },
  { id: "laws", path: "/laws", mobileLcpTargetMs: 3_000 },
  { id: "accident-search", path: "/accident-news", mobileLcpTargetMs: 3_000 },
  { id: "resources", path: "/resources", mobileLcpTargetMs: 3_000 },
];

const requestedPageIds = new Set(
  (process.env.LIGHTHOUSE_PAGE_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const pages =
  requestedPageIds.size === 0
    ? allPages
    : allPages.filter((page) => requestedPageIds.has(page.id));
if (pages.length === 0 || pages.length !== (requestedPageIds.size || pages.length)) {
  throw new Error("LIGHTHOUSE_PAGE_IDS に不明なページIDがあります。");
}

const requestedProfiles = (
  process.env.LIGHTHOUSE_PROFILES ?? "mobile,desktop"
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
if (
  requestedProfiles.length === 0 ||
  requestedProfiles.some((profile) => !["mobile", "desktop"].includes(profile))
) {
  throw new Error("LIGHTHOUSE_PROFILES は mobile,desktop から指定してください。");
}
const profiles = [...new Set(requestedProfiles)];
const runsPerProfile = Number(process.env.LIGHTHOUSE_RUNS_PER_PROFILE ?? 3);
if (!Number.isInteger(runsPerProfile) || runsPerProfile < 1) {
  throw new Error("LIGHTHOUSE_RUNS_PER_PROFILE は1以上の整数です。");
}
const attemptsPerRun = Number(
  process.env.LIGHTHOUSE_ATTEMPTS_PER_RUN ??
    (runKind === "diagnostic" ? 1 : 2),
);
if (!Number.isInteger(attemptsPerRun) || attemptsPerRun < 1 || attemptsPerRun > 3) {
  throw new Error("LIGHTHOUSE_ATTEMPTS_PER_RUN は1〜3の整数です。");
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
    ...options,
  });
}

function git(args) {
  const result = run("git", args, { cwd: repositoryRoot });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed`);
  }
  return result.stdout ?? "";
}

function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(path) {
  return sha256Bytes(readFileSync(path));
}

const SOURCE_INVENTORY_SCOPES = [
  ".github",
  "scripts",
  "web",
  "AGENTS.md",
  "package.json",
  "package-lock.json",
];
const SOURCE_INVENTORY_EXCLUSIONS = [
  "Git ignored files (including local environment files)",
  "web/.next/**",
  "web/node_modules/**",
  "web/test-results/**",
  "web/playwright-report/**",
  "**/.env and **/.env.* except tracked/untracked .env.example",
  "docs/audits/evidence/** (outside source scopes)",
];

function sourceInventory() {
  const rawPaths = git([
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
    "--",
    ...SOURCE_INVENTORY_SCOPES,
  ]);
  const paths = [...new Set(rawPaths.split("\0").filter(Boolean))]
    .filter(
      (path) =>
        !/(^|\/)\.next(\/|$)/.test(path) &&
        !/(^|\/)node_modules(\/|$)/.test(path) &&
        !/(^|\/)(test-results|playwright-report)(\/|$)/.test(path) &&
        (!/(^|\/)\.env(?:\.|$)/.test(path) || path.endsWith(".env.example")),
    )
    .sort((left, right) => left.localeCompare(right));
  const inventoryHash = createHash("sha256");
  let totalBytes = 0;
  let fileCount = 0;
  for (const path of paths) {
    const absolutePath = resolve(repositoryRoot, path);
    if (!existsSync(absolutePath)) continue;
    const stat = statSync(absolutePath);
    if (!stat.isFile()) continue;
    const contentHash = sha256File(absolutePath);
    inventoryHash.update(`${path}\0${stat.size}\0${contentHash}\n`);
    totalBytes += stat.size;
    fileCount += 1;
  }
  return {
    sha256: inventoryHash.digest("hex"),
    fileCount,
    totalBytes,
    scopes: SOURCE_INVENTORY_SCOPES,
    exclusions: SOURCE_INVENTORY_EXCLUSIONS,
    includesTrackedWorkingTreeContent: true,
    includesUntrackedSourceContent: true,
    includesIgnoredFiles: false,
  };
}

function jstTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+09:00`;
}

function runId(date = new Date()) {
  const instant = date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "");
  return `${instant}-jst-${randomUUID().slice(0, 8)}`;
}

function repoPath(path) {
  return relative(repositoryRoot, path).replaceAll("\\", "/");
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function findArtifact(directory, suffix) {
  const names = readdirSync(directory).filter((name) => name.endsWith(suffix));
  return names.length === 1 ? resolve(directory, names[0]) : null;
}

function completeReport(report) {
  const required = [
    report.categories?.performance?.score,
    report.categories?.accessibility?.score,
    report.categories?.["best-practices"]?.score,
    report.categories?.seo?.score,
    report.audits?.["largest-contentful-paint"]?.numericValue,
    report.audits?.["first-contentful-paint"]?.numericValue,
    report.audits?.["cumulative-layout-shift"]?.numericValue,
    report.audits?.["total-blocking-time"]?.numericValue,
  ];
  return !report.runtimeError && required.every((value) => typeof value === "number");
}

function sumTransfer(items, resourceType) {
  return items
    .filter((item) => item.resourceType === resourceType)
    .reduce((sum, item) => sum + (item.transferSize ?? 0), 0);
}

function lcpPhases(report) {
  const insight =
    report.audits?.["lcp-breakdown-insight"]?.details?.items?.[0]?.items;
  if (Array.isArray(insight)) {
    return insight.map((item) => ({
      phase: item.label ?? item.subpart ?? null,
      durationMs: round(item.duration ?? item.timing ?? 0),
    }));
  }
  const legacy =
    report.audits?.["largest-contentful-paint-element"]?.details?.items?.[1]
      ?.items;
  return Array.isArray(legacy)
    ? legacy.map((item) => ({
        phase: item.phase ?? item.subpart ?? null,
        durationMs: round(item.timing ?? item.duration ?? 0),
      }))
    : [];
}

function metricsFromReport(report, context) {
  const requests = report.audits?.["network-requests"]?.details?.items ?? [];
  const documentRequest = requests.find(
    (item) => item.resourceType === "Document",
  );
  const metrics = report.audits?.metrics?.details?.items?.[0] ?? {};
  const mainThreadItems =
    report.audits?.["mainthread-work-breakdown"]?.details?.items ?? [];
  const mainThreadGroups = Object.fromEntries(
    mainThreadItems.map((item) => [
      item.group ?? item.groupLabel ?? "unknown",
      round(item.duration ?? 0),
    ]),
  );
  const renderBlockingItems =
    report.audits?.["render-blocking-insight"]?.details?.items ?? [];
  const seoFailedAuditIds = (report.categories?.seo?.auditRefs ?? [])
    .filter((reference) => {
      if (!(reference.weight > 0)) return false;
      return report.audits?.[reference.id]?.score !== 1;
    })
    .map((reference) => reference.id)
    .sort();
  return {
    ...context,
    performance: round(report.categories.performance.score * 100, 0),
    accessibility: round(report.categories.accessibility.score * 100, 0),
    bestPractices: round(
      report.categories["best-practices"].score * 100,
      0,
    ),
    seo: round(report.categories.seo.score * 100, 0),
    seoFailedAuditIds,
    lanternSimulatedLcpMs: round(
      report.audits["largest-contentful-paint"].numericValue,
    ),
    chromeObservedLcpMs: round(metrics.observedLargestContentfulPaint ?? 0),
    fcpMs: round(report.audits["first-contentful-paint"].numericValue),
    chromeObservedFcpMs: round(metrics.observedFirstContentfulPaint ?? 0),
    ttfbMs: round(
      report.audits["server-response-time"]?.numericValue ??
        ((documentRequest?.networkEndTime ?? 0) -
          (documentRequest?.networkRequestTime ?? 0)),
    ),
    cls: round(report.audits["cumulative-layout-shift"].numericValue, 3),
    tbtMs: round(report.audits["total-blocking-time"].numericValue),
    mainThreadWorkMs: round(
      report.audits["mainthread-work-breakdown"]?.numericValue ?? 0,
    ),
    bootupTimeMs: round(report.audits["bootup-time"]?.numericValue ?? 0),
    routePayloadBytes: documentRequest?.transferSize ?? 0,
    totalTransferredBytes:
      report.audits["total-byte-weight"]?.numericValue ?? 0,
    javascriptTransferredBytes: sumTransfer(requests, "Script"),
    cssTransferredBytes: sumTransfer(requests, "Stylesheet"),
    fontTransferredBytes: sumTransfer(requests, "Font"),
    requestCount: requests.length,
    lcpPhases: lcpPhases(report),
    mainThreadGroups,
    scriptEvaluationMs: mainThreadGroups.scriptEvaluation ?? 0,
    styleLayoutMs: mainThreadGroups.styleLayout ?? 0,
    parseHtmlCssMs: mainThreadGroups.parseHTML ?? 0,
    hydration: {
      explicitTraceMarkerAvailable: false,
      upperBoundMetric:
        "scriptEvaluationMs (React hydration is not separately marked in the Lighthouse trace)",
    },
    font: {
      transferredBytes: sumTransfer(requests, "Font"),
      displayInsightAvailable: Boolean(
        report.audits?.["font-display-insight"]?.details?.items?.length,
      ),
    },
    renderBlockingCss: renderBlockingItems.map((item) => ({
      url: item.url ?? null,
      totalBytes: item.totalBytes ?? item.transferSize ?? 0,
      wastedMs: item.wastedMs ?? item.wastedTime ?? null,
    })),
    serverTiming: null,
    serverTimingNote:
      "Lighthouse network-requests does not expose a Server-Timing header for this response; document TTFB is recorded separately.",
  };
}

function verifySession(sessionPath) {
  const summaryPath = resolve(sessionPath, "lighthouse-summary.json");
  const summaryHashPath = resolve(sessionPath, "lighthouse-summary.sha256");
  if (!existsSync(summaryPath)) {
    throw new Error(`summary not found: ${summaryPath}`);
  }
  const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
  const failures = [];
  if (!existsSync(summaryHashPath)) {
    failures.push({ path: summaryHashPath, reason: "missing-summary-hash" });
  } else {
    const recordedSummaryHash = readFileSync(summaryHashPath, "utf8")
      .trim()
      .split(/\s+/)[0];
    if (recordedSummaryHash !== sha256File(summaryPath)) {
      failures.push({ path: summaryPath, reason: "summary-sha256-mismatch" });
    }
  }
  for (const item of summary.runs ?? []) {
    for (const artifact of item.artifacts ?? []) {
      const absolute = resolve(repositoryRoot, artifact.path);
      if (!existsSync(absolute)) {
        failures.push({ path: artifact.path, reason: "missing" });
      } else if (sha256File(absolute) !== artifact.sha256) {
        failures.push({ path: artifact.path, reason: "sha256-mismatch" });
      }
    }
  }
  process.stdout.write(
    `${JSON.stringify(
      {
        sessionPath,
        checkedArtifacts: (summary.runs ?? []).reduce(
          (count, item) => count + (item.artifacts?.length ?? 0),
          0,
        ),
        failures,
        valid: failures.length === 0,
      },
      null,
      2,
    )}\n`,
  );
  if (failures.length > 0) process.exitCode = 1;
}

if (process.env.LIGHTHOUSE_VERIFY_SESSION) {
  verifySession(resolve(process.cwd(), process.env.LIGHTHOUSE_VERIFY_SESSION));
  process.exit();
}

if (process.env.LIGHTHOUSE_SOURCE_INVENTORY_ONLY === "1") {
  process.stdout.write(`${JSON.stringify(sourceInventory(), null, 2)}\n`);
  process.exit();
}

// Capture the tree identity before creating this session so the session does
// not alter its own provenance hash.
const sourceTreeInventory = sourceInventory();
const provenance = {
  gitHead: git(["rev-parse", "HEAD"]).trim(),
  gitStatusSha256: sha256Bytes(
    git(["status", "--porcelain=v2", "--untracked-files=all"]),
  ),
  gitDiffSha256: sha256Bytes(
    git(["diff", "--binary", "--no-ext-diff", "--"]),
  ),
  sourceInventorySha256: sourceTreeInventory.sha256,
  sourceInventoryFileCount: sourceTreeInventory.fileCount,
  sourceInventoryTotalBytes: sourceTreeInventory.totalBytes,
  sourceInventoryScopes: sourceTreeInventory.scopes,
  sourceInventoryExclusions: sourceTreeInventory.exclusions,
  sourceInventoryIncludesTrackedWorkingTreeContent:
    sourceTreeInventory.includesTrackedWorkingTreeContent,
  sourceInventoryIncludesUntrackedSourceContent:
    sourceTreeInventory.includesUntrackedSourceContent,
  sourceInventoryIncludesIgnoredFiles:
    sourceTreeInventory.includesIgnoredFiles,
  buildId: existsSync(resolve(process.cwd(), ".next/BUILD_ID"))
    ? readFileSync(resolve(process.cwd(), ".next/BUILD_ID"), "utf8").trim()
    : null,
};

const sessionId = runId();
const kindRoot = resolve(evidenceRoot, runKind);
mkdirSync(kindRoot, { recursive: true });
const sessionRoot = resolve(kindRoot, sessionId);
mkdirSync(sessionRoot, { recursive: false });

const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const runRecords = [];
const adoptedMetrics = [];
const executionFailures = [];

for (const page of pages) {
  for (const profile of profiles) {
    for (let runNumber = 1; runNumber <= runsPerProfile; runNumber += 1) {
      for (
        let attemptNumber = 1;
        attemptNumber <= attemptsPerRun;
        attemptNumber += 1
      ) {
      const measurementId = `${page.id}-${profile}-${runNumber}-attempt${attemptNumber}-${randomUUID().slice(0, 8)}`;
      const measurementRoot = resolve(sessionRoot, measurementId);
      mkdirSync(measurementRoot, { recursive: false });
      const outputBase = resolve(measurementRoot, "report");
      const logPath = resolve(measurementRoot, "execution.log");
      const manifestPath = resolve(measurementRoot, "run-manifest.json");
      const startedAt = new Date();
      const args = [
        "--yes",
        `lighthouse@${LIGHTHOUSE_VERSION}`,
        `${baseUrl}${page.path}`,
        "--quiet",
        "--output=json",
        "--output=html",
        `--output-path=${outputBase}`,
        "--save-assets",
        "--only-categories=performance,accessibility,best-practices,seo",
        "--chrome-flags=--headless=new --no-sandbox --disable-gpu",
      ];
      if (profile === "desktop") args.push("--preset=desktop");

      const result = run(npxCommand, args, {
        shell: process.platform === "win32",
      });
      const finishedAt = new Date();
      writeFileSync(
        logPath,
        [
          `startedAtJst=${jstTimestamp(startedAt)}`,
          `finishedAtJst=${jstTimestamp(finishedAt)}`,
          `measurementId=${measurementId}`,
          `exitCode=${result.status ?? 1}`,
          `signal=${result.signal ?? ""}`,
          `error=${result.error?.message ?? ""}`,
          "",
          result.stdout ?? "",
          result.stderr ?? "",
        ].join("\n"),
        { encoding: "utf8", flag: "wx" },
      );

      const reportPath = findArtifact(measurementRoot, ".report.json");
      const tracePath = findArtifact(measurementRoot, ".trace.json");
      const htmlPath = findArtifact(measurementRoot, ".report.html");
      const devtoolsLogPath = findArtifact(measurementRoot, ".devtoolslog.json");
      let report = null;
      let reportIsComplete = false;
      try {
        report = reportPath
          ? JSON.parse(readFileSync(reportPath, "utf8"))
          : null;
        reportIsComplete = Boolean(report && completeReport(report));
      } catch {
        reportIsComplete = false;
      }
      const executionSucceeded = result.status === 0;
      const artifactsComplete = Boolean(reportPath && tracePath && htmlPath);
      const eligible = executionSucceeded && reportIsComplete && artifactsComplete;
      const adopted = eligible && runKind !== "diagnostic";
      const artifactPaths = [
        reportPath,
        tracePath,
        htmlPath,
        devtoolsLogPath,
        logPath,
      ].filter(Boolean);
      const artifacts = artifactPaths.map((path) => ({
        name: basename(path),
        path: repoPath(path),
        sha256: sha256File(path),
      }));
      const rawArtifact = artifacts.find((item) =>
        item.name.endsWith(".report.json"),
      );
      const traceArtifact = artifacts.find((item) =>
        item.name.endsWith(".trace.json"),
      );
      const chromeVersion =
        report?.environment?.hostUserAgent?.match(
          /(?:Chrome|Chromium)\/([0-9.]+)/,
        )?.[1] ?? null;
      const manifest = {
        schemaVersion: 1,
        sessionId,
        measurementId,
        runId: measurementId,
        runKind,
        executedAtJst: jstTimestamp(startedAt),
        finishedAtJst: jstTimestamp(finishedAt),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        ...provenance,
        route: page.path,
        pageId: page.id,
        profile,
        runNumber,
        attemptNumber,
        lighthouseVersion: report?.lighthouseVersion ?? LIGHTHOUSE_VERSION,
        chromeVersion,
        nodeVersion: process.version,
        os: {
          platform: platform(),
          release: release(),
          arch: arch(),
          hostname: hostname(),
        },
        throttling: report?.configSettings?.throttling ?? null,
        throttlingMethod:
          report?.configSettings?.throttlingMethod ??
          (profile === "mobile" ? "simulate" : null),
        serverCommand,
        serverPid,
        reportRawPath: rawArtifact?.path ?? null,
        tracePath: traceArtifact?.path ?? null,
        reportRawSha256: rawArtifact?.sha256 ?? null,
        traceSha256: traceArtifact?.sha256 ?? null,
        cliExitCode: result.status ?? 1,
        success: eligible,
        adopted,
        baseline: runKind === "baseline",
        final: runKind === "final",
        superseded: false,
        supersededBy: null,
        exclusionReason: eligible
          ? null
          : !executionSucceeded
            ? "execution-failure"
            : !reportIsComplete
              ? "incomplete-report"
              : "missing-raw-or-trace",
        artifacts,
      };
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
        encoding: "utf8",
        flag: "wx",
      });
      const manifestArtifact = {
        name: basename(manifestPath),
        path: repoPath(manifestPath),
        sha256: sha256File(manifestPath),
      };
      const record = {
        ...manifest,
        manifestPath: manifestArtifact.path,
        manifestSha256: manifestArtifact.sha256,
        artifacts: [...artifacts, manifestArtifact],
      };
      runRecords.push(record);

      if (eligible && report) {
        const metrics = metricsFromReport(report, {
          measurementId,
          page: page.id,
          path: page.path,
          profile,
          runNumber,
          reportRawPath: rawArtifact.path,
          reportRawSha256: rawArtifact.sha256,
          tracePath: traceArtifact.path,
          traceSha256: traceArtifact.sha256,
        });
        if (adopted) adoptedMetrics.push(metrics);
        process.stdout.write(
          `completed ${measurementId}: simulated LCP=${metrics.lanternSimulatedLcpMs} observed LCP=${metrics.chromeObservedLcpMs}\n`,
        );
      } else {
        const failure = {
          measurementId,
          exitCode: result.status ?? 1,
          exclusionReason: manifest.exclusionReason,
          logPath: repoPath(logPath),
        };
        executionFailures.push(failure);
        process.stdout.write(`excluded ${measurementId}: ${manifest.exclusionReason}\n`);
      }
      if (eligible) break;
      }
    }
  }
}

const medians = [];
const targetFailures = [];
for (const page of pages) {
  for (const profile of profiles) {
    const rows = adoptedMetrics.filter(
      (row) => row.page === page.id && row.profile === profile,
    );
    if (rows.length !== runsPerProfile) continue;
    const summary = {
      page: page.id,
      path: page.path,
      profile,
      adoptedRunCount: rows.length,
      reportRawReferences: rows.map((row) => ({
        path: row.reportRawPath,
        sha256: row.reportRawSha256,
      })),
      lanternSimulatedLcpMs: median(
        rows.map((row) => row.lanternSimulatedLcpMs),
      ),
      chromeObservedLcpMs: median(
        rows.map((row) => row.chromeObservedLcpMs),
      ),
      fcpMs: median(rows.map((row) => row.fcpMs)),
      chromeObservedFcpMs: median(
        rows.map((row) => row.chromeObservedFcpMs),
      ),
      ttfbMs: median(rows.map((row) => row.ttfbMs)),
      cls: median(rows.map((row) => row.cls)),
      tbtMs: median(rows.map((row) => row.tbtMs)),
      performance: median(rows.map((row) => row.performance)),
      accessibility: median(rows.map((row) => row.accessibility)),
      bestPractices: median(rows.map((row) => row.bestPractices)),
      seo: median(rows.map((row) => row.seo)),
      seoFailedAuditIds: [
        ...new Set(rows.flatMap((row) => row.seoFailedAuditIds ?? [])),
      ].sort(),
      javascriptTransferredBytes: median(
        rows.map((row) => row.javascriptTransferredBytes),
      ),
      cssTransferredBytes: median(
        rows.map((row) => row.cssTransferredBytes),
      ),
      routePayloadBytes: median(rows.map((row) => row.routePayloadBytes)),
      totalTransferredBytes: median(
        rows.map((row) => row.totalTransferredBytes),
      ),
      mainThreadWorkMs: median(rows.map((row) => row.mainThreadWorkMs)),
      bootupTimeMs: median(rows.map((row) => row.bootupTimeMs)),
      scriptEvaluationMs: median(rows.map((row) => row.scriptEvaluationMs)),
      styleLayoutMs: median(rows.map((row) => row.styleLayoutMs)),
      parseHtmlCssMs: median(rows.map((row) => row.parseHtmlCssMs)),
      hydration: rows.map((row) => row.hydration),
      fontRuns: rows.map((row) => row.font),
      renderBlockingCssRuns: rows.map((row) => row.renderBlockingCss),
      serverTiming: null,
      lcpPhaseRuns: rows.map((row) => row.lcpPhases),
      targets: {
        performance: profile === "mobile" ? 90 : null,
        // Keep the simulated LCP budget visible for diagnosis. Release
        // acceptance follows the requested Lighthouse Performance score plus
        // the explicit CLS/TBT budgets below; observed LCP remains recorded.
        lcpAdvisoryMs: profile === "mobile" ? page.mobileLcpTargetMs : null,
        cls: 0.1,
        tbtMs: 200,
        accessibility: 100,
        bestPractices: 100,
        seo: 100,
        requiredNoindex: page.requiredNoindex === true,
      },
    };
    const noindexSeoPolicyCompliant =
      page.requiredNoindex === true &&
      rows.every(
        (row) =>
          row.seoFailedAuditIds?.length === 1 &&
          row.seoFailedAuditIds[0] === "is-crawlable",
      );
    summary.seoPolicyCompliant =
      noindexSeoPolicyCompliant || summary.seo === 100;
    medians.push(summary);
    const failures = [];
    if (profile === "mobile" && summary.performance < 90) {
      failures.push(`Performance ${summary.performance} < 90`);
    }
    if (summary.cls > 0.1) failures.push(`CLS ${summary.cls} > 0.1`);
    if (summary.tbtMs > 200) failures.push(`TBT ${summary.tbtMs} > 200`);
    if (summary.accessibility !== 100) {
      failures.push(`Accessibility ${summary.accessibility} != 100`);
    }
    if (summary.bestPractices !== 100) {
      failures.push(`Best Practices ${summary.bestPractices} != 100`);
    }
    if (!summary.seoPolicyCompliant) {
      failures.push(
        `SEO ${summary.seo} != 100 (failed: ${summary.seoFailedAuditIds.join(",") || "unknown"})`,
      );
    }
    if (failures.length > 0) {
      targetFailures.push({ page: page.id, profile, failures });
    }
  }
}

const expectedRunCount = pages.length * profiles.length * runsPerProfile;
const summary = {
  schemaVersion: 1,
  generatedAtJst: jstTimestamp(),
  sessionId,
  runKind,
  sessionPath: repoPath(sessionRoot),
  baseUrl,
  provenance,
  method: {
    profiles,
    runsPerProfile,
    attemptsPerRun,
    aggregation: "同一route/profileの採用済み3回（既定）の中央値",
    concurrentLighthouseRuns: 1,
    incompleteRunsIncluded: false,
    executionFailuresIncluded: false,
    rawMutationDetection: "summary内のraw/trace SHA-256とverify mode",
  },
  expectedRunCount,
  successfulRunCount: runRecords.filter((item) => item.success).length,
  adoptedRunCount: runRecords.filter((item) => item.adopted).length,
  executionFailures,
  executionFailureExclusionRecorded: executionFailures.length > 0,
  runs: runRecords,
  medians,
  targetFailures,
  executionsComplete:
    runRecords.filter((item) => item.adopted).length === expectedRunCount &&
    medians.length === pages.length * profiles.length,
  allTargetsMet:
    runRecords.filter((item) => item.adopted).length === expectedRunCount &&
    medians.length === pages.length * profiles.length &&
    targetFailures.length === 0,
  legacyEvidenceGap: {
    affectedRawReports: 4,
    restored: false,
    note: "2026-07-26以前の上書き済み4件は厳密復元できず、legacy evidence gapとして維持する。",
  },
};
const summaryPath = resolve(sessionRoot, "lighthouse-summary.json");
writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, {
  encoding: "utf8",
  flag: "wx",
});
const summaryHashPath = resolve(sessionRoot, "lighthouse-summary.sha256");
writeFileSync(
  summaryHashPath,
  `${sha256File(summaryPath)}  ${basename(summaryPath)}\n`,
  { encoding: "utf8", flag: "wx" },
);

process.stdout.write(
  `${JSON.stringify(
    {
      summaryPath,
      summarySha256: sha256File(summaryPath),
      expectedRunCount,
      successfulRunCount: summary.successfulRunCount,
      adoptedRunCount: summary.adoptedRunCount,
      executionFailureCount: executionFailures.length,
      targetFailureCount: targetFailures.length,
      allTargetsMet: summary.allTargetsMet,
    },
    null,
    2,
  )}\n`,
);
const enforceTargets = process.env.LIGHTHOUSE_ENFORCE_TARGETS !== "0";
if (
  !summary.executionsComplete ||
  summary.adoptedRunCount !== expectedRunCount ||
  (enforceTargets && !summary.allTargetsMet)
) {
  process.exitCode = 1;
}
