#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const argv = process.argv.slice(2);
const option = (name, fallback) => {
  const prefix = `${name}=`;
  return argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
};
const outputPath = resolve(
  option(
    "--output",
    "../docs/audits/evidence/post-launch-growth-operations-2026-07-29/production-log-summary.json",
  ),
);

const input = await new Promise((resolveInput) => {
  let value = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    value += chunk;
  });
  process.stdin.on("end", () => resolveInput(value));
});

function operationalRoute(value) {
  const pathname = String(value ?? "").split(/[?#]/, 1)[0];
  const exact = new Set([
    "/",
    "/api/automation-consult",
    "/api/rum",
    "/api/ky/workers",
    "/api/weather",
    "/api/weather-forecast",
    "/api/signage/jma",
    "/api/cron/signage-weather",
    "/api/chemical-ra",
    "/api/chatbot",
    "/api/csp-report",
    "/api/health",
    "/ky/list",
    "/ky/paper",
    "/chemical-ra",
    "/chatbot",
    "/services/automation",
    "/signage",
    "/risk",
  ]);
  if (exact.has(pathname)) return pathname;
  if (pathname.startsWith("/api/accidents")) return "/api/accidents/[operation]";
  if (pathname.startsWith("/api/")) return "/api/[other]";
  if (pathname.startsWith("/_next/")) return "/_next/[asset]";
  return "/[public-page]";
}

function increment(record, key) {
  record[key] = (record[key] ?? 0) + 1;
}

const records = [];
let invalidLines = 0;
for (const line of String(input).split(/\r?\n/)) {
  if (!line.trim()) continue;
  try {
    const raw = JSON.parse(line);
    records.push({
      timestamp: Number(raw.timestamp),
      deploymentId:
        typeof raw.deploymentId === "string" &&
        /^dpl_[A-Za-z0-9]{8,80}$/.test(raw.deploymentId)
          ? raw.deploymentId
          : "unknown",
      environment: raw.environment === "production" ? "production" : "other",
      source:
        typeof raw.source === "string" && /^[a-z-]{1,40}$/.test(raw.source)
          ? raw.source
          : "unknown",
      level:
        typeof raw.level === "string" && /^[a-z]{1,20}$/.test(raw.level)
          ? raw.level
          : "unknown",
      method:
        typeof raw.requestMethod === "string" &&
        /^(?:GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)$/.test(raw.requestMethod)
          ? raw.requestMethod
          : "unknown",
      route: operationalRoute(raw.requestPath),
      status: Number.isInteger(raw.responseStatusCode)
        ? raw.responseStatusCode
        : 0,
    });
  } catch {
    invalidLines += 1;
  }
}

const statusClasses = {};
const exactStatuses = {};
const routes = {};
const sources = {};
const levels = {};
const methods = {};
const deploymentIds = {};
for (const record of records) {
  increment(statusClasses, record.status ? `${Math.floor(record.status / 100)}xx` : "unknown");
  increment(exactStatuses, String(record.status || "unknown"));
  increment(routes, record.route);
  increment(sources, record.source);
  increment(levels, record.level);
  increment(methods, record.method);
  increment(deploymentIds, record.deploymentId);
}

function countWhere(predicate) {
  return records.filter(predicate).length;
}

const repeatedGroups = Object.entries(
  records.reduce((groups, record) => {
    const key = `${record.method} ${record.route} ${record.status}`;
    groups[key] = (groups[key] ?? 0) + 1;
    return groups;
  }, {}),
)
  .filter(([, count]) => count >= 5)
  .sort((left, right) => right[1] - left[1])
  .slice(0, 20)
  .map(([group, count]) => ({
    group,
    count,
    classification: "likely-automated-monitor-or-smoke",
    basis: "same coarse route, method and status repeated at least five times; user-agent unavailable",
  }));

const summary = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  scope: "vercel-production-currently-available-range",
  privacy: {
    rawMessagesPersisted: false,
    rawLogBodiesPersisted: false,
    rawQueryPersisted: false,
    rawPathIdentifiersPersisted: false,
    piiOrInputBodyCollected: false,
    routeStorage: "fixed coarse allowlist only",
  },
  recordCount: records.length,
  invalidJsonLineCount: invalidLines,
  observedFrom:
    records.length > 0
      ? new Date(Math.min(...records.map((record) => record.timestamp))).toISOString()
      : null,
  observedTo:
    records.length > 0
      ? new Date(Math.max(...records.map((record) => record.timestamp))).toISOString()
      : null,
  statusClasses,
  exactStatuses,
  routes,
  sources,
  levels,
  methods,
  deploymentIds,
  operationalSignals: {
    functionOrEdge5xx: countWhere(
      (record) =>
        record.status >= 500 &&
        record.status <= 599 &&
        /serverless|edge/.test(record.source),
    ),
    all5xx: countWhere((record) => record.status >= 500 && record.status <= 599),
    all4xx: countWhere((record) => record.status >= 400 && record.status <= 499),
    timeout504: countWhere((record) => record.status === 504),
    rateLimit429: countWhere((record) => record.status === 429),
    automationConsultUnavailable: countWhere(
      (record) =>
        record.route === "/api/automation-consult" && record.status === 503,
    ),
    rumUnavailable: countWhere(
      (record) => record.route === "/api/rum" && record.status === 503,
    ),
    jmaFailure: countWhere(
      (record) =>
        ["/api/signage/jma", "/api/cron/signage-weather"].includes(record.route) &&
        record.status >= 500,
    ),
    openMeteoFailure: countWhere(
      (record) =>
        ["/api/weather", "/api/weather-forecast"].includes(record.route) &&
        record.status >= 500,
    ),
    chatbotFailure: countWhere(
      (record) => record.route === "/api/chatbot" && record.status >= 500,
    ),
    chemicalRaFailure: countWhere(
      (record) => record.route === "/api/chemical-ra" && record.status >= 500,
    ),
    kyWorkerFailure: countWhere(
      (record) => record.route === "/api/ky/workers" && record.status >= 500,
    ),
    cspReportRequests: countWhere(
      (record) => record.route === "/api/csp-report",
    ),
    serviceWorkerError: "not-observable-from-sanitized-vercel-request-log",
    hydrationError: "not-observable-from-sanitized-vercel-request-log",
    browserConsoleError: "not-observable-from-sanitized-vercel-request-log",
    coldStart: "duration-and-init-fields-not-available-in-cli-schema",
  },
  trafficInterpretation: {
    repeatedGroups,
    userAgentAvailable: false,
    definitiveHumanVsBotClassification: false,
  },
};

mkdirSync(dirname(outputPath), { recursive: true });
const encoded = `${JSON.stringify(summary, null, 2)}\n`;
writeFileSync(outputPath, encoded, "utf8");
process.stdout.write(
  `${JSON.stringify({
    ok: true,
    recordCount: summary.recordCount,
    all5xx: summary.operationalSignals.all5xx,
    all4xx: summary.operationalSignals.all4xx,
    outputPath,
    sha256: createHash("sha256").update(encoded).digest("hex"),
    rawMessagesPersisted: false,
    piiOrInputBodyCollected: false,
  })}\n`,
);
