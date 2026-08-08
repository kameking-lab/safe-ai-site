import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((value) => value.startsWith("--") && value.includes("="))
    .map((value) => {
      const [key, ...rest] = value.slice(2).split("=");
      return [key, rest.join("=")];
    }),
);

const baseUrl = (args.base || "https://www.anzen-ai-portal.jp").replace(/\/$/, "");
const route = args.route || "/ky/paper";
const label = args.label || "before-production";
const outputDir = resolve(
  args.output ||
    "../docs/audits/evidence/ky-zero-friction-redesign-2026-08-01",
  label,
);
mkdirSync(outputDir, { recursive: true });

const viewports = [
  { width: 320, height: 844 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];

const textBytes = (value) => new TextEncoder().encode(value).byteLength;
const result = {
  baseUrl,
  route,
  label,
  capturedAt: new Date().toISOString(),
  definitions: {
    inputStartTop: "document topからmain内の最初の入力欄までのCSS px",
    workInputTop: "document topから作業内容入力欄までのCSS px",
    inlineRscBytes: "初期HTML内self.__next_f.push scriptのUTF-8 bytes",
    clientJsBytes: "初期script resourceのdecoded/transfer bytes合計（重複URL除外）",
  },
  viewports: [],
};

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const response = await page.goto(`${baseUrl}${route}`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(750);
    const htmlBody = response
      ? await response.body().catch(() => Buffer.from(""))
      : Buffer.from("");

    const metrics = await page.evaluate(() => {
      const normalize = (value) => value.replace(/\s+/g, " ").trim();
      const top = (element) =>
        element
          ? Math.round(element.getBoundingClientRect().top + window.scrollY)
          : null;
      const main = document.querySelector("main");
      const controls = [
        ...(main?.querySelectorAll(
          'input:not([type="hidden"]), textarea, select, [contenteditable="true"]',
        ) || []),
      ];
      const workControl =
        controls.find((control) => {
          const id = control.getAttribute("id");
          const label = id
            ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent || ""
            : "";
          return /作業内容|本日の作業|作業を入力/.test(
            `${label} ${control.getAttribute("aria-label") || ""} ${control.getAttribute("placeholder") || ""}`,
          );
        }) || main?.querySelector("textarea");
      const fixedElements = [...document.querySelectorAll("body *")].filter(
        (element) => getComputedStyle(element).position === "fixed",
      );
      const workRect = workControl?.getBoundingClientRect() || null;
      const fixedOverlapsWork = fixedElements.filter((element) => {
        if (!workRect) return false;
        const rect = element.getBoundingClientRect();
        return !(
          rect.right <= workRect.left ||
          rect.left >= workRect.right ||
          rect.bottom <= workRect.top ||
          rect.top >= workRect.bottom
        );
      }).length;
      const resources = performance.getEntriesByType("resource");
      const scripts = resources.filter(
        (entry) =>
          entry.initiatorType === "script" || /\.(?:m?js)(?:\?|$)/.test(entry.name),
      );
      const uniqueScripts = [
        ...new Map(scripts.map((entry) => [entry.name, entry])).values(),
      ];
      const inlineRscText = [...document.scripts]
        .map((script) => script.textContent || "")
        .filter((text) => text.includes("self.__next_f.push"))
        .join("");
      const mainText = normalize(main?.innerText || "");
      const h1 = normalize(document.querySelector("h1")?.textContent || "");
      return {
        h1,
        domElements: document.querySelectorAll("*").length,
        mainDomElements: main?.querySelectorAll("*").length || 0,
        htmlCharacters: document.documentElement.outerHTML.length,
        mainCharacters: [...mainText].length,
        pageScrollHeight: document.documentElement.scrollHeight,
        screenLengths: Number(
          (document.documentElement.scrollHeight / innerHeight).toFixed(2),
        ),
        horizontalOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        inputStartTop: top(controls[0] || null),
        inputStartScreens:
          top(controls[0] || null) === null
            ? null
            : Number((top(controls[0]) / innerHeight).toFixed(2)),
        workInputTop: top(workControl || null),
        workInputScreens:
          top(workControl || null) === null
            ? null
            : Number((top(workControl) / innerHeight).toFixed(2)),
        workInputInInitialViewport:
          workRect !== null && workRect.top >= 0 && workRect.bottom <= innerHeight,
        fixedElements: fixedElements.length,
        fixedOverlapsWork,
        candidateTriggerButtons: [...document.querySelectorAll("button")]
          .map((button) => normalize(button.textContent || ""))
          .filter((text) => /候補|提案|生成|解析/.test(text)),
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
        inlineRscText,
      };
    });
    const inlineRscBytes = textBytes(metrics.inlineRscText);
    delete metrics.inlineRscText;

    const suffix = `${viewport.width}x${viewport.height}`;
    await page.screenshot({
      path: resolve(outputDir, `ky-${suffix}-first-view.png`),
      fullPage: false,
    });
    result.viewports.push({
      ...viewport,
      ...metrics,
      payload: {
        htmlBytes: htmlBody.byteLength,
        inlineRscBytes,
      },
      consoleErrors,
      pageErrors,
    });
    await context.close();
  }
} finally {
  await browser.close();
}

writeFileSync(
  resolve(outputDir, "browser-metrics.json"),
  `${JSON.stringify(result, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify(result, null, 2));
