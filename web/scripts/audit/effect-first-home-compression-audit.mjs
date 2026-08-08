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
    "../docs/audits/evidence/effect-first-home-compression-2026-07-31",
  label,
);
mkdirSync(outputDir, { recursive: true });

const viewports = [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];
const extraHTTPHeaders =
  args.coarse === "false"
    ? {}
    : {
        "x-vercel-ip-country": "JP",
        "x-vercel-ip-country-region": "13",
      };

const browser = await chromium.launch({ headless: true });
const result = {
  baseUrl,
  label,
  capturedAt: new Date().toISOString(),
  measurement: {
    html: "UTF-8 byte length of the initial decoded document response body",
    rsc: "UTF-8 byte length of inline self.__next_f.push scripts in the initial HTML",
    clientJs:
      "sum of decodedBodySize/transferSize for unique initial script resources after network idle",
    duplicateLinks:
      "extra occurrences of the same resolved href within main; global navigation is excluded",
    dom: "rendered element count after the initial 750ms settling window",
  },
  viewports: [],
};

const textBytes = (value) => new TextEncoder().encode(value).byteLength;

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport, extraHTTPHeaders });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.name));

  const response = await page.goto(`${baseUrl}/`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await page.locator('[data-home-section="heat"]').waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(750);

  const htmlBody = response ? await response.body().catch(() => Buffer.from("")) : Buffer.from("");
  const metrics = await page.evaluate(() => {
    const normalizeText = (value) => value.replace(/\s+/g, " ").trim();
    const absoluteTop = (element) =>
      element ? Math.round(element.getBoundingClientRect().top + scrollY) : null;
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
    const main = document.querySelector("main");
    const sections = [...document.querySelectorAll("[data-home-section]")].map(
      (section) => {
        const rect = section.getBoundingClientRect();
        return {
          id: section.getAttribute("data-home-section"),
          top: Math.round(rect.top + scrollY),
          startScreen: Number(((rect.top + scrollY) / innerHeight).toFixed(2)),
          height: Math.round(rect.height),
          characters: [...normalizeText(section.textContent || "")].length,
          domElements: section.querySelectorAll("*").length,
          links: section.querySelectorAll("a[href]").length,
          images: section.querySelectorAll("img, picture").length,
          inputs: section.querySelectorAll("input, textarea, select").length,
          items: section.querySelectorAll("article, li").length,
        };
      },
    );
    const linkCounts = new Map();
    for (const link of main?.querySelectorAll("a[href]") || []) {
      const href = link.href;
      linkCounts.set(href, (linkCounts.get(href) || 0) + 1);
    }
    const duplicateLinks = [...linkCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([href, count]) => ({ href, count, duplicates: count - 1 }));
    const textCounts = new Map();
    for (const element of main?.querySelectorAll("h1,h2,h3,h4,p,dt,dd") || []) {
      const value = normalizeText(element.textContent || "");
      if (value.length < 8) continue;
      textCounts.set(value, (textCounts.get(value) || 0) + 1);
    }
    const duplicateText = [...textCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([text, count]) => ({ text: text.slice(0, 160), count }));
    const resources = performance.getEntriesByType("resource");
    const scripts = resources.filter(
      (entry) => entry.initiatorType === "script" || /\.(?:m?js)(?:\?|$)/.test(entry.name),
    );
    const uniqueScripts = [...new Map(scripts.map((entry) => [entry.name, entry])).values()];
    const firstViewText = [
      ...new Set(
        [...(main?.querySelectorAll("*") || [])]
          .filter(
            (element) =>
              visible(element) &&
              element.children.length === 0 &&
              normalizeText(element.textContent || ""),
          )
          .map((element) => normalizeText(element.textContent || "")),
      ),
    ].join(" ");
    const ttfvSelectors = {
      wbgt: "[data-wbgt-kind]",
      chat: '[data-home-section="chat"] textarea',
      accident:
        '[data-home-update="accidents"], [data-home-section="accidents"]',
      lawReform:
        '[data-home-update="law-reform"], [data-home-section="law-reform"]',
      chemical: '[data-home-section="chemical"] input',
      learning: '[data-home-section="learning"]',
      automationConsult: '[data-home-section="automation-consult"]',
    };
    const timeToFirstValue = Object.fromEntries(
      Object.entries(ttfvSelectors).map(([key, selector]) => {
        const top = absoluteTop(document.querySelector(selector));
        return [
          key,
          {
            top,
            screens: top === null ? null : Number((top / innerHeight).toFixed(2)),
          },
        ];
      }),
    );
    const inlineRscText = [...document.scripts]
      .map((script) => script.textContent || "")
      .filter((text) => text.includes("self.__next_f.push"))
      .join("");
    return {
      h1: normalizeText(document.querySelector("h1")?.textContent || ""),
      pageScrollHeight: document.documentElement.scrollHeight,
      viewportHeight: innerHeight,
      screenLengths: Number(
        (document.documentElement.scrollHeight / innerHeight).toFixed(2),
      ),
      horizontalOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      firstViewCharacters: [...firstViewText].length,
      fullMainCharacters: [...(main?.innerText || "")].length,
      domElements: document.querySelectorAll("*").length,
      mainDomElements: main?.querySelectorAll("*").length || 0,
      images: main?.querySelectorAll("img, picture").length || 0,
      links: main?.querySelectorAll("a[href]").length || 0,
      uniqueLinks: linkCounts.size,
      duplicateLinkCount: duplicateLinks.reduce(
        (sum, item) => sum + item.duplicates,
        0,
      ),
      duplicateLinks,
      duplicateText,
      primaryActionCount: main?.querySelectorAll("[data-primary-action]").length || 0,
      emptyEntranceCount: sections.filter((section) => {
        const node = document.querySelector(`[data-home-section="${section.id}"]`);
        return !node?.querySelector(
          "input, textarea, time, img, article, li, dl > div, [data-wbgt-kind], [data-heat-status]",
        );
      }).length,
      sections,
      timeToFirstValue,
      inlineRscText,
      clientJs: {
        resources: uniqueScripts.length,
        decodedBytes: uniqueScripts.reduce(
          (sum, entry) => sum + entry.decodedBodySize,
          0,
        ),
        transferBytes: uniqueScripts.reduce(
          (sum, entry) => sum + entry.transferSize,
          0,
        ),
      },
      actualData: {
        accidentRecords: document.querySelectorAll("[data-accident-origin]").length,
        lawReforms: document.querySelectorAll("[data-law-source-state]").length,
        learningItems:
          document.querySelector('[data-home-section="learning"]')?.querySelectorAll("article")
            .length || 0,
      },
    };
  });

  const inlineRscPayloadBytes = textBytes(metrics.inlineRscText);
  delete metrics.inlineRscText;
  const suffix = `${viewport.width}x${viewport.height}`;
  await page.screenshot({
    path: resolve(outputDir, `home-${suffix}.png`),
    fullPage: false,
  });
  await page.screenshot({
    path: resolve(outputDir, `home-${suffix}-full.png`),
    fullPage: true,
  });
  result.viewports.push({
    ...viewport,
    ...metrics,
    payload: {
      htmlBytes: htmlBody.byteLength,
      inlineRscPayloadBytes,
    },
    consoleErrors,
    pageErrors,
  });
  await context.close();
}

writeFileSync(
  resolve(outputDir, "compression-audit.json"),
  `${JSON.stringify(result, null, 2)}\n`,
  "utf8",
);
await browser.close();
console.log(JSON.stringify(result, null, 2));
