import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BROWSER_AUDIT_BASE_URL ?? "http://127.0.0.1:3322";
const outputPath = resolve(
  process.env.BROWSER_REVALIDATION_OUTPUT ??
    "../docs/audits/evidence/post-launch-growth-operations-2026-07-29/full-gate/browser-failure-revalidation.json",
);

const browser = await chromium.launch({ headless: true });
let textZoom;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const response = await page.goto(`${baseUrl}/`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "400%";
  });
  await page.waitForTimeout(300);
  textZoom = await page.evaluate(() => ({
    httpStatus: document.readyState ? 200 : null,
    navigationStatus: null,
    h1Visible: Boolean(document.querySelector("h1")?.getBoundingClientRect().height),
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    horizontalOverflow:
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  textZoom.navigationStatus = response?.status() ?? null;
  await page.close();
} finally {
  await browser.close();
}

const accidentResponse = await fetch(`${baseUrl}/accidents`, {
  redirect: "manual",
  signal: AbortSignal.timeout(30_000),
});
const accidentBody = await accidentResponse.text();
const accidentDetailResponse = await fetch(
  `${baseUrl}/accidents/synthetic-audit-case`,
  {
    redirect: "manual",
    signal: AbortSignal.timeout(30_000),
  },
);
const robotsTags = accidentBody.match(/<meta\b[^>]*>/gi) ?? [];
const accidentQuarantine = {
  httpStatus: accidentResponse.status,
  location: accidentResponse.headers.get("location"),
  noindex: robotsTags.some(
    (tag) =>
      /\bname=["']robots["']/i.test(tag) &&
      /\bcontent=["'][^"']*noindex/i.test(tag),
  ),
  officialMhlwLink: accidentBody.includes("https://anzeninfo.mhlw.go.jp/"),
  detailHttpStatus: accidentDetailResponse.status,
  detailLocation: accidentDetailResponse.headers.get("location"),
  detailFailsClosed:
    accidentDetailResponse.status === 404 &&
    accidentDetailResponse.headers.get("location") === null,
};

const checks = {
  homeTextZoom400:
    textZoom.navigationStatus === 200 &&
    textZoom.h1Visible &&
    textZoom.horizontalOverflow <= 2,
  accidentDatabaseQuarantine:
    accidentQuarantine.httpStatus === 200 &&
    accidentQuarantine.noindex &&
    accidentQuarantine.officialMhlwLink &&
    accidentQuarantine.detailFailsClosed,
};
const result = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  checks,
  textZoom,
  accidentQuarantine,
  passed: Object.values(checks).every(Boolean),
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
process.stdout.write(
  `${JSON.stringify({ passed: result.passed, checks, outputPath }, null, 2)}\n`,
);
if (!result.passed) process.exitCode = 1;
