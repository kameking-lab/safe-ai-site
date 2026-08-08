#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

const baseUrl =
  process.env.RUM_SMOKE_BASE_URL ?? "https://www.anzen-ai-portal.jp";
const outputPath = resolve(
  process.env.RUM_SMOKE_OUTPUT_PATH ??
    "../docs/audits/evidence/external-operations-activation-2026-07-29/production-rum-network-smoke.json",
);
const origin = new URL(baseUrl).origin;
const consentKey = "safe-ai:optional-tracking-consent:v1";
const bucketKey = "safe-ai:rum-session-bucket:v1";
const exactPayloadKeys = [
  "anonymous_bucket",
  "build_id",
  "connection_class",
  "device_class",
  "metric",
  "navigation_type",
  "rating",
  "route_template",
  "value",
];
const cases = [
  {
    name: "no-consent",
    path: "/safety-ai",
    consent: null,
    expectedRequests: "none",
  },
  {
    name: "consented-allowlisted",
    path: "/safety-ai",
    consent: "granted",
    expectedRequests: "one-or-more",
  },
  {
    name: "consented-consultation-excluded",
    path: "/services/automation",
    consent: "granted",
    expectedRequests: "none",
  },
  {
    name: "consented-chemical-excluded",
    path: "/chemical-ra",
    consent: "granted",
    expectedRequests: "none",
  },
  {
    name: "consented-ky-excluded",
    path: "/ky/paper",
    consent: "granted",
    expectedRequests: "none",
  },
  {
    name: "consented-health-excluded",
    path: "/heat-illness-prevention",
    consent: "granted",
    expectedRequests: "none",
  },
  {
    name: "dnt-excluded",
    path: "/safety-ai",
    consent: "granted",
    doNotTrack: true,
    expectedRequests: "none",
  },
  {
    name: "gpc-excluded",
    path: "/safety-ai",
    consent: "granted",
    globalPrivacyControl: true,
    expectedRequests: "none",
  },
];

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const testCase of cases) {
    const context = await browser.newContext({
      locale: "ja-JP",
      serviceWorkers: "block",
      viewport: { width: 390, height: 844 },
    });
    await context.addInitScript(
      ({
        consent,
        consentKeyName,
        bucketKeyName,
        doNotTrack,
        gpc,
        forceSampledBucket,
      }) => {
        if (consent) localStorage.setItem(consentKeyName, consent);
        if (forceSampledBucket) {
          sessionStorage.setItem(
            bucketKeyName,
            "rum_000000000000000000000000",
          );
        }
        if (doNotTrack) {
          Object.defineProperty(Navigator.prototype, "doNotTrack", {
            configurable: true,
            get: () => "1",
          });
        }
        if (gpc) {
          Object.defineProperty(Navigator.prototype, "globalPrivacyControl", {
            configurable: true,
            get: () => true,
          });
        }
      },
      {
        consent: testCase.consent,
        consentKeyName: consentKey,
        bucketKeyName: bucketKey,
        doNotTrack: Boolean(testCase.doNotTrack),
        gpc: Boolean(testCase.globalPrivacyControl),
        forceSampledBucket:
          testCase.expectedRequests === "one-or-more",
      },
    );
    const page = await context.newPage();
    const payloads = [];
    const responseStatuses = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.origin !== origin || url.pathname !== "/api/rum") return;
      try {
        payloads.push(JSON.parse(request.postData() ?? "null"));
      } catch {
        payloads.push(null);
      }
    });
    page.on("response", (response) => {
      const url = new URL(response.url());
      if (url.origin === origin && url.pathname === "/api/rum") {
        responseStatuses.push(response.status());
      }
    });
    const response = await page.goto(`${origin}${testCase.path}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForTimeout(3_000);
    const anonymousBucketPresent = await page.evaluate(
      (key) => sessionStorage.getItem(key) !== null,
      bucketKey,
    );
    await page.goto("about:blank", {
      waitUntil: "load",
      timeout: 30_000,
    });
    await page.waitForTimeout(500);

    const payloadPrivacyValid = payloads.every((payload) => {
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return false;
      }
      const keys = Object.keys(payload).sort();
      return (
        keys.join(",") === exactPayloadKeys.join(",") &&
        payload.route_template === "/safety-ai" &&
        !JSON.stringify(payload).includes("?") &&
        !JSON.stringify(payload).includes("#") &&
        !JSON.stringify(payload).includes("@")
      );
    });
    const requestExpectationMet =
      testCase.expectedRequests === "none"
        ? payloads.length === 0
        : payloads.length > 0 &&
          responseStatuses.length === payloads.length &&
          responseStatuses.every((status) => status === 204);
    const storageExpectationMet =
      testCase.expectedRequests === "none"
        ? !anonymousBucketPresent
        : anonymousBucketPresent;
    results.push({
      name: testCase.name,
      routeTemplate: testCase.path,
      pageStatus: response?.status() ?? null,
      consent: testCase.consent === "granted",
      dnt: Boolean(testCase.doNotTrack),
      gpc: Boolean(testCase.globalPrivacyControl),
      expectedRequests: testCase.expectedRequests,
      rumRequestCount: payloads.length,
      rumResponseStatuses: responseStatuses,
      anonymousBucketPresent,
      payloadPrivacyValid,
      payloadKeyCount:
        payloads.length > 0 && payloads[0] && typeof payloads[0] === "object"
          ? Object.keys(payloads[0]).length
          : 0,
      metricNames: [
        ...new Set(
          payloads
            .map((payload) =>
              payload && typeof payload.metric === "string"
                ? payload.metric
                : null,
            )
            .filter(Boolean),
        ),
      ],
      passed:
        response?.status() === 200 &&
        requestExpectationMet &&
        storageExpectationMet &&
        payloadPrivacyValid,
    });
    await context.close();
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  baseUrl: origin,
  readinessExpectation: "active-consent-only",
  strictPayloadKeys: exactPayloadKeys,
  checkCount: results.length,
  passedCount: results.filter((result) => result.passed).length,
  failedCount: results.filter((result) => !result.passed).length,
  passed: results.every((result) => result.passed),
  guarantees: {
    fullUrlsIncluded: false,
    queryIncluded: false,
    fragmentsIncluded: false,
    piiIncluded: false,
    formBodiesIncluded: false,
    sensitiveRoutesExcluded: true,
  },
  results,
};
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(
  `${JSON.stringify({
    outputPath,
    checkCount: report.checkCount,
    passedCount: report.passedCount,
    failedCount: report.failedCount,
    passed: report.passed,
    guarantees: report.guarantees,
  })}\n`,
);
if (!report.passed) process.exitCode = 1;
