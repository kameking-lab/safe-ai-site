import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rmdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const ROUTES = [
  "/",
  "/heat-illness-prevention",
  "/ky/paper",
  "/safety-diary",
  "/chemical-ra",
  "/chemical-ra/ledger",
  "/chatbot",
  "/law-search",
  "/laws",
  "/accident-news",
  "/accidents",
  "/resources",
  "/training/visual-ky",
  "/education",
  "/education/progress",
  "/education-certification/finder",
  "/signage",
  "/signage/manage",
  "/services/automation",
  "/admin/automation-consult-queue",
  "/admin/operations",
  "/about/quality",
  "/search",
  "/staging-validation-not-found-20260730",
];
const VIEWPORTS = [
  { width: 320, height: 844 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];
const BROWSER_ORIGIN = "https://preview-browser.invalid";

function readArg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1]
    ? process.argv[index + 1]
    : fallback;
}

const deploymentFile = readArg("deployment-file", "");
const deploymentFromFile = deploymentFile
  ? JSON.parse(await readFile(path.resolve(deploymentFile), "utf8")).url
  : "";
const deployment = readArg("deployment", deploymentFromFile);
if (!/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(deployment)) {
  throw new Error("--deployment にVercel Preview URLを指定してください。");
}
const outputDirectory = path.resolve(
  readArg(
    "out",
    "../docs/audits/evidence/intuitive-ux-heat-first-2026-07-29/preview/browser",
  ),
);
const requestedRoutes = new Set(
  readArg("routes", "")
    .split(",")
    .map((route) => route.trim())
    .filter(Boolean),
);
const routes =
  requestedRoutes.size === 0
    ? ROUTES
    : ROUTES.filter((route) => requestedRoutes.has(route));
if (routes.length !== (requestedRoutes.size || ROUTES.length)) {
  throw new Error("--routes に未登録のrouteがあります。");
}
await mkdir(outputDirectory, { recursive: true });

const temporaryRoot = await mkdtemp(
  path.join(tmpdir(), "safe-ai-preview-browser-"),
);
const repositoryRoot = path.resolve(process.cwd(), "..");
const responseCache = new Map();
const waiting = [];
let active = 0;

async function withSlot(operation) {
  if (active >= 4) {
    await new Promise((resolve) => waiting.push(resolve));
  }
  active += 1;
  try {
    return await operation();
  } finally {
    active -= 1;
    waiting.shift()?.();
  }
}

function runVercelCurl(requestPath, headerPath, bodyPath) {
  return new Promise((resolve, reject) => {
    const vercelEntry =
      process.platform === "win32"
        ? path.join(
            process.env.APPDATA ?? "",
            "npm",
            "node_modules",
            "vercel",
            "dist",
            "vc.js",
          )
        : null;
    const command = vercelEntry ? process.execPath : "vercel";
    const vercelArguments = [
      "curl",
      requestPath,
      "--deployment",
      deployment,
      "--",
      "--silent",
      "--show-error",
      "--location",
      "--dump-header",
      headerPath,
      "--output",
      bodyPath,
    ];
    const child = spawn(
      command,
      vercelEntry ? [vercelEntry, ...vercelArguments] : vercelArguments,
      {
        cwd: repositoryRoot,
        windowsHide: true,
        stdio: ["ignore", "ignore", "pipe"],
      },
    );
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      if (stderr.length < 8_000) stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`vercel curl failed (${code}): ${stderr.slice(-1200)}`));
    });
  });
}

function parseLastHeaderBlock(rawHeaders) {
  const matches = [...rawHeaders.matchAll(/^HTTP\/\S+\s+(\d{3})[^\r\n]*$/gim)];
  const last = matches.at(-1);
  if (!last || last.index === undefined) {
    throw new Error("Preview応答ヘッダーを解析できませんでした。");
  }
  const block = rawHeaders.slice(last.index).split(/\r?\n\r?\n/, 1)[0];
  const headers = {};
  for (const line of block.split(/\r?\n/).slice(1)) {
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    const name = line.slice(0, colon).trim().toLowerCase();
    if (["content-encoding", "content-length", "transfer-encoding"].includes(name)) {
      continue;
    }
    headers[name] = line.slice(colon + 1).trim();
  }
  return { status: Number(last[1]), headers };
}

async function loadPreviewResponse(requestPath) {
  const cached = responseCache.get(requestPath);
  if (cached) return cached;
  const pending = withSlot(async () => {
    const requestId = randomUUID();
    const headerPath = path.join(temporaryRoot, `${requestId}.headers`);
    const bodyPath = path.join(temporaryRoot, `${requestId}.body`);
    try {
      await runVercelCurl(requestPath, headerPath, bodyPath);
      const [rawHeaders, body] = await Promise.all([
        readFile(headerPath, "utf8"),
        readFile(bodyPath),
      ]);
      return { ...parseLastHeaderBlock(rawHeaders), body };
    } finally {
      await Promise.all([
        unlink(headerPath).catch(() => undefined),
        unlink(bodyPath).catch(() => undefined),
      ]);
    }
  });
  responseCache.set(requestPath, pending);
  try {
    return await pending;
  } catch (error) {
    responseCache.delete(requestPath);
    throw error;
  }
}

function routeSlug(route) {
  return route === "/"
    ? "home"
    : route.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9]+/gi, "-");
}

const browser = await chromium.launch({ headless: true });
const results = [];
const externalRequests = [];

try {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport,
      locale: "ja-JP",
      timezoneId: "Asia/Tokyo",
      colorScheme: "light",
      reducedMotion: "reduce",
      serviceWorkers: "block",
    });
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== BROWSER_ORIGIN) {
        externalRequests.push({
          url: request.url(),
          type: request.resourceType(),
        });
        await route.abort("blockedbyclient");
        return;
      }
      if (request.method() !== "GET") {
        await route.fulfill({
          status: 405,
          contentType: "text/plain; charset=utf-8",
          body: "Preview browser audit blocks non-GET requests.",
        });
        return;
      }
      try {
        const source = await loadPreviewResponse(`${url.pathname}${url.search}`);
        const headers = { ...source.headers };
        if (headers.location?.startsWith(deployment)) {
          headers.location = headers.location.replace(deployment, BROWSER_ORIGIN);
        }
        await route.fulfill({
          status: source.status,
          headers,
          body: source.body,
        });
      } catch (error) {
        await route.fulfill({
          status: 502,
          contentType: "text/plain; charset=utf-8",
          body: error instanceof Error ? error.message : String(error),
        });
      }
    });

    for (const routePath of routes) {
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));

      const response = await page.goto(`${BROWSER_ORIGIN}${routePath}`, {
        waitUntil: "domcontentloaded",
        timeout: 180_000,
      });
      await page.waitForTimeout(800);
      const metrics = await page.evaluate(async () => {
        const primary = document.querySelector(
          "main [data-primary-action], main a[href], main button:not([disabled])",
        );
        const primaryBox = primary?.getBoundingClientRect() ?? null;
        const homeOrderSelectors = [
          "h1",
          "#home-primary-tasks",
          "#home-automation-heading",
          "#home-persona-title",
          "#home-feature-directory",
        ];
        const homeNodes = homeOrderSelectors.map((selector) =>
          document.querySelector(selector),
        );
        const homeOrderCorrect =
          homeNodes.every(Boolean) &&
          homeNodes.every((node, index) => {
            if (index === 0) return true;
            const previous = homeNodes[index - 1];
            return Boolean(
              previous &&
                node &&
                (previous.compareDocumentPosition(node) &
                  Node.DOCUMENT_POSITION_FOLLOWING),
            );
          });
        const serviceWorkerRegistrations =
          "serviceWorker" in navigator
            ? (await navigator.serviceWorker.getRegistrations()).length
            : 0;
        return {
          h1: Array.from(document.querySelectorAll("h1")).map((node) =>
            (node.textContent ?? "").replace(/\s+/g, " ").trim(),
          ),
          mainCount: document.querySelectorAll("main").length,
          overflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          primaryActionVisible:
            primaryBox !== null &&
            primaryBox.top < window.innerHeight &&
            primaryBox.bottom > 0,
          previewMetaRobots:
            document
              .querySelector('meta[name="robots"]')
              ?.getAttribute("content") ?? null,
          canonical:
            document
              .querySelector('link[rel="canonical"]')
              ?.getAttribute("href") ?? null,
          homeOrderCorrect,
          desktopNav: Array.from(
            document.querySelectorAll(
              'nav[aria-label="主要機能ナビゲーション"] a',
            ),
          ).map((node) => (node.textContent ?? "").replace(/\s+/g, " ").trim()),
          mobileNav: Array.from(
            document.querySelectorAll(
              'nav[aria-label="モバイル ボトムナビゲーション"] a',
            ),
          ).map((node) => (node.textContent ?? "").replace(/\s+/g, " ").trim()),
          heatHero: Boolean(
            document.querySelector(
              '[data-heat-campaign-presentation="seasonal-large"] h1',
            ),
          ),
          automationContactState:
            document.body.textContent?.match(
              /Webフォーム受付中|メール相談受付中|受付停止中/,
            )?.[0] ?? null,
          automationFormCount: document.querySelectorAll(
            'form[action*="automation"], #consult-form form',
          ).length,
          serviceWorkerRegistrations,
        };
      });
      const responseHeaders = await response?.allHeaders();
      const screenshotName = `${routeSlug(routePath)}-${viewport.width}x${viewport.height}.png`;
      await page.screenshot({
        path: path.join(outputDirectory, screenshotName),
        fullPage: false,
      });
      const platformConsoleNotices = consoleErrors.filter((message) =>
        /https:\/\/vercel\.live\/_next-live\/feedback\/feedback\.js.*Content Security Policy/i.test(
          message,
        ),
      );
      const reportOnlyDirectiveNotices = consoleErrors.filter((message) =>
        /^The Content Security Policy directive 'upgrade-insecure-requests' is ignored when delivered in a report-only policy\.$/i.test(
          message,
        ),
      );
      const expectedDocumentNotFoundNotices =
        routePath.includes("staging-validation-not-found") ||
        routePath.startsWith("/admin/")
        ? consoleErrors.filter((message) =>
            /^Failed to load resource: the server responded with a status of 404 \(Not Found\)$/i.test(
              message,
            ),
          )
        : [];
      const appConsoleErrors = consoleErrors.filter(
        (message) =>
          !platformConsoleNotices.includes(message) &&
          !reportOnlyDirectiveNotices.includes(message) &&
          !expectedDocumentNotFoundNotices.includes(message),
      );
      results.push({
        route: routePath,
        viewport,
        status: response?.status() ?? null,
        xRobotsTag: responseHeaders?.["x-robots-tag"] ?? null,
        previewMode: responseHeaders?.["x-safe-ai-preview-mode"] ?? null,
        ...metrics,
        consoleErrors,
        platformConsoleNotices,
        reportOnlyDirectiveNotices,
        expectedDocumentNotFoundNotices,
        appConsoleErrors,
        pageErrors,
      });
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
  await rmdir(temporaryRoot).catch(() => undefined);
}

const trackerRequests = externalRequests.filter(({ url }) =>
  /google-analytics|googletagmanager|googlesyndication|doubleclick/i.test(url),
);
const failures = results.flatMap((result) => {
  const prefix = `${result.route}@${result.viewport.width}`;
  const expectedStatus =
    result.route.includes("staging-validation-not-found") ||
    result.route.startsWith("/admin/")
      ? 404
      : 200;
  return [
    result.status === expectedStatus ? null : `${prefix}:HTTP=${result.status}`,
    result.h1.length === 1 ? null : `${prefix}:H1=${result.h1.length}`,
    result.mainCount === 1 ? null : `${prefix}:main=${result.mainCount}`,
    result.overflow <= 1 ? null : `${prefix}:overflow=${result.overflow}`,
    /noindex/i.test(result.xRobotsTag ?? "") &&
    /nofollow/i.test(result.xRobotsTag ?? "") &&
    /noarchive/i.test(result.xRobotsTag ?? "")
      ? null
      : `${prefix}:preview-robots-header`,
    result.appConsoleErrors.length === 0
      ? null
      : `${prefix}:app-console=${result.appConsoleErrors.length}`,
    result.pageErrors.length === 0
      ? null
      : `${prefix}:pageerror=${result.pageErrors.length}`,
    result.serviceWorkerRegistrations === 0
      ? null
      : `${prefix}:service-worker=${result.serviceWorkerRegistrations}`,
  ].filter(Boolean);
});

const output = {
  generatedAt: new Date().toISOString(),
  deployment,
  authenticatedTransport: "vercel curl + Playwright route fulfillment",
  routeCount: routes.length,
  viewportCount: VIEWPORTS.length,
  checkCount: results.length,
  cacheEntryCount: responseCache.size,
  trackerRequestCount: trackerRequests.length,
  failures,
  results,
  externalRequests,
};
await writeFile(
  path.join(outputDirectory, "preview-browser-results.json"),
  `${JSON.stringify(output, null, 2)}\n`,
  "utf8",
);
process.stdout.write(
  `${JSON.stringify(
    {
      deployment,
      checkCount: output.checkCount,
      cacheEntryCount: output.cacheEntryCount,
      trackerRequestCount: output.trackerRequestCount,
      failureCount: output.failures.length,
      failures: output.failures,
      output: path.join(outputDirectory, "preview-browser-results.json"),
    },
    null,
    2,
  )}\n`,
);
if (output.failures.length > 0) process.exitCode = 1;
