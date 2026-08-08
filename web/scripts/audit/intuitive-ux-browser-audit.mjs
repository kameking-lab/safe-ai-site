import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const DEFAULT_ROUTES = [
  "/",
  "/risk",
  "/heat-illness-prevention",
  "/heat-illness-prevention/slides",
  "/heat-illness-prevention/elearning",
  "/ky/paper",
  "/safety-diary",
  "/chemical-ra",
  "/chatbot",
  "/law-search",
  "/accidents",
  "/education-certification/finder",
  "/signage",
  "/safety-ai",
  "/services/automation",
];

function readArg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1]
    ? process.argv[index + 1]
    : fallback;
}

function parseRoutes(value) {
  if (!value) return DEFAULT_ROUTES;
  return value
    .split(",")
    .map((route) => route.trim())
    .filter(Boolean)
    .map((route) => (route.startsWith("/") ? route : `/${route}`));
}

function parseViewports(value) {
  return value.split(",").map((item) => {
    const match = item.trim().match(/^(\d+)x(\d+)$/);
    if (!match) {
      throw new Error(`Invalid viewport: ${item}`);
    }
    return {
      width: Number(match[1]),
      height: Number(match[2]),
      id: `${match[1]}x${match[2]}`,
    };
  });
}

function routeSlug(route) {
  if (route === "/") return "home";
  return route
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const baseUrl = readArg("base", "https://www.anzen-ai-portal.jp");
const phase = readArg("phase", "audit");
const outDir = path.resolve(
  readArg(
    "out",
    "../docs/audits/evidence/intuitive-ux-heat-first-2026-07-29",
  ),
);
const routes = parseRoutes(readArg("routes", ""));
const viewports = parseViewports(readArg("viewports", "390x844"));
const waitMs = Number(readArg("wait-ms", "1800"));
const fullPage = readArg("full-page", "true") !== "false";

await fs.mkdir(path.join(outDir, phase), { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      locale: "ja-JP",
      timezoneId: "Asia/Tokyo",
      colorScheme: "light",
      reducedMotion: "reduce",
      serviceWorkers: "block",
    });

    for (const route of routes) {
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      const failedRequests = [];

      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("requestfailed", (request) => {
        const type = request.resourceType();
        if (!["document", "script", "stylesheet"].includes(type)) return;
        failedRequests.push({
          type,
          url: request.url(),
          error: request.failure()?.errorText ?? "unknown",
        });
      });

      const target = new URL(route, baseUrl).toString();
      const response = await page.goto(target, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
      await page.waitForTimeout(waitMs);

      const metrics = await page.evaluate(() => {
        const viewportHeight = window.innerHeight;
        const main = document.querySelector("main");
        const root = main ?? document.body;
        const candidateSelector =
          "h1,h2,h3,p,a,button,label,dt,dd,summary,[role='status'],[role='alert']";
        const seen = new Set();
        const visibleText = [];
        let paragraphCount = 0;
        let ctaCount = 0;

        for (const element of root.querySelectorAll(candidateSelector)) {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          if (
            rect.bottom <= 0 ||
            rect.top >= viewportHeight ||
            rect.width <= 0 ||
            rect.height <= 0 ||
            style.visibility === "hidden" ||
            style.display === "none"
          ) {
            continue;
          }
          const rawText =
            element.matches("label") && element.querySelector("select")
              ? Array.from(element.childNodes)
                  .filter((node) => node.nodeType === Node.TEXT_NODE)
                  .map((node) => node.textContent ?? "")
                  .join(" ")
              : (element.textContent ?? "");
          const text = rawText.replace(/\s+/g, " ").trim();
          if (!text || seen.has(text)) continue;
          seen.add(text);
          visibleText.push(text);
          if (element.matches("p")) paragraphCount += 1;
          if (element.matches("a,button")) ctaCount += 1;
        }

        const compactText = visibleText.join("").replace(/\s+/g, "");
        const primaryCandidates = Array.from(
          root.querySelectorAll(
            "[data-primary-action],a[href],button:not([disabled])",
          ),
        )
          .map((element) => ({
            element,
            rect: element.getBoundingClientRect(),
          }))
          .filter(({ rect }) => rect.width > 0 && rect.height > 0)
          .sort((left, right) => left.rect.top - right.rect.top);
        const markedPrimary = primaryCandidates.find(({ element }) =>
          element.hasAttribute("data-primary-action"),
        );
        const primaryAction =
          markedPrimary?.element ?? primaryCandidates[0]?.element ?? null;
        const primaryRect = primaryAction?.getBoundingClientRect() ?? null;
        const primaryNav = Array.from(
          document.querySelectorAll(
            "[data-primary-navigation] a,[aria-label='主要ナビゲーション'] a",
          ),
        ).map((item) => (item.textContent ?? "").replace(/\s+/g, " ").trim());

        return {
          title: document.title,
          h1: Array.from(document.querySelectorAll("h1")).map((item) =>
            (item.textContent ?? "").replace(/\s+/g, " ").trim(),
          ),
          mainCount: document.querySelectorAll("main").length,
          bodyClientWidth: document.documentElement.clientWidth,
          bodyScrollWidth: document.documentElement.scrollWidth,
          horizontalOverflow:
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth + 1,
          firstViewCharacterCount: compactText.length,
          firstViewParagraphCount: paragraphCount,
          firstViewCtaCount: ctaCount,
          firstViewText: visibleText,
          primaryActionTop: primaryRect ? Math.round(primaryRect.top) : null,
          primaryActionVisible:
            primaryRect !== null &&
            primaryRect.bottom > 0 &&
            primaryRect.top < viewportHeight,
          primaryNav,
          robots:
            document
              .querySelector('meta[name="robots"]')
              ?.getAttribute("content") ?? null,
          canonical:
            document
              .querySelector('link[rel="canonical"]')
              ?.getAttribute("href") ?? null,
        };
      });

      const slug = routeSlug(route);
      const prefix = `${slug}-${viewport.id}`;
      await page.screenshot({
        path: path.join(outDir, phase, `${prefix}-first-view.png`),
        fullPage: false,
      });
      if (fullPage) {
        await page.screenshot({
          path: path.join(outDir, phase, `${prefix}-full.png`),
          fullPage: true,
        });
      }

      results.push({
        phase,
        route,
        target,
        viewport,
        httpStatus: response?.status() ?? null,
        ...metrics,
        consoleErrors,
        pageErrors,
        failedRequests,
      });

      await page.close();
    }

    await context.close();
  }
} finally {
  await browser.close();
}

const outputPath = path.join(outDir, phase, "browser-metrics.json");
await fs.writeFile(outputPath, `${JSON.stringify(results, null, 2)}\n`, "utf8");

const summary = results.map((result) => ({
  route: result.route,
  viewport: result.viewport.id,
  httpStatus: result.httpStatus,
  h1: result.h1,
  firstViewCharacterCount: result.firstViewCharacterCount,
  firstViewParagraphCount: result.firstViewParagraphCount,
  firstViewCtaCount: result.firstViewCtaCount,
  primaryActionTop: result.primaryActionTop,
  horizontalOverflow: result.horizontalOverflow,
  consoleErrors: result.consoleErrors.length,
  pageErrors: result.pageErrors.length,
}));

process.stdout.write(
  `${JSON.stringify({ baseUrl, phase, outputPath, summary }, null, 2)}\n`,
);
