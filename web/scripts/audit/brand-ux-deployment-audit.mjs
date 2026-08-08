#!/usr/bin/env node

import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.DEPLOYMENT_AUDIT_BASE_URL;
const evidenceRoot = process.env.DEPLOYMENT_AUDIT_EVIDENCE_ROOT;
const cookieJar = process.env.DEPLOYMENT_AUDIT_COOKIE_JAR;
const expectPreview =
  process.env.DEPLOYMENT_AUDIT_EXPECT_PREVIEW?.toLowerCase() === "true";

if (!baseUrl || !evidenceRoot) {
  throw new Error(
    "DEPLOYMENT_AUDIT_BASE_URL と DEPLOYMENT_AUDIT_EVIDENCE_ROOT が必要です。",
  );
}

const routes = [
  { id: "home", path: "/" },
  { id: "safety-ai", path: "/safety-ai" },
  { id: "chatbot", path: "/chatbot" },
  { id: "chemical-ra", path: "/chemical-ra" },
  { id: "laws", path: "/laws" },
  { id: "law-search", path: "/law-search" },
  { id: "accident-news", path: "/accident-news" },
  { id: "resources", path: "/resources" },
  { id: "qualifications", path: "/education-certification" },
  { id: "elearning", path: "/e-learning" },
  { id: "visual-ky", path: "/training/visual-ky" },
  { id: "risk", path: "/risk" },
  { id: "heat", path: "/heat-illness-prevention" },
  { id: "ky-paper", path: "/ky/paper" },
  { id: "safety-diary", path: "/safety-diary" },
  { id: "signage", path: "/signage" },
  { id: "automation", path: "/services/automation" },
  { id: "automation-examples", path: "/automation-examples" },
  { id: "features", path: "/features" },
  { id: "search", path: "/search" },
  {
    id: "not-found",
    path: "/brand-ux-preview-not-found-20260730",
    status: 404,
  },
];

const viewports = [
  { id: "320", width: 320, height: 760, mobile: true },
  { id: "390", width: 390, height: 844, mobile: true },
  { id: "768", width: 768, height: 900, mobile: false },
  { id: "1440", width: 1440, height: 900, mobile: false },
];

const expectedDesktopNav = [
  "今日の安全",
  "法令AI",
  "化学物質",
  "事故・法改正",
  "学ぶ・資格",
  "KYT・実務",
  "自動化相談",
];
const expectedMobileNav = ["ホーム", "熱中症", "法令AI", "学ぶ", "メニュー"];

function readBypassCookie(path) {
  if (!path) return null;
  const line = readFileSync(path, "utf8")
    .split(/\r?\n/)
    .find((candidate) => candidate.includes("\t_vercel_jwt\t"));
  if (!line) throw new Error("一時Vercel bypass cookieが見つかりません。");
  const parts = line.split("\t");
  if (parts.length < 7) throw new Error("一時cookie jarの形式が不正です。");
  return {
    name: parts[5],
    value: parts[6],
    domain: parts[0].replace(/^#HttpOnly_/, ""),
    path: parts[2] || "/",
    httpOnly: parts[0].startsWith("#HttpOnly_"),
    secure: parts[3] === "TRUE",
    sameSite: "Lax",
  };
}

const absoluteEvidenceRoot = resolve(evidenceRoot);
const screenshotRoot = resolve(absoluteEvidenceRoot, "screenshots");
mkdirSync(screenshotRoot, { recursive: true });

const cookie = readBypassCookie(cookieJar);
const browser = await chromium.launch({ headless: true });
const checks = [];
const failures = [];

function fail(id, message) {
  failures.push({ id, message });
}

async function createContext(viewport, options = {}) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile,
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    reducedMotion: options.reducedMotion ?? "reduce",
    forcedColors: options.forcedColors,
    javaScriptEnabled: options.javaScriptEnabled ?? true,
    serviceWorkers: "block",
  });
  if (cookie) await context.addCookies([cookie]);
  return context;
}

for (const viewport of viewports) {
  const context = await createContext(viewport);
  for (const route of routes) {
    const id = `${route.id}-${viewport.id}`;
    const page = await context.newPage();
    const consoleErrors = [];
    const platformConsoleMessages = [];
    const pageErrors = [];
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      if (
        message
          .text()
          .includes("https://vercel.live/_next-live/feedback/feedback.js")
      ) {
        platformConsoleMessages.push(message.text());
        return;
      }
      consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const response = await page.goto(`${baseUrl}${route.path}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForTimeout(450);
    await page
      .locator("h1")
      .first()
      .waitFor({ state: "attached", timeout: 5_000 })
      .catch(() => undefined);
    const headers = response?.headers() ?? {};
    const metrics = await page.evaluate(() => {
      const root = document.documentElement;
      const body = document.body;
      const style = getComputedStyle(root);
      const desktopNav = document.querySelector(
        '[aria-label="主要機能ナビゲーション"]',
      );
      const mobileNav = document.querySelector(
        '[aria-label="モバイル ボトムナビゲーション"]',
      );
      const labels = (element) =>
        element
          ? [...element.querySelectorAll("a")].map((link) =>
              (link.textContent ?? "").trim().replace(/\s+/g, " "),
            )
          : [];
      return {
        title: document.title,
        h1Count: document.querySelectorAll("h1").length,
        mainCount: document.querySelectorAll("main").length,
        canonical:
          document
            .querySelector('link[rel="canonical"]')
            ?.getAttribute("href") ?? "",
        robots:
          document.querySelector('meta[name="robots"]')?.getAttribute("content") ??
          "",
        overflow:
          Math.max(root.scrollWidth, body.scrollWidth) - root.clientWidth,
        primaryActions: document.querySelectorAll("[data-primary-action]").length,
        mascotGuides: document.querySelectorAll("[data-mascot-guide]").length,
        mascotVariants: [
          ...new Set(
            [...document.querySelectorAll("[data-mascot-variant]")].map(
              (node) => node.getAttribute("data-mascot-variant") ?? "",
            ),
          ),
        ].filter(Boolean),
        tier1: document.querySelectorAll('[data-feature-tier="1"]').length,
        tier3: document.querySelectorAll('[data-feature-tier="3"]').length,
        desktopNavLabels: labels(desktopNav),
        mobileNavLabels: labels(mobileNav),
        automationPreparation: /受付\s*準備中|受付は準備中/.test(
          body.innerText,
        ),
        tokens: {
          primary: style.getPropertyValue("--primary").trim(),
          brandPrimary: style.getPropertyValue("--brand-primary").trim(),
          brandSecondary: style.getPropertyValue("--brand-secondary").trim(),
          brandAccent: style.getPropertyValue("--brand-accent").trim(),
          danger: style.getPropertyValue("--danger").trim(),
        },
      };
    });
    await page.screenshot({
      path: resolve(screenshotRoot, `${id}.png`),
      fullPage: false,
      animations: "disabled",
    });

    const result = {
      id,
      path: route.path,
      viewport: viewport.id,
      status: response?.status() ?? null,
      xRobotsTag: headers["x-robots-tag"] ?? "",
      previewMode: headers["x-safe-ai-preview-mode"] ?? "",
      consoleErrors,
      platformConsoleMessages,
      pageErrors,
      ...metrics,
    };
    if ((route.status ?? 200) === 404) {
      result.expected404ConsoleMessages = result.consoleErrors.filter(
        (message) =>
          /Failed to load resource: the server responded with a status of 404/.test(
            message,
          ),
      );
      result.consoleErrors = result.consoleErrors.filter(
        (message) =>
          !/Failed to load resource: the server responded with a status of 404/.test(
            message,
          ),
      );
    }
    checks.push(result);

    if (result.status !== (route.status ?? 200)) {
      fail(id, `HTTP ${result.status}; expected ${route.status ?? 200}`);
    }
    if (result.h1Count !== 1) fail(id, `H1 count ${result.h1Count}`);
    if (result.mainCount !== 1) fail(id, `main count ${result.mainCount}`);
    if (!result.title || !result.canonical) fail(id, "title/canonical missing");
    if (result.overflow > 2) fail(id, `horizontal overflow ${result.overflow}px`);
    if (result.consoleErrors.length || result.pageErrors.length) {
      fail(
        id,
        `console errors ${result.consoleErrors.length}; page errors ${result.pageErrors.length}`,
      );
    }
    if (expectPreview) {
      if (
        !/noindex/i.test(result.xRobotsTag) ||
        !/nofollow/i.test(result.xRobotsTag) ||
        !/noarchive/i.test(result.xRobotsTag)
      ) {
        fail(id, `preview X-Robots-Tag mismatch: ${result.xRobotsTag}`);
      }
      if (result.previewMode !== "dry-run") {
        fail(id, `preview mode mismatch: ${result.previewMode}`);
      }
    }
    if (route.id === "home") {
      if (viewport.width >= 1024) {
        const normalizedDesktopLabels = result.desktopNavLabels.map((label) =>
          label.replace(/夏季$/, ""),
        );
        if (
          JSON.stringify(normalizedDesktopLabels) !==
          JSON.stringify(expectedDesktopNav)
        ) {
          fail(id, `desktop nav mismatch: ${result.desktopNavLabels.join("|")}`);
        }
      } else if (
        JSON.stringify(result.mobileNavLabels) !==
        JSON.stringify(expectedMobileNav)
      ) {
        fail(id, `mobile nav mismatch: ${result.mobileNavLabels.join("|")}`);
      }
      if (result.tier1 !== 7 || result.tier3 !== 3) {
        fail(id, `home tiers: Tier1=${result.tier1}, Tier3=${result.tier3}`);
      }
      if (!result.automationPreparation) {
        fail(id, "automation preparation state missing");
      }
    }
    await page.close();
  }
  await context.close();
}

const modes = {};

{
  const context = await createContext(viewports[1]);
  const page = await context.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.keyboard.press("Tab");
  const firstFocus = await page.evaluate(() => ({
    href: document.activeElement?.getAttribute("href") ?? "",
    text: document.activeElement?.textContent?.trim() ?? "",
  }));
  if (firstFocus.href !== "#main-content") {
    fail("keyboard-home", `first focus was ${firstFocus.href || firstFocus.text}`);
  }
  const heat = page.getByRole("link", { name: "熱中症", exact: true });
  await heat.focus();
  await page.keyboard.press("Tab");
  const afterHeat = await page.evaluate(
    () => document.activeElement?.textContent?.trim() ?? "",
  );
  if (afterHeat !== "法令AI") {
    fail("keyboard-home", `focus after heat was ${afterHeat}`);
  }
  modes.keyboard = { firstFocus, afterHeat };
  await context.close();
}

{
  const zoomRoutes = ["/", "/chatbot", "/chemical-ra", "/heat-illness-prevention"];
  const context = await createContext(viewports[0]);
  modes.text400 = [];
  for (const path of zoomRoutes) {
    const page = await context.newPage();
    await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
    const result = await page.evaluate(() => {
      document.documentElement.style.fontSize = "400%";
      return new Promise((resolveResult) =>
        requestAnimationFrame(() =>
          resolveResult({
            overflow:
              Math.max(
                document.documentElement.scrollWidth,
                document.body.scrollWidth,
              ) - document.documentElement.clientWidth,
            h1Visible: Boolean(
              document.querySelector("h1")?.getBoundingClientRect().height,
            ),
          }),
        ),
      );
    });
    modes.text400.push({ path, ...result });
    if (!result.h1Visible || result.overflow > 2) {
      fail(`text400-${path}`, JSON.stringify(result));
    }
    await page.close();
  }
  await context.close();
}

{
  const context = await createContext(viewports[1], {
    forcedColors: "active",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  modes.forcedColorsReducedMotion = await page.evaluate(() => ({
    forcedColors: matchMedia("(forced-colors: active)").matches,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    h1Visible: Boolean(document.querySelector("h1")?.getBoundingClientRect().height),
  }));
  if (
    !modes.forcedColorsReducedMotion.forcedColors ||
    !modes.forcedColorsReducedMotion.reducedMotion ||
    !modes.forcedColorsReducedMotion.h1Visible
  ) {
    fail(
      "forced-colors-reduced-motion",
      JSON.stringify(modes.forcedColorsReducedMotion),
    );
  }
  await page.screenshot({
    path: resolve(screenshotRoot, "home-forced-colors-reduced-motion.png"),
    animations: "disabled",
  });
  await context.close();
}

await browser.close();

const result = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  expectPreview,
  routeCount: routes.length,
  viewportCount: viewports.length,
  checkCount: checks.length,
  credentialValuesRecorded: false,
  checks,
  modes,
  failures,
  passed: failures.length === 0,
};

writeFileSync(
  resolve(absoluteEvidenceRoot, "browser-audit.json"),
  `${JSON.stringify(result, null, 2)}\n`,
  "utf8",
);

console.log(
  JSON.stringify({
    passed: result.passed,
    checks: result.checkCount,
    failures: failures.length,
  }),
);

if (!result.passed) process.exitCode = 1;
