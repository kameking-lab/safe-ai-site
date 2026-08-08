import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");
const args = new Map(
  process.argv
    .slice(2)
    .filter((argument) => argument.startsWith("--"))
    .map((argument) => {
      const [key, ...rest] = argument.slice(2).split("=");
      return [key, rest.join("=") || "true"];
    }),
);

const baseUrl = (args.get("base") || "http://127.0.0.1:3417").replace(/\/$/, "");
const outputPath = path.resolve(
  process.cwd(),
  args.get("out") ||
    "../docs/audits/evidence/brand-ux-feature-restructure-2026-07-30/after-local/dark-contrast-audit.json",
);

const routes = [
  ["/", 200],
  ["/safety-ai", 200],
  ["/risk", 200],
  ["/heat-illness-prevention", 200],
  ["/heat-illness-prevention/slides", 200],
  ["/heat-illness-prevention/elearning", 200],
  ["/chatbot", 200],
  ["/chemical-ra", 200],
  ["/whats-new", 200],
  ["/laws", 200],
  ["/law-search", 200],
  ["/accident-news", 200],
  ["/accidents", 200],
  ["/ky/paper", 200],
  ["/safety-diary", 200],
  ["/training/visual-ky", 200],
  ["/education", 200],
  ["/education-certification", 200],
  ["/education-certification/finder", 200],
  ["/e-learning", 200],
  ["/signage", 200],
  ["/services/automation", 200],
  ["/automation-examples", 200],
  ["/about/quality", 200],
  ["/about/data-sources", 200],
  ["/features", 200],
  ["/features/use-cases", 200],
  ["/search", 200],
  ["/brand-ux-not-found-probe", 404],
];

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
];

const browser = await chromium.launch({ headless: true });
const results = [];
for (const viewport of viewports) {
  const context = await browser.newContext({
    colorScheme: "dark",
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    viewport,
    extraHTTPHeaders: { DNT: "1", "Sec-GPC": "1" },
  });

  await context.addInitScript(() => {
    localStorage.removeItem("anzen-theme");
    localStorage.setItem(
      "safe-ai:optional-tracking-consent:v1",
      JSON.stringify({ value: "denied", updatedAt: "2026-07-30T00:00:00.000Z" }),
    );
  });

  for (const [route, expectedStatus] of routes) {
    const page = await context.newPage();
    const response = await page.goto(`${baseUrl}${route}`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await page.waitForTimeout(400);
    await page.evaluate(async () => {
      const step = Math.max(400, Math.floor(window.innerHeight * 0.75));
      for (
        let position = 0;
        position < document.documentElement.scrollHeight;
        position += step
      ) {
        window.scrollTo(0, position);
        await new Promise((resolve) => requestAnimationFrame(() => resolve()));
      }
      window.scrollTo(0, 0);
    });
    await page.addScriptTag({ path: axePath });
    const accessibility = await page.evaluate(async () => {
      const report = await window.axe.run(document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
        },
      });
      return report.violations
        .filter((violation) => violation.id === "color-contrast")
        .map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          nodes: violation.nodes.map((node) => ({
            target: node.target,
            html: node.html,
            failureSummary: node.failureSummary,
            contrast: node.any.map((check) => check.data),
          })),
        }));
    });
    results.push({
      viewport: viewport.name,
      route,
      status: response?.status() ?? null,
      expectedStatus,
      darkClass: await page
        .locator("html")
        .evaluate((element) => element.classList.contains("dark")),
      violations: accessibility,
      contrastNodeCount: accessibility.reduce(
        (sum, violation) => sum + violation.nodes.length,
        0,
      ),
    });
    await page.close();
  }

  await context.close();
}

await browser.close();
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  viewports,
  colorScheme: "dark",
  routeCount: routes.length,
  viewportCount: viewports.length,
  routeCheckCount: results.length,
  contrastNodeCount: results.reduce((sum, result) => sum + result.contrastNodeCount, 0),
  statusMismatchCount: results.filter((result) => result.status !== result.expectedStatus).length,
  checksWithViolations: results.filter((result) => result.contrastNodeCount > 0).length,
  results,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(
  `${JSON.stringify({
    outputPath,
    routeCount: report.routeCount,
    viewportCount: report.viewportCount,
    routeCheckCount: report.routeCheckCount,
    contrastNodeCount: report.contrastNodeCount,
    checksWithViolations: report.checksWithViolations,
    statusMismatchCount: report.statusMismatchCount,
    darkClassCount: results.filter((result) => result.darkClass).length,
  })}\n`,
);
