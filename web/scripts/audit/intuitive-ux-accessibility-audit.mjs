import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";
import {
  FOCUS_PAINT_FRAMES,
  assessInteractiveTarget,
  hasRenderedFocusIndicator,
} from "./intuitive-ux-accessibility-metrics.mjs";

function readArg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1]
    ? process.argv[index + 1]
    : fallback;
}

const baseUrl = readArg("base", "http://127.0.0.1:3200");
const outDir = path.resolve(
  readArg(
    "out",
    "../docs/audits/evidence/intuitive-ux-heat-first-2026-07-29/accessibility-local",
  ),
);

const routes = [
  "/",
  "/heat-illness-prevention",
  "/ky/paper",
  "/safety-diary",
  "/chemical-ra",
  "/chatbot",
  "/law-search",
  "/accidents",
  "/education-certification/finder",
  "/signage",
  "/services/automation",
];

const modes = [
  {
    id: "width-1024",
    viewport: { width: 1024, height: 768 },
    reducedMotion: "reduce",
  },
  {
    id: "landscape-844x390",
    viewport: { width: 844, height: 390 },
    reducedMotion: "reduce",
  },
  {
    id: "zoom-200-effective-720",
    viewport: { width: 720, height: 900 },
    reducedMotion: "reduce",
    note: "1440px viewport at browser zoom 200%と同じ有効CSS幅",
  },
  {
    id: "zoom-400-effective-360",
    viewport: { width: 360, height: 900 },
    reducedMotion: "reduce",
    note: "1440px viewport at browser zoom 400%と同じ有効CSS幅",
  },
  {
    id: "forced-colors",
    viewport: { width: 390, height: 844 },
    forcedColors: "active",
    reducedMotion: "reduce",
  },
  {
    id: "reduced-motion",
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  },
  {
    id: "javascript-disabled",
    viewport: { width: 390, height: 844 },
    javaScriptEnabled: false,
    reducedMotion: "reduce",
  },
  {
    id: "keyboard",
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
    keyboard: true,
  },
];

const screenshotRoutes = new Set([
  "/",
  "/ky/paper",
  "/law-search",
  "/signage",
]);

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const mode of modes) {
    const context = await browser.newContext({
      viewport: mode.viewport,
      locale: "ja-JP",
      timezoneId: "Asia/Tokyo",
      colorScheme: "light",
      reducedMotion: mode.reducedMotion,
      forcedColors: mode.forcedColors,
      javaScriptEnabled: mode.javaScriptEnabled,
      serviceWorkers: "block",
    });

    for (const route of routes) {
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));

      const response = await page.goto(new URL(route, baseUrl).toString(), {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
      await page.waitForTimeout(mode.javaScriptEnabled === false ? 100 : 350);
      await page.evaluate(() => window.scrollTo(0, 0)).catch(() => undefined);

      const pageMetricBase = await page.evaluate(() => {
        const interactive = Array.from(
          document.querySelectorAll(
            "a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary",
          ),
        ).filter((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden"
          );
        });
        const targetCandidates = interactive.map((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          const associatedLabel =
            element instanceof HTMLInputElement ||
            element instanceof HTMLSelectElement ||
            element instanceof HTMLTextAreaElement
              ? element.labels?.[0] ?? null
              : element.closest("label");
          const labelRect = associatedLabel?.getBoundingClientRect();
          const className =
            typeof element.className === "string" ? element.className : "";
          return {
            tag: element.tagName.toLowerCase(),
            name:
              element.getAttribute("aria-label") ||
              associatedLabel?.textContent?.replace(/\s+/g, " ").trim().slice(0, 80) ||
              (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
            width: rect.width,
            height: rect.height,
            labelWidth: labelRect?.width ?? 0,
            labelHeight: labelRect?.height ?? 0,
            display: style.display,
            focusReveal:
              className.split(/\s+/).includes("sr-only") &&
              className.includes("focus:not-sr-only"),
          };
        });

        return {
          title: document.title,
          h1: Array.from(document.querySelectorAll("h1")).map((element) =>
            (element.textContent ?? "").replace(/\s+/g, " ").trim(),
          ),
          mainCount: document.querySelectorAll("main").length,
          horizontalOverflow:
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth + 1,
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          interactiveCount: interactive.length,
          targetCandidates,
          primaryLinkCount: document.querySelectorAll(
            "[data-primary-action][href]",
          ).length,
          bottomNavCount: document.querySelectorAll(
            "[aria-label='モバイル主要ナビゲーション'] a",
          ).length,
          summaryCount: document.querySelectorAll("details > summary").length,
          canonical:
            document
              .querySelector('link[rel="canonical"]')
              ?.getAttribute("href") ?? null,
          robots:
            document
              .querySelector('meta[name="robots"]')
              ?.getAttribute("content") ?? null,
          heatPrimaryLinks: Array.from(
            document.querySelectorAll(
              "a[href='/heat-illness-prevention'],a[href='/ky/paper?topic=heat-illness'],a[href='/heat-illness-prevention/elearning'],a[href='/heat-illness-prevention/slides']",
            ),
          ).length,
        };
      });
      const targetAssessments = pageMetricBase.targetCandidates.map(
        assessInteractiveTarget,
      );
      const pageMetricsWithoutTargets = { ...pageMetricBase };
      delete pageMetricsWithoutTargets.targetCandidates;
      const pageMetrics = {
        ...pageMetricsWithoutTargets,
        undersized: targetAssessments.filter(
          (item) => item.belowPreferred44,
        ),
        undersizedWcag: targetAssessments.filter(
          (item) => item.belowWcagMinimum,
        ),
        targetSizeExceptions: targetAssessments.filter(
          (item) => item.exception !== null,
        ),
      };

      let keyboard = null;
      if (mode.keyboard) {
        const focusTrace = [];
        for (let index = 0; index < 18; index += 1) {
          await page.keyboard.press("Tab");
          await page.evaluate(async (frames) => {
            for (let frame = 0; frame < frames; frame += 1) {
              await new Promise((resolve) =>
                requestAnimationFrame(() => resolve()),
              );
            }
          }, FOCUS_PAINT_FRAMES);
          const focusSample = await page.evaluate(() => {
            const element = document.activeElement;
            if (!(element instanceof HTMLElement)) return null;
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return {
              tag: element.tagName.toLowerCase(),
              name:
                element.getAttribute("aria-label") ||
                (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
              visible:
                rect.width > 0 &&
                rect.height > 0 &&
                rect.bottom > 0 &&
                rect.top < window.innerHeight,
              focusVisible: element.matches(":focus-visible"),
              outlineStyle: style.outlineStyle,
              outlineWidth: style.outlineWidth,
              outlineColor: style.outlineColor,
              boxShadow: style.boxShadow,
            };
          });
          focusTrace.push(
            focusSample === null
              ? null
              : {
                  tag: focusSample.tag,
                  name: focusSample.name,
                  visible: focusSample.visible,
                  focusVisible: focusSample.focusVisible,
                  focusIndicator:
                    hasRenderedFocusIndicator(focusSample),
                },
          );
        }

        let menuFocusReturn = null;
        const menuButton = page.getByRole("button", {
          name: "メニューを開閉",
        });
        if ((await menuButton.count()) > 0 && (await menuButton.first().isVisible())) {
          await menuButton.first().click();
          await page.keyboard.press("Escape");
          menuFocusReturn = await menuButton.first().evaluate(
            (element) => document.activeElement === element,
          );
        }
        keyboard = { focusTrace, menuFocusReturn };
      }

      if (screenshotRoutes.has(route)) {
        const slug = route === "/" ? "home" : route.replaceAll("/", "-").slice(1);
        await page.screenshot({
          path: path.join(outDir, `${mode.id}-${slug}.png`),
          fullPage: false,
        });
      }

      results.push({
        mode: mode.id,
        note: mode.note ?? null,
        route,
        httpStatus: response?.status() ?? null,
        ...pageMetrics,
        keyboard,
        consoleErrors,
        pageErrors,
      });
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}

await fs.writeFile(
  path.join(outDir, "accessibility-metrics.json"),
  `${JSON.stringify(results, null, 2)}\n`,
  "utf8",
);

const summary = {
  checks: results.length,
  non200: results.filter((result) => result.httpStatus !== 200).length,
  overflow: results.filter((result) => result.horizontalOverflow).length,
  invalidMain: results.filter((result) => result.mainCount !== 1).length,
  consoleErrors: results.reduce(
    (sum, result) => sum + result.consoleErrors.length,
    0,
  ),
  pageErrors: results.reduce(
    (sum, result) => sum + result.pageErrors.length,
    0,
  ),
  noJsMissingPrimaryLinks: results.filter(
    (result) =>
      result.mode === "javascript-disabled" && result.primaryLinkCount === 0,
  ).length,
  keyboardFocusReturnFailures: results.filter(
    (result) =>
      result.mode === "keyboard" &&
      result.keyboard?.menuFocusReturn === false,
  ).length,
};

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
