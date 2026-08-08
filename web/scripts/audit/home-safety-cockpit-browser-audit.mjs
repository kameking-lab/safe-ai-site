import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((value) => value.startsWith("--") && value.includes("="))
    .map((value) => {
      const [key, ...parts] = value.slice(2).split("=");
      return [key, parts.join("=")];
    }),
);

const baseUrl = (args.base || "http://localhost:3217").replace(/\/$/, "");
const label = args.label || "local";
const cookieJar = args.cookie || process.env.DEPLOYMENT_AUDIT_COOKIE_JAR;
const outputRoot = resolve(
  args.output ||
    "../docs/audits/evidence/home-safety-cockpit-2026-07-31",
);
const outputDir = resolve(outputRoot, label);
mkdirSync(outputDir, { recursive: true });

const viewports = [
  { width: 320, height: 800 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];

const browser = await chromium.launch({ headless: true });

function readBypassCookie(path) {
  if (!path) return null;
  const line = readFileSync(path, "utf8")
    .split(/\r?\n/)
    .find((candidate) => candidate.includes("\t_vercel_jwt\t"));
  if (!line) {
    throw new Error("Vercel bypass cookie was not found in the cookie jar.");
  }
  const parts = line.split("\t");
  if (parts.length < 7) {
    throw new Error("The Vercel bypass cookie jar has an invalid format.");
  }
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

const bypassCookie = readBypassCookie(cookieJar);

async function createAuditContext(options) {
  const context = await browser.newContext(options);
  if (bypassCookie) await context.addCookies([bypassCookie]);
  return context;
}
const results = {
  baseUrl,
  label,
  capturedAt: new Date().toISOString(),
  viewports: [],
  selectedWbgt: [],
  journeys: {},
  accessibility: {},
  safety: {},
  fallbacks: {},
  platformConsoleMessages: [],
};

function captureConsoleError(message, consoleErrors) {
  if (message.type() !== "error") return;
  const value = message.text();
  const platformOnly =
    value.includes("https://vercel.live/_next-live/feedback/feedback.js") ||
    value.includes(
      "The Content Security Policy directive 'upgrade-insecure-requests' is ignored when delivered in a report-only policy.",
    );
  if (platformOnly) {
    if (!results.platformConsoleMessages.includes(value)) {
      results.platformConsoleMessages.push(value);
    }
    return;
  }
  consoleErrors.push(value);
}

async function waitForCockpit(page) {
  await page.goto(`${baseUrl}/`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await page.locator("[data-home-safety-cockpit]").waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await page.waitForTimeout(400);
}

for (const viewport of viewports) {
  const context = await createAuditContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) =>
    captureConsoleError(message, consoleErrors),
  );
  page.on("pageerror", (error) => pageErrors.push(error.name));
  await page.addInitScript(() => {
    window.__homeCockpitAudit = { cls: 0, longTasks: [] };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__homeCockpitAudit.cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__homeCockpitAudit.longTasks.push(entry.duration);
      }
    }).observe({ type: "longtask", buffered: true });
  });
  await waitForCockpit(page);

  const metrics = await page.evaluate(() => {
    const isVisible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number(style.opacity) === 0
      ) {
        return false;
      }
      const rect = element.getBoundingClientRect();
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.top < innerHeight &&
        rect.right > 0 &&
        rect.left < innerWidth
      );
    };
    const firstViewNodes = [...document.querySelectorAll("main *")].filter(
      (node) =>
        isVisible(node) &&
        node.children.length === 0 &&
        (node.textContent || "").trim(),
    );
    const firstViewText = [...new Set(
      firstViewNodes.map((node) =>
        (node.textContent || "").replace(/\s+/g, " ").trim(),
      ),
    )].join(" ");
    const controls = [
      ...document.querySelectorAll(
        'main a[href], main button, main input, main textarea, main select, main [role="button"]',
      ),
    ].filter(isVisible);
    const inputs = [
      ...document.querySelectorAll("main input, main textarea, main select"),
    ].filter(isVisible);
    const rectFor = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        visible: isVisible(element),
      };
    };
    return {
      h1: document.querySelector("h1")?.textContent?.trim() || null,
      firstViewCharacters: [...firstViewText].length,
      firstViewText: firstViewText.slice(0, 1_500),
      firstViewControlCount: controls.length,
      firstViewInputCount: inputs.length,
      pageScrollHeight: document.documentElement.scrollHeight,
      viewportHeight: innerHeight,
      screenLengths: Number(
        (document.documentElement.scrollHeight / innerHeight).toFixed(2),
      ),
      horizontalOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      mascotCount: document.querySelectorAll(
        "[data-home-safety-cockpit] [data-mascot-guide]",
      ).length,
      selectedMobileTab:
        document
          .querySelector('[role="tab"][aria-selected="true"]')
          ?.textContent?.trim() || null,
      featureRects: {
        area: rectFor("[data-area-quick-search]"),
        slides: rectFor("[data-home-heat-slide-deck]"),
        chemical: rectFor("[data-home-chemical-quick-search]"),
        chat: rectFor("[data-home-chat-quick-ask]"),
      },
      cls: window.__homeCockpitAudit?.cls ?? null,
      maxLongTaskMs: Math.max(
        0,
        ...(window.__homeCockpitAudit?.longTasks ?? []),
      ),
    };
  });
  await page.screenshot({
    path: resolve(
      outputDir,
      `home-${label}-${viewport.width}x${viewport.height}.png`,
    ),
    fullPage: false,
  });
  results.viewports.push({
    ...viewport,
    ...metrics,
    consoleErrors,
    pageErrors,
  });
  await context.close();
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  const context = await createAuditContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) =>
    captureConsoleError(message, consoleErrors),
  );
  page.on("pageerror", (error) => pageErrors.push(error.name));
  await page.addInitScript(() => {
    localStorage.setItem("safe-ai:coarse-area-id:v1", "tokyo-shinjuku");
  });
  await waitForCockpit(page);
  await page.waitForFunction(
    () => {
      const status = document
        .querySelector("[data-heat-status]")
        ?.getAttribute("data-heat-status");
      return status && status !== "loading" && status !== "area-unselected";
    },
    undefined,
    { timeout: 20_000 },
  );
  const metrics = await page.evaluate(() => {
    const status = document.querySelector("[data-heat-status]");
    return {
      status: status?.getAttribute("data-heat-status") ?? null,
      areaId: status?.getAttribute("data-area-id") ?? null,
      wbgtKind:
        status?.querySelector("[data-wbgt-kind]")?.getAttribute("data-wbgt-kind") ??
        null,
      hasHeatAlert: (status?.textContent || "").includes("熱中症警戒"),
      hasSpecialAlert: (status?.textContent || "").includes("特別警戒"),
      hasJmaWarning: (status?.textContent || "").includes("JMA"),
      hasTemperature: (status?.textContent || "").includes("気温"),
      hasHumidity: (status?.textContent || "").includes("湿度"),
      hasRetrievedAt: (status?.textContent || "").includes("取得"),
      hasSource: (status?.textContent || "").includes("環境省"),
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
  await page.screenshot({
    path: resolve(
      outputDir,
      `home-${label}-${viewport.width}x${viewport.height}-selected-wbgt.png`,
    ),
    fullPage: false,
  });
  results.selectedWbgt.push({
    ...viewport,
    ...metrics,
    consoleErrors,
    pageErrors,
  });
  await context.close();
}

async function metadataSnapshot(page) {
  return page.evaluate(() => ({
    canonical:
      document.querySelector('link[rel="canonical"]')?.getAttribute("href") ??
      null,
    robots:
      document.querySelector('meta[name="robots"]')?.getAttribute("content") ??
      null,
    referrer:
      document.querySelector('meta[name="referrer"]')?.getAttribute("content") ??
      null,
  }));
}

async function runJourney(
  name,
  execute,
  viewport = { width: 1440, height: 900 },
) {
  const context = await createAuditContext({
    viewport,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) =>
    captureConsoleError(message, consoleErrors),
  );
  page.on("pageerror", (error) => pageErrors.push(error.name));
  try {
    await waitForCockpit(page);
    results.journeys[name] = {
      ...(await execute(page)),
      consoleErrors,
      pageErrors,
    };
  } catch (error) {
    results.journeys[name] = {
      ok: false,
      errorKind: error instanceof Error ? error.name : "unknown",
      consoleErrors,
      pageErrors,
    };
  } finally {
    await context.close();
  }
}

await runJourney("area", async (page) => {
  const input = page.getByLabel(
    "地域を入力してWBGT・熱中症警戒情報を見る",
  );
  await input.fill("とうきょう");
  const startedAt = Date.now();
  await input.press("Enter");
  await page.waitForURL(/\/risk\?area=tokyo-shinjuku$/, {
    timeout: 20_000,
  });
  const totalNavigationMs = Date.now() - startedAt;
  const navigationStartMs = Number(
    await page.evaluate(
      () =>
        document.documentElement.dataset.homeCockpitNavigationMs || "NaN",
    ),
  );
  const destination = new URL(page.url());
  const metadata = await metadataSnapshot(page);
  const restoredArea =
    (await page.locator("select").first().inputValue().catch(() => null)) ||
    null;
  await page.goBack({ waitUntil: "domcontentloaded" });
  await page.locator("[data-home-safety-cockpit]").waitFor();
  await page.waitForTimeout(300);
  return {
    ok: true,
    inputs: 1,
    confirmationActions: 1,
    intermediatePages: 0,
    totalNavigationMs,
    navigationStartMs,
    destination: destination.pathname,
    areaParam: destination.searchParams.get("area"),
    metadata,
    restoredArea,
    backRestored:
      (await page.getByLabel(
        "地域を入力してWBGT・熱中症警戒情報を見る",
      ).inputValue()) === "東京都 新宿区",
  };
});

await runJourney("chemical", async (page) => {
  const input = page.getByRole("combobox", {
    name: "化学物質を検索",
  });
  await input.fill("トルエン");
  const startedAt = Date.now();
  await input.press("Enter");
  await page.waitForURL(/\/chemical-ra\?(?:cas|name)=/, {
    timeout: 20_000,
  });
  const destinationUrl = new URL(page.url());
  const metadata = await metadataSnapshot(page);
  const restoredValues = await page
    .locator('input[type="search"], input[type="text"]')
    .evaluateAll((inputs) => inputs.map((input) => input.value));
  return {
    ok: true,
    inputs: 1,
    confirmationActions: 1,
    intermediatePages: 0,
    totalNavigationMs: Date.now() - startedAt,
    navigationStartMs: Number(
      await page.evaluate(
        () =>
          document.documentElement.dataset.homeCockpitNavigationMs || "NaN",
      ),
    ),
    destination: destinationUrl.pathname,
    queryKey: destinationUrl.searchParams.has("cas") ? "cas" : "name",
    metadata,
    restoredWithoutReentry: restoredValues.some((value) =>
      value.includes("トルエン"),
    ),
  };
});

await runJourney("chat", async (page) => {
  const question = "足場の手すり高さは？";
  const input = page.getByLabel("安衛法AIへの質問");
  await input.fill(question);
  const startedAt = Date.now();
  await input.press("Enter");
  await page.waitForURL(/\/chatbot$/, { timeout: 20_000 });
  await page.waitForTimeout(500);
  const storageExposure = await page.evaluate((rawQuestion) => {
    const values = [];
    for (const storage of [localStorage, sessionStorage]) {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        values.push(`${key}:${key ? storage.getItem(key) : ""}`);
      }
    }
    return values.some((value) => value.includes(rawQuestion));
  }, question);
  return {
    ok: true,
    inputs: 1,
    confirmationActions: 1,
    intermediatePages: 0,
    totalNavigationMs: Date.now() - startedAt,
    navigationStartMs: Number(
      await page.evaluate(
        () =>
          document.documentElement.dataset.homeCockpitNavigationMs || "NaN",
      ),
    ),
    destination: new URL(page.url()).pathname,
    rawQuestionInUrl: page.url().includes(encodeURIComponent(question)),
    rawQuestionInStorage: storageExposure,
    destinationHasQuestion: await page.getByText(question).count(),
  };
});

await runJourney("slides", async (page) => {
  await page.getByRole("tab", { name: "スライド" }).click();
  const carousel = page.getByRole("region", {
    name: "熱中症を防ぐ現場ブリーフィング",
  });
  for (let index = 0; index < 4; index += 1) {
    await page.getByRole("button", { name: "次のスライド" }).click();
  }
  const fifthVisible = await page
    .getByText("5 / 15", { exact: true })
    .isVisible();
  await carousel.press("End");
  return {
    ok: true,
    pageTransitionsForFive: 0,
    fifthVisible,
    fullDeckReachable: await page
      .getByText("15 / 15", { exact: true })
      .isVisible(),
  };
}, { width: 390, height: 844 });

await runJourney("ambiguous-area", async (page) => {
  const input = page.getByLabel(
    "地域を入力してWBGT・熱中症警戒情報を見る",
  );
  await input.fill("中央区");
  await input.press("Enter");
  const options = page.getByRole("option");
  await options.first().waitFor({ state: "visible" });
  return {
    ok: true,
    stayedOnHome: new URL(page.url()).pathname === "/",
    candidateCount: await options.count(),
    coarseAreaStored: await page.evaluate(() =>
      localStorage.getItem("safe-ai:coarse-area-id:v1"),
    ),
  };
});

await runJourney("ambiguous-chemical", async (page) => {
  let queryRequests = 0;
  page.on("request", (request) => {
    if (
      request.url().includes("/api/chemical/search") &&
      request.method() === "POST"
    ) {
      const body = request.postDataJSON();
      if (body?.query) queryRequests += 1;
    }
  });
  const input = page.getByRole("combobox", {
    name: "化学物質を検索",
  });
  await input.fill("キシレン");
  await input.press("Enter");
  await page.waitForURL(/\/chemical-ra\?name=/, { timeout: 20_000 });
  const destination = new URL(page.url());
  const destinationInput = page.locator("#chemical-onebox-input");
  await destinationInput.waitFor({ state: "visible" });
  const destinationSearch = destinationInput.locator("xpath=../..");
  await destinationSearch.getByRole("option").nth(1).waitFor({
    state: "visible",
    timeout: 20_000,
  });
  const candidateCount = await destinationSearch.getByRole("option").count();
  const ambiguityNoticeVisible = await destinationSearch
    .getByText(/複数候補があります/)
    .isVisible();
  await destinationInput.press("Enter");
  await page.waitForTimeout(100);
  const implicitConfirmationCount = await destinationSearch
    .getByText("この物質候補を確認してください")
    .count();
  return {
    ok: true,
    destination: destination.pathname,
    namePresent: destination.searchParams.has("name"),
    casAssigned: destination.searchParams.has("cas"),
    candidateChoiceRequired:
      candidateCount > 1 &&
      ambiguityNoticeVisible &&
      implicitConfirmationCount === 0,
    candidateCount,
    ambiguityNoticeVisible,
    enterDidNotConfirm: implicitConfirmationCount === 0,
    queryRequests,
    duplicateQueryRequest: queryRequests > 1,
  };
});

{
  const context = await createAuditContext({
    viewport: { width: 390, height: 844 },
    forcedColors: "active",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) =>
    captureConsoleError(message, consoleErrors),
  );
  page.on("pageerror", (error) => pageErrors.push(error.name));
  await waitForCockpit(page);
  const focusEvidence = [];
  for (const locator of [
    page.getByRole("tab", { name: "暑さ" }),
    page.getByLabel("地域を入力してWBGT・熱中症警戒情報を見る"),
    page.getByRole("tab", { name: "スライド" }),
  ]) {
    await page.keyboard.press("Tab");
    await locator.focus();
    await page.waitForTimeout(50);
    focusEvidence.push(
      await locator.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          focused: element === document.activeElement,
          focusVisible: element.matches(":focus-visible"),
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          boxShadow: style.boxShadow,
        };
      }),
    );
  }
  const beforeProgress = await page
    .locator("[data-home-heat-slide-deck]")
    .getByText(/1 \/ 15/)
    .count();
  await page.waitForTimeout(800);
  results.accessibility.forcedColorsReducedMotion = {
    horizontalOverflow: await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
    tabTargetsAtLeast44: await page.getByRole("tab").evaluateAll((tabs) =>
      tabs.every((tab) => {
        const rect = tab.getBoundingClientRect();
        return rect.width >= 44 && rect.height >= 44;
      }),
    ),
    slideDidNotAutoplay:
      beforeProgress > 0 &&
      (await page
        .locator("[data-home-heat-slide-deck]")
        .getByText(/1 \/ 15/)
        .count()) > 0,
    focusEvidence,
    consoleErrors,
    pageErrors,
  };
  await context.close();
}

results.accessibility.reflow = [];
for (const probe of [
  { zoomPercent: 200, effectiveCssWidth: 640 },
  { zoomPercent: 400, effectiveCssWidth: 320 },
]) {
  const context = await createAuditContext({
    viewport: { width: probe.effectiveCssWidth, height: 900 },
  });
  const page = await context.newPage();
  await waitForCockpit(page);
  results.accessibility.reflow.push({
    ...probe,
    horizontalOverflow: await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
    cockpitUsable: await page.locator("[data-home-safety-cockpit]").isVisible(),
  });
  await context.close();
}

{
  const context = await createAuditContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  await waitForCockpit(page);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 4 });
  const carousel = page.getByRole("region", {
    name: "熱中症を防ぐ現場ブリーフィング",
  });
  await carousel.focus();
  await carousel.press("ArrowRight");
  results.accessibility.pageScale400 = await page.evaluate(() => ({
    method: "Chromium CDP Emulation.setPageScaleFactor",
    visualViewportScale: window.visualViewport?.scale ?? null,
    focusedLabel: document.activeElement?.textContent?.trim() ?? null,
    slideAdvanced:
      document
        .querySelector("[data-home-heat-slide-deck] [data-current-slide]")
        ?.getAttribute("aria-label")
        ?.startsWith("スライド2") ?? false,
    documentHorizontalOverflow:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  }));
  await context.close();
}

{
  const context = await createAuditContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  let queryRequests = 0;
  page.on("request", (request) => {
    if (
      request.url().includes("/api/chemical/search") &&
      request.method() === "POST" &&
      request.postDataJSON()?.query
    ) {
      queryRequests += 1;
    }
  });
  await waitForCockpit(page);
  await page.getByRole("tab", { name: "化学物質" }).click();
  const input = page.getByRole("combobox", { name: "化学物質を検索" });
  const syntheticPii = "audit.person@example.invalid";
  await input.fill(syntheticPii);
  await input.press("Enter");
  await page
    .locator('[data-home-chemical-quick-search] [role="alert"]')
    .waitFor({ state: "visible" });
  const stayedOnHome = new URL(page.url()).pathname === "/";
  const rawTextInUrl = page.url().includes(encodeURIComponent(syntheticPii));
  await page.goto(
    `${baseUrl}/chemical-ra?name=${encodeURIComponent(syntheticPii)}`,
    { waitUntil: "domcontentloaded", timeout: 45_000 },
  );
  await page.locator("#chemical-onebox-input").waitFor({ state: "visible" });
  results.safety.homeChemicalGuard = {
    stayedOnHome,
    blockedBeforeApi: queryRequests === 0,
    rawTextInHomeUrl: rawTextInUrl,
    directSensitivePrefillRejected:
      (await page.locator("#chemical-onebox-input").inputValue()) === "",
  };
  await context.close();
}

{
  const context = await createAuditContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await waitForCockpit(page);
  await page.getByRole("tab", { name: "法令AI" }).click();
  const input = page.getByLabel("安衛法AIへの質問");
  const emergency = "作業員が倒れて呼吸がありません";
  await input.fill(emergency);
  await input.press("Enter");
  const emergencyAlert = page.locator("[data-home-chat-emergency]");
  await emergencyAlert.waitFor();
  const emergencyText = await emergencyAlert.textContent();
  const emergencyResult = {
    stayedOnHome: new URL(page.url()).pathname === "/",
    has119: emergencyText?.includes("119") ?? false,
    hasAed: emergencyText?.includes("AED") ?? false,
    seriousMascot:
      (await page
        .locator("[data-home-safety-cockpit] [data-mascot-guide]")
        .getAttribute("data-serious")) === "true",
  };
  const pii = "連絡先はtest@example.comです";
  await input.fill(pii);
  await input.press("Enter");
  await page.locator("[data-home-chat-privacy]").waitFor();
  const rawStorageExposure = await page.evaluate((values) => {
    const storageValues = [];
    for (const storage of [localStorage, sessionStorage]) {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        storageValues.push(`${key}:${key ? storage.getItem(key) : ""}`);
      }
    }
    return values.some((value) =>
      storageValues.some((stored) => stored.includes(value)),
    );
  }, [emergency, pii]);
  results.safety.homeChatGuard = {
    emergency: emergencyResult,
    piiBlocked: new URL(page.url()).pathname === "/",
    rawTextInUrl:
      page.url().includes(encodeURIComponent(emergency)) ||
      page.url().includes(encodeURIComponent(pii)),
    rawTextInStorage: rawStorageExposure,
  };
  await context.close();
}

{
  const context = await createAuditContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await waitForCockpit(page);
  await context.setOffline(true);
  await page.getByRole("tab", { name: "化学物質" }).click();
  const input = page.getByRole("combobox", { name: "化学物質を検索" });
  await input.fill("108-88-3");
  await input.press("Enter");
  await page
    .getByText(/通信を確認できないため|安全確認を完了できないため/)
    .waitFor();
  await page.getByRole("tab", { name: "スライド" }).click();
  await page.getByRole("button", { name: "次のスライド" }).click();
  await page.getByRole("tab", { name: "法令AI" }).click();
  const chatInput = page.getByLabel("安衛法AIへの質問");
  const offlineQuestion = "安衛法第61条";
  await chatInput.fill(offlineQuestion);
  await chatInput.press("Enter");
  await page.getByText(/安全確認を完了できないため送信していません/).waitFor();
  const offlineChatStored = await page.evaluate((marker) => {
    for (const storage of [localStorage, sessionStorage]) {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (`${key}:${key ? storage.getItem(key) : ""}`.includes(marker)) {
          return true;
        }
      }
    }
    return false;
  }, offlineQuestion);
  results.fallbacks.offline = {
    stayedOnHome: new URL(page.url()).pathname === "/",
    chemicalUnavailableNotZero:
      (await page.getByText(/0件・収載外とは判定しません/).count()) > 0,
    slideStillOperable:
      (await page.getByText("2 / 15", { exact: true }).count()) > 0,
    chatFailedClosedOnHome: new URL(page.url()).pathname === "/",
    chatRawTextStored: offlineChatStored,
  };
  await context.close();
}

{
  const context = await createAuditContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await waitForCockpit(page);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 500,
    downloadThroughput: 100 * 1024,
    uploadThroughput: 50 * 1024,
    connectionType: "cellular3g",
  });
  let queryRequests = 0;
  page.on("request", (request) => {
    if (
      request.url().includes("/api/chemical/search") &&
      request.method() === "POST"
    ) {
      const body = request.postDataJSON();
      if (body?.query) queryRequests += 1;
    }
  });
  await page.getByRole("tab", { name: "化学物質" }).click();
  const input = page.getByRole("combobox", { name: "化学物質を検索" });
  await input.fill("108-88-3");
  await page.waitForFunction(
    () =>
      performance
        .getEntriesByType("resource")
        .some((entry) => entry.name.includes("/api/chemical/search")),
    undefined,
    { timeout: 20_000 },
  );
  await input.press("Enter");
  await page.waitForURL(/\/chemical-ra\?cas=108-88-3$/, {
    timeout: 30_000,
  });
  await page.locator("#chemical-onebox-input").waitFor({
    state: "visible",
    timeout: 20_000,
  });
  await page.waitForFunction(
    () =>
      document.querySelector("#chemical-onebox-input")?.value ===
      "トルエン",
    undefined,
    { timeout: 20_000 },
  );
  await page.waitForTimeout(400);
  results.fallbacks.slowNetwork = {
    emulatedConnection: "500ms latency / 3G class",
    queryRequests,
    duplicateQueryRequest: queryRequests > 1,
    destination: new URL(page.url()).pathname,
  };
  await context.close();
}

{
  const context = await createAuditContext({
    viewport: { width: 390, height: 844 },
    javaScriptEnabled: false,
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  results.fallbacks.noJavaScript = {
    cockpitRendered: (await page.locator("[data-home-safety-cockpit]").count()) > 0,
    links: await page
      .locator(
        'a[href="/risk"], a[href="/heat-illness-prevention/slides"], a[href="/chemical-ra"], a[href="/chatbot"]',
      )
      .evaluateAll((links) => [...new Set(links.map((link) => link.getAttribute("href")))]),
  };
  await context.close();
}

{
  const context = await createAuditContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.route("**/api/weather-risk?**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ ok: false }),
    }),
  );
  await page.route("**/api/wbgt?**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ ok: false }),
    }),
  );
  await waitForCockpit(page);
  await page.evaluate(() =>
    localStorage.setItem(
      "safe-ai:coarse-area-id:v1",
      "tokyo-shinjuku",
    ),
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("[data-home-safety-cockpit]").waitFor();
  await page.waitForTimeout(500);
  results.fallbacks.apiFailure = {
    status: await page.locator("[data-heat-status]").getAttribute("data-heat-status"),
    saysUnavailable:
      (await page.getByText(/取得不能/).count()) > 0,
    saysSafe:
      (await page.getByText(/安全です|低リスクです|基準値内です/).count()) >
      0,
  };
  await context.close();
}

await browser.close();
writeFileSync(
  resolve(outputDir, `home-cockpit-${label}-browser-audit.json`),
  `${JSON.stringify(results, null, 2)}\n`,
  "utf8",
);
process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
