import { mkdirSync, writeFileSync } from "node:fs";
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

const baseUrl = (args.base || "http://127.0.0.1:3107").replace(/\/$/, "");
const label = args.label || "local-after";
const outputDir = resolve(
  args.output ||
    "../docs/audits/evidence/effect-first-home-ux-2026-07-31",
  label,
);
mkdirSync(outputDir, { recursive: true });

const localCoarseHeaders =
  args.coarse === "false"
    ? {}
    : {
        "x-vercel-ip-country": "JP",
        "x-vercel-ip-country-region": "13",
      };
const viewports = [
  { width: 320, height: 800 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];
const expectedOrder = [
  "heat",
  "chat",
  "updates",
  "chemical",
  "learning",
  "core-features",
  "safety-labs",
  "automation-consult",
  "quality",
];

const browser = await chromium.launch({ headless: true });
const results = {
  baseUrl,
  label,
  capturedAt: new Date().toISOString(),
  expectedOrder,
  viewports: [],
  heat: {},
  accessibility: {},
  noJavaScript: {},
  landingPage: {},
};

function attachRuntimeEvidence(page, runtime) {
  page.on("console", (message) => {
    if (message.type() === "error") runtime.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => runtime.pageErrors.push(error.name));
}

async function newContext(options = {}) {
  return browser.newContext({
    extraHTTPHeaders: localCoarseHeaders,
    ...options,
  });
}

async function gotoHome(page) {
  await page.goto(`${baseUrl}/`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await page.locator('[data-home-section="heat"]').waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await page.waitForTimeout(500);
}

for (const viewport of viewports) {
  const context = await newContext({ viewport });
  const page = await context.newPage();
  const runtime = { consoleErrors: [], pageErrors: [] };
  attachRuntimeEvidence(page, runtime);
  await page.addInitScript(() => {
    window.__effectFirstAudit = { cls: 0, longTasks: [] };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__effectFirstAudit.cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__effectFirstAudit.longTasks.push(entry.duration);
      }
    }).observe({ type: "longtask", buffered: true });
  });
  await gotoHome(page);

  const metrics = await page.evaluate((order) => {
    const visible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) !== 0 &&
        rect.width > 0 &&
        rect.height > 0 &&
        rect.right > 0 &&
        rect.left < innerWidth &&
        rect.bottom > 0 &&
        rect.top < innerHeight
      );
    };
    const leafText = [...document.querySelectorAll("main *")]
      .filter(
        (element) =>
          visible(element) &&
          element.children.length === 0 &&
          (element.textContent || "").trim(),
      )
      .map((element) => (element.textContent || "").replace(/\s+/g, " ").trim());
    const firstViewText = [...new Set(leafText)].join(" ");
    const sections = [
      ...document.querySelectorAll("[data-home-section]"),
    ].map((section) => {
      const rect = section.getBoundingClientRect();
      const text = (section.textContent || "").replace(/\s+/g, " ").trim();
      return {
        id: section.getAttribute("data-home-section"),
        top: Math.round(rect.top + scrollY),
        characters: [...text].length,
        inputCount: section.querySelectorAll("input, textarea, select").length,
        linkCount: section.querySelectorAll("a[href]").length,
        itemCount: section.querySelectorAll("li, article").length,
        imageCount: section.querySelectorAll("img, picture").length,
      };
    });
    const sectionOrder = sections.map((section) => section.id);
    const emptyEntranceCount = sections.filter((section) => {
      const node = document.querySelector(
        `[data-home-section="${section.id}"]`,
      );
      if (!node) return true;
      const hasConcreteContent = Boolean(
        node.querySelector(
          "input, textarea, time, img, article, li, dl > div, [data-wbgt-kind], [data-heat-status]",
        ),
      );
      return !hasConcreteContent;
    }).length;
    const controls = [
      ...document.querySelectorAll(
        "main a[href], main button, main input, main textarea, main select",
      ),
    ].filter(visible);
    const inputs = [
      ...document.querySelectorAll("main input, main textarea, main select"),
    ].filter(visible);
    const sectionRects = Object.fromEntries(
      sections.map((section) => [
        section.id,
        {
          top: section.top,
          visibleInFirstView: section.top < innerHeight,
        },
      ]),
    );
    const labels = [...document.querySelectorAll("main a, main button")]
      .map((element) => (element.textContent || "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
    return {
      h1: document.querySelector("h1")?.textContent?.trim() || null,
      firstViewCharacters: [...firstViewText].length,
      firstViewText: firstViewText.slice(0, 1_800),
      fullMainCharacters: [
        ...(document.querySelector("main")?.innerText || ""),
      ].length,
      firstViewControlCount: controls.length,
      firstViewInputCount: inputs.length,
      pageScrollHeight: document.documentElement.scrollHeight,
      viewportHeight: innerHeight,
      screenLengths: Number(
        (document.documentElement.scrollHeight / innerHeight).toFixed(2),
      ),
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      sectionOrder,
      orderMatches:
        sectionOrder.length === order.length &&
        sectionOrder.every((value, index) => value === order[index]),
      sections,
      sectionRects,
      emptyEntranceCount,
      bareSearchLinkCount: labels.filter(
        (label) =>
          label === "探す" ||
          label === "詳しく見る" ||
          label === "詳しくはこちら",
      ).length,
      wbgtKind:
        document
          .querySelector("[data-wbgt-kind]")
          ?.getAttribute("data-wbgt-kind") || null,
      heatStatus:
        document
          .querySelector("[data-heat-status]")
          ?.getAttribute("data-heat-status") || null,
      cls: window.__effectFirstAudit?.cls ?? null,
      maxLongTaskMs: Math.max(
        0,
        ...(window.__effectFirstAudit?.longTasks ?? []),
      ),
    };
  }, expectedOrder);

  await page.screenshot({
    path: resolve(outputDir, `home-${viewport.width}x${viewport.height}.png`),
    fullPage: false,
  });
  if (viewport.width === 390 || viewport.width === 1440) {
    await page.screenshot({
      path: resolve(
        outputDir,
        `home-${viewport.width}x${viewport.height}-full.png`,
      ),
      fullPage: true,
    });
  }
  if (viewport.width === 1440) {
    for (const sectionId of expectedOrder) {
      const section = page.locator(`[data-home-section="${sectionId}"]`);
      if ((await section.count()) === 1) {
        await section.screenshot({
          path: resolve(outputDir, `section-${sectionId}-1440.png`),
        });
      }
    }
  }
  results.viewports.push({ ...viewport, ...metrics, ...runtime });
  await context.close();
}

{
  const context = await newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await gotoHome(page);
  const heat = page.locator('[data-home-section="heat"]');
  const heatText = (await heat.innerText()).replace(/\s+/g, " ");
  const deck = heat.locator("[data-home-heat-slide-deck]");
  await deck.getByRole("button", { name: "次のスライド" }).click();
  const afterNext = await deck
    .locator("[data-current-slide]")
    .getAttribute("data-current-slide");
  await deck.getByRole("region").press("End");
  const afterEnd = await deck
    .locator("[data-current-slide]")
    .getAttribute("data-current-slide");
  results.heat = {
    containsChemical: heatText.includes("化学物質"),
    containsLawChat:
      heatText.includes("安衛法AI") || heatText.includes("法令の疑問"),
    containsAutomation: heatText.includes("自動化相談"),
    slideCountText: await deck.locator(".sr-only").last().innerText(),
    afterNext,
    afterEnd,
    hasCurrentLocationUpdate: await heat
      .getByRole("button", { name: "現在地を更新" })
      .isVisible(),
    hasRegionChange: await heat
      .getByText("地域・観測情報を変更", { exact: true })
      .isVisible(),
  };
  await context.close();
}

{
  const context = await newContext({
    viewport: { width: 320, height: 900 },
    forcedColors: "active",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await gotoHome(page);
  results.accessibility.forcedColorsReducedMotion = {
    horizontalOverflow: await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
    slideStillFirstAfterDelay: await (async () => {
      const before = await page
        .locator("[data-current-slide]")
        .getAttribute("data-current-slide");
      await page.waitForTimeout(1_000);
      const after = await page
        .locator("[data-current-slide]")
        .getAttribute("data-current-slide");
      return before === after;
    })(),
    minimumControlHeight: await page.evaluate(() => {
      const controls = [
        ...document.querySelectorAll(
          'main a[href], main button, main input, main textarea, main select, main summary',
        ),
      ].filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width > 0 &&
          rect.height > 0
        );
      });
      return Math.min(...controls.map((element) => element.getBoundingClientRect().height));
    }),
  };
  await page.screenshot({
    path: resolve(outputDir, "home-320-forced-colors-reduced-motion.png"),
    fullPage: false,
  });
  await context.close();
}

for (const probe of [
  { zoomPercent: 200, width: 640 },
  { zoomPercent: 400, width: 320 },
]) {
  const context = await newContext({
    viewport: { width: probe.width, height: 900 },
  });
  const page = await context.newPage();
  await gotoHome(page);
  const result = {
    ...probe,
    horizontalOverflow: await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
    heatVisible: await page.locator('[data-home-section="heat"]').isVisible(),
    chatInputVisible: await page
      .locator('[data-home-section="chat"] textarea')
      .isVisible(),
    chemicalInputVisible: await page
      .locator('[data-home-section="chemical"] input')
      .isVisible(),
  };
  results.accessibility.reflow ??= [];
  results.accessibility.reflow.push(result);
  await context.close();
}

{
  const context = await newContext({
    viewport: { width: 390, height: 844 },
    javaScriptEnabled: false,
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  results.noJavaScript.home = {
    h1: await page.locator("h1").innerText(),
    sectionOrder: await page
      .locator("[data-home-section]")
      .evaluateAll((sections) =>
        sections.map((section) => section.getAttribute("data-home-section")),
      ),
    readableCharacters: [
      ...((await page.locator("main").innerText()) || ""),
    ].length,
    hasSlideFallback:
      (await page
        .getByText(/(?:JavaScriptなしで)?(?:スライド一覧|全15枚)/)
        .count()) > 0,
    horizontalOverflow: await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  };
  await context.close();
}

{
  const context = await newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const runtime = { consoleErrors: [], pageErrors: [] };
  attachRuntimeEvidence(page, runtime);
  await page.goto(`${baseUrl}/safety-ai`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await page.locator("h1").waitFor({ state: "visible" });
  results.landingPage = {
    h1: await page.locator("h1").innerText(),
    canonical: await page
      .locator('link[rel="canonical"]')
      .getAttribute("href"),
    robots:
      (await page.locator('meta[name="robots"]').count()) > 0
        ? await page.locator('meta[name="robots"]').getAttribute("content")
        : "index-default",
    mainCharacters: [...(await page.locator("main").innerText())].length,
    horizontalOverflow: await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
    ...runtime,
  };
  await page.screenshot({
    path: resolve(outputDir, "safety-ai-1440x900.png"),
    fullPage: false,
  });
  await page.screenshot({
    path: resolve(outputDir, "safety-ai-1440x900-full.png"),
    fullPage: true,
  });
  await context.close();
}

{
  const context = await newContext({
    viewport: { width: 390, height: 844 },
    javaScriptEnabled: false,
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/safety-ai`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  results.noJavaScript.landingPage = {
    h1: await page.locator("h1").innerText(),
    readableCharacters: [...(await page.locator("main").innerText())].length,
    ctaCount: await page.locator("main a[href]").count(),
    horizontalOverflow: await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  };
  await page.screenshot({
    path: resolve(outputDir, "safety-ai-390x844-js-disabled.png"),
    fullPage: false,
  });
  await context.close();
}

writeFileSync(
  resolve(outputDir, "audit.json"),
  `${JSON.stringify(results, null, 2)}\n`,
  "utf8",
);
await browser.close();
console.log(JSON.stringify(results, null, 2));
