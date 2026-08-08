#!/usr/bin/env node

/**
 * Targeted closure for the three production-smoke harness false positives.
 * GET/browser-only: no mutation, form submission, AI call, mail, push, or payment.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const argv = process.argv.slice(2);
const readOption = (name, fallback) => {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : fallback;
};
const baseUrl = new URL(
  readOption("base-url", "https://www.anzen-ai-portal.jp"),
);
if (
  baseUrl.protocol !== "https:" ||
  baseUrl.hostname !== "www.anzen-ai-portal.jp"
) {
  throw new Error("This closure only runs against the production origin");
}
const outputPath = path.resolve(
  readOption(
    "output",
    "../docs/audits/evidence/japan-leading-safety-site-2026-07-30/production/target-closures/smoke-harness-closure.json",
  ),
);
mkdirSync(path.dirname(outputPath), { recursive: true });

const checks = [];
const failures = [];
function record(id, passed, evidence) {
  const item = { id, passed: Boolean(passed), evidence };
  checks.push(item);
  if (!item.passed) failures.push(item);
}

const robotsResponse = await fetch(new URL("/robots.txt", baseUrl), {
  headers: {
    "user-agent": "safe-ai-production-smoke-target-closure/2026-07-30",
  },
  signal: AbortSignal.timeout(30_000),
});
const robotsBody = await robotsResponse.text();
const robotsGroups = robotsBody
  .trim()
  .split(/\r?\n\s*\r?\n/)
  .map((group) => group.split(/\r?\n/).map((line) => line.trim()));
const generalRules =
  robotsGroups.find((group) =>
    group.some((line) => /^User-Agent:\s*\*$/i.test(line)),
  ) ?? [];
record(
  "robots:production-root-allowed",
  robotsResponse.status === 200 &&
    generalRules.some((line) => /^Allow:\s*\/$/i.test(line)) &&
    !generalRules.some((line) => /^Disallow:\s*\/$/i.test(line)),
  {
    status: robotsResponse.status,
    generalUserAgentRules: generalRules,
    otherBotRootDisallowIgnoredByDesign: true,
  },
);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 320, height: 844 },
  locale: "ja-JP",
  serviceWorkers: "block",
});
const page = await context.newPage();

await page.goto(baseUrl.href, {
  waitUntil: "domcontentloaded",
  timeout: 60_000,
});
await page.waitForTimeout(750);
const mascot = await page.evaluate(() => {
  const images = [
    ...document.querySelectorAll('img[src*="/mascot/"]'),
  ];
  const details = images.map((image) => ({
    sourcePath: new URL(image.currentSrc || image.src).pathname,
    complete: image.complete,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    widthAttribute: image.getAttribute("width"),
    heightAttribute: image.getAttribute("height"),
    renderedWidth: image.getBoundingClientRect().width,
    renderedHeight: image.getBoundingClientRect().height,
  }));
  return {
    count: details.length,
    brokenCount: details.filter(
      (image) =>
        !image.complete ||
        image.naturalWidth === 0 ||
        image.naturalHeight === 0 ||
        !image.widthAttribute ||
        !image.heightAttribute,
    ).length,
    hiddenResponsiveCopies: details.filter(
      (image) => image.renderedWidth === 0 || image.renderedHeight === 0,
    ).length,
    details,
  };
});
record(
  "browser:/@320:mascot-assets",
  mascot.count > 0 && mascot.brokenCount === 0,
  mascot,
);

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(new URL("/services/automation", baseUrl).href, {
  waitUntil: "domcontentloaded",
  timeout: 60_000,
});
await page.waitForTimeout(750);
const automation = await page.evaluate(() => {
  const bodyText = document.body.innerText;
  const bodyTextContent = document.body.textContent ?? "";
  const unsafeFields = [
    ...document.querySelectorAll(
      'main input[type="email"], main input[type="tel"], main input[type="text"], main textarea:not([readonly])',
    ),
  ];
  return {
    preparationLabel: /受付(?:は|の)?準備中/.test(bodyText),
    explicitNoPiiStatement:
      bodyTextContent.includes("氏名・メールアドレス・相談本文の入力欄") &&
      bodyTextContent.includes("表示していません"),
    mainFormCount: document.querySelectorAll("main form").length,
    unsafeFieldCount: unsafeFields.length,
    submitButtonCount: document.querySelectorAll(
      'main button[type="submit"], main input[type="submit"]',
    ).length,
    readonlyTemplateCount: document.querySelectorAll(
      "main textarea[readonly]",
    ).length,
    checklistCheckboxCount: document.querySelectorAll(
      'main input[type="checkbox"]',
    ).length,
    exposedEmailCount:
      bodyText.match(
        /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      )?.length ?? 0,
  };
});
record(
  "browser:/services/automation@390:preparing-no-pii-form",
  automation.preparationLabel &&
    automation.explicitNoPiiStatement &&
    automation.mainFormCount === 0 &&
    automation.unsafeFieldCount === 0 &&
    automation.submitButtonCount === 0 &&
    automation.readonlyTemplateCount > 0 &&
    automation.exposedEmailCount === 0,
  automation,
);

await context.close();
await browser.close();

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: baseUrl.origin,
  mode: "read-only-production-smoke-target-closure",
  guarantees: {
    credentialValuesRecorded: false,
    piiSubmitted: false,
    postRequests: 0,
    externalWrites: 0,
    mailSent: 0,
    pushSent: 0,
    paymentsCreated: 0,
    aiInferenceCalls: 0,
  },
  passed: failures.length === 0,
  checkCount: checks.length,
  passedCount: checks.length - failures.length,
  failedCount: failures.length,
  failures,
  checks,
};
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...report, checks: undefined }));
if (!report.passed) process.exitCode = 1;
