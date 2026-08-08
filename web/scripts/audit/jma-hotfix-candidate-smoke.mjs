#!/usr/bin/env node

/**
 * Authenticated read-only smoke for the late JMA schema hotfix candidate.
 *
 * Protected deployment requests go through `vercel curl`. This script performs
 * GET requests only, never prints response bodies, and records a redacted
 * release-evidence summary.
 */
import { spawn } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

function readArgument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const deployment = readArgument("deployment");
if (!/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(deployment ?? "")) {
  throw new Error("--deployment must be an exact Vercel deployment URL");
}

const deploymentId = readArgument("deployment-id");
if (!/^dpl_[A-Za-z0-9]+$/.test(deploymentId ?? "")) {
  throw new Error("--deployment-id must be an exact Vercel deployment ID");
}

const outputPath = path.resolve(
  readArgument("output") ??
    "../docs/audits/evidence/japan-leading-safety-site-2026-07-30/production/jma-hotfix-candidate-smoke.json",
);
const repositoryRoot = path.resolve(process.cwd(), "..");
const temporaryRoot = await mkdtemp(
  path.join(tmpdir(), "safe-ai-jma-hotfix-candidate-"),
);
let requestSequence = 0;

function vercelCommand() {
  if (process.platform !== "win32") {
    return { command: "vercel", prefix: [] };
  }
  const entry = path.join(
    process.env.APPDATA ?? "",
    "npm",
    "node_modules",
    "vercel",
    "dist",
    "vc.js",
  );
  return { command: process.execPath, prefix: [entry] };
}

function runVercelCurl(requestPath) {
  return new Promise((resolve, reject) => {
    requestSequence += 1;
    const headerPath = path.join(temporaryRoot, `${requestSequence}.headers`);
    const bodyPath = path.join(temporaryRoot, `${requestSequence}.body`);
    const executable = vercelCommand();
    const args = [
      ...executable.prefix,
      "curl",
      requestPath,
      "--deployment",
      deployment,
      "--",
      "--silent",
      "--show-error",
      "--dump-header",
      headerPath,
      "--output",
      bodyPath,
    ];
    const child = spawn(executable.command, args, {
      cwd: repositoryRoot,
      windowsHide: true,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      if (stderr.length < 2_000) stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", async (code) => {
      try {
        if (code !== 0) {
          throw new Error(
            `vercel curl failed with exit code ${code}: ${stderr.trim()}`,
          );
        }
        const [rawHeaders, body] = await Promise.all([
          readFile(headerPath, "utf8"),
          readFile(bodyPath, "utf8"),
        ]);
        resolve({ rawHeaders, body });
      } catch (error) {
        reject(error);
      } finally {
        await Promise.all([
          unlink(headerPath).catch(() => undefined),
          unlink(bodyPath).catch(() => undefined),
        ]);
      }
    });
  });
}

function responseSummary(response) {
  const statuses = [
    ...response.rawHeaders.matchAll(/^HTTP\/\S+\s+(\d{3})/gim),
  ];
  const header = (name) => {
    const matches = [
      ...response.rawHeaders.matchAll(
        new RegExp(`^${name}:\\s*([^\\r\\n]+)`, "gim"),
      ),
    ];
    return matches.at(-1)?.[1]?.trim() ?? null;
  };
  return {
    status: Number(statuses.at(-1)?.[1] ?? 0),
    xDataSource: header("X-Data-Source"),
    xRobotsTag: header("X-Robots-Tag"),
  };
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

const checks = [];
function record(id, passed, evidence) {
  checks.push({ id, passed: Boolean(passed), evidence });
}

try {
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
    ...routePaths.map((route) => runVercelCurl(route)),
    runVercelCurl("/robots.txt"),
    runVercelCurl("/sitemap.xml"),
    runVercelCurl("/api/signage/jma"),
  ]);
  const routeResponses = responses.slice(0, routePaths.length);
  const robots = responses.at(routePaths.length);
  const sitemap = responses.at(routePaths.length + 1);
  const jma = responses.at(routePaths.length + 2);

  routePaths.forEach((route, index) => {
    const summary = responseSummary(routeResponses[index]);
    record(`${route}:http-200`, summary.status === 200, {
      status: summary.status,
    });
  });

  const robotsSummary = responseSummary(robots);
  const generalRobotsGroup = firstGeneralRobotsGroup(robots.body);
  record("robots:http-200", robotsSummary.status === 200, {
    status: robotsSummary.status,
  });
  record(
    "robots:production-indexing",
    generalRobotsGroup.some((line) => /^Allow:\s*\/$/i.test(line)) &&
      !generalRobotsGroup.some((line) => /^Disallow:\s*\/$/i.test(line)),
    { generalRobotsGroup },
  );

  const sitemapSummary = responseSummary(sitemap);
  record(
    "sitemap:present",
    sitemapSummary.status === 200 &&
      /<urlset\b/i.test(sitemap.body) &&
      sitemap.body.includes("https://www.anzen-ai-portal.jp"),
    { status: sitemapSummary.status },
  );

  const heat = routeResponses.at(routePaths.indexOf("/heat-illness-prevention"));
  const heatSummary = responseSummary(heat);
  const heatRobots = `${heatSummary.xRobotsTag ?? ""} ${metaRobots(heat.body)}`;
  record("heat:noindex-maintained", /noindex/i.test(heatRobots), {
    xRobotsTag: heatSummary.xRobotsTag,
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

  const jmaSummary = responseSummary(jma);
  let jmaPayload = null;
  try {
    jmaPayload = JSON.parse(jma.body);
  } catch {
    jmaPayload = null;
  }
  const regions = Object.values(jmaPayload?.warnings?.byIso ?? {});
  const nonLive = regions.filter(
    (region) => region?.sourceStatus !== "live",
  );
  const issues = [
    ...new Set(nonLive.map((region) => region?.sourceIssue).filter(Boolean)),
  ].sort();
  const warningQuality = jmaPayload?.warnings?.quality?.status ?? null;
  const warningTrust = jmaPayload?.trust?.warnings?.status ?? null;
  const jmaEvidence = {
    status: jmaSummary.status,
    dataSource: jmaSummary.xDataSource,
    degraded: jmaPayload?.degraded ?? null,
    warningQuality,
    warningTrust,
    regionCount: regions.length,
    liveCount: regions.length - nonLive.length,
    nonLiveCount: nonLive.length,
    nonLiveWithoutIssue: nonLive.filter((region) => !region?.sourceIssue)
      .length,
    issueKinds: issues,
  };
  record("jma:http-200", jmaSummary.status === 200, jmaEvidence);
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
    mode: "authenticated-read-only-hotfix-candidate-smoke",
    deployment,
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
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
