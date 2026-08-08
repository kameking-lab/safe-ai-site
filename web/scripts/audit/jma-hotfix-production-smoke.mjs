#!/usr/bin/env node

/**
 * Read-only production smoke for the late JMA schema hotfix.
 *
 * Only GET requests are made. Response bodies are reduced to non-PII release
 * facts before the evidence report is written.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function readArgument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const baseUrl = new URL(
  readArgument("base-url") ?? "https://www.anzen-ai-portal.jp",
);
if (
  baseUrl.protocol !== "https:" ||
  baseUrl.hostname !== "www.anzen-ai-portal.jp"
) {
  throw new Error("--base-url must be https://www.anzen-ai-portal.jp");
}

const deploymentId = readArgument("deployment-id");
if (!/^dpl_[A-Za-z0-9]+$/.test(deploymentId ?? "")) {
  throw new Error("--deployment-id must be an exact Vercel deployment ID");
}

const outputPath = path.resolve(
  readArgument("output") ??
    "../docs/audits/evidence/japan-leading-safety-site-2026-07-30/production/jma-hotfix-production-smoke.json",
);

async function request(route) {
  try {
    const response = await fetch(new URL(route, baseUrl), {
      headers: {
        "user-agent": "safe-ai-jma-hotfix-production-smoke/2026-07-30",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(45_000),
    });
    return {
      status: response.status,
      body: await response.text(),
      headers: {
        xDataSource: response.headers.get("x-data-source"),
        xRobotsTag: response.headers.get("x-robots-tag"),
        previewMode: response.headers.get("x-safe-ai-preview-mode"),
      },
    };
  } catch (error) {
    return {
      status: null,
      body: "",
      headers: {},
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function firstGeneralRobotsGroup(body) {
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

function metaRobots(html) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const tag = tags.find(
    (candidate) =>
      /\bname=["']robots["']/i.test(candidate) ||
      /\bname=["']googlebot["']/i.test(candidate),
  );
  return tag?.match(/\bcontent=["']([^"']*)["']/i)?.[1] ?? "";
}

const checks = [];
function record(id, passed, evidence) {
  checks.push({ id, passed: Boolean(passed), evidence });
}

const routePaths = [
  "/",
  "/risk",
  "/signage",
  "/chatbot",
  "/chemical-ra",
  "/training/visual-ky",
  "/services/automation",
  "/heat-illness-prevention",
];
const [
  ...responses
] = await Promise.all([
  ...routePaths.map((route) => request(route)),
  request("/robots.txt"),
  request("/sitemap.xml"),
  request("/api/signage/jma"),
]);
const routeResponses = responses.slice(0, routePaths.length);
const robots = responses.at(routePaths.length);
const sitemap = responses.at(routePaths.length + 1);
const jma = responses.at(routePaths.length + 2);

routePaths.forEach((route, index) => {
  const response = routeResponses[index];
  record(
    `${route}:production-boundary`,
    response.status === 200 &&
      !response.headers.previewMode &&
      !/noindex/i.test(response.headers.xRobotsTag ?? ""),
    {
      status: response.status,
      previewMode: response.headers.previewMode ?? null,
      xRobotsTag: response.headers.xRobotsTag ?? null,
      error: response.error ?? null,
    },
  );
});

const generalRobotsGroup = firstGeneralRobotsGroup(robots.body);
record(
  "robots:production-indexing",
  robots.status === 200 &&
    generalRobotsGroup.some((line) => /^Allow:\s*\/$/i.test(line)) &&
    !generalRobotsGroup.some((line) => /^Disallow:\s*\/$/i.test(line)),
  { status: robots.status, generalRobotsGroup },
);
record(
  "sitemap:present",
  sitemap.status === 200 &&
    /<urlset\b/i.test(sitemap.body) &&
    sitemap.body.includes("https://www.anzen-ai-portal.jp"),
  { status: sitemap.status },
);

const heat = routeResponses.at(routePaths.indexOf("/heat-illness-prevention"));
const heatRobots = `${heat.headers.xRobotsTag ?? ""} ${metaRobots(heat.body)}`;
record("heat:noindex-maintained", /noindex/i.test(heatRobots), {
  xRobotsTag: heat.headers.xRobotsTag ?? null,
  metaRobots: metaRobots(heat.body),
});

const automation = routeResponses.at(
  routePaths.indexOf("/services/automation"),
);
const mailDraftForm = /<form[^>]+action="\/contact\/automation-email\/draft"/i.test(
  automation.body,
);
record(
  "automation:mail-contact-no-web-intake",
  /メール相談受付中/.test(automation.body) &&
    mailDraftForm &&
    !/name="email"/i.test(automation.body),
  {
    mailContactPresent: /メール相談受付中/.test(automation.body),
    mailDraftForm,
    webEmailFieldPresent: /name="email"/i.test(automation.body),
  },
);

let jmaPayload = null;
try {
  jmaPayload = JSON.parse(jma.body);
} catch {
  jmaPayload = null;
}
const regions = Object.values(jmaPayload?.warnings?.byIso ?? {});
const nonLive = regions.filter((region) => region?.sourceStatus !== "live");
const issues = [
  ...new Set(nonLive.map((region) => region?.sourceIssue).filter(Boolean)),
].sort();
const warningQuality = jmaPayload?.warnings?.quality?.status ?? null;
const warningTrust = jmaPayload?.trust?.warnings?.status ?? null;
const jmaEvidence = {
  status: jma.status,
  dataSource: jma.headers.xDataSource ?? null,
  degraded: jmaPayload?.degraded ?? null,
  warningQuality,
  warningTrust,
  regionCount: regions.length,
  liveCount: regions.length - nonLive.length,
  nonLiveCount: nonLive.length,
  nonLiveWithoutIssue: nonLive.filter((region) => !region?.sourceIssue).length,
  issueKinds: issues,
};
record("jma:http-200", jma.status === 200, jmaEvidence);
record(
  "jma:2026-status-no-schema-mismatch",
  !issues.includes("schema-mismatch"),
  jmaEvidence,
);
record(
  "jma:failure-state-explicit",
  regions.length === 47 &&
    nonLive.every((region) => Boolean(region?.sourceIssue)),
  jmaEvidence,
);
record(
  "jma:degraded-never-reported-live",
  warningQuality === "live" ||
    (jmaPayload?.degraded === true && warningTrust !== "live"),
  jmaEvidence,
);

const failures = checks.filter((check) => !check.passed);
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  mode: "read-only-production-hotfix-smoke",
  baseUrl: baseUrl.origin,
  deploymentId,
  passed: failures.length === 0,
  passedCount: checks.length - failures.length,
  failedCount: failures.length,
  jma: jmaEvidence,
  checks,
  failures,
};
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(
  `${JSON.stringify({
    passed: report.passed,
    passedCount: report.passedCount,
    failedCount: report.failedCount,
    jma: report.jma,
    failures: report.failures,
    output: outputPath,
  })}\n`,
);
if (!report.passed) process.exitCode = 1;
