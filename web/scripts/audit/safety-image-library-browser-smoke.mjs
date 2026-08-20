import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const origin = (process.argv[2] ?? "http://127.0.0.1:3311").replace(/\/$/u, "");
const artifactDirectory =
  process.argv[3] ??
  path.join(process.env.LOCALAPPDATA ?? ".", "Temp", "safe-ai-library-browser-smoke");
const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
const hubPath = "/materials/safety-images";
const detailPath = "/materials/safety-images/helmet-required";

await fs.mkdir(artifactDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const consoleErrors = [];
const pageErrors = [];
const assetFailures = [];

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    extraHTTPHeaders: {
      "x-vercel-skip-toolbar": "1",
      ...(protectionBypass
        ? { "x-vercel-protection-bypass": protectionBypass }
        : {}),
    },
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().includes("https://vercel.live/_next-live/feedback/feedback.js")
    ) {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (
      (response.url().includes("/safety-images/") ||
        response.url().includes("/api/safety-images/")) &&
      response.status() >= 400
    ) {
      assetFailures.push(`${response.status()} ${new URL(response.url()).pathname}`);
    }
  });

  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
    const route = width === 320 || width === 768 ? hubPath : detailPath;
    const response = await page.goto(`${origin}${route}`, { waitUntil: "networkidle" });
    if (response?.status() !== 200) throw new Error(`${width}px page status ${response?.status()}`);
    if (!(await page.locator("h1").first().isVisible())) throw new Error(`${width}px H1 missing`);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    if (overflow > 1) throw new Error(`${width}px horizontal overflow ${overflow}px`);
    const loadedImageCount = await page.locator("img").evaluateAll((images) =>
      images.filter((image) => image.complete && image.naturalWidth > 0).length,
    );
    if (loadedImageCount === 0) throw new Error(`${width}px safety image missing`);
    if (width === 390 || width === 1440) {
      await page.screenshot({
        path: path.join(artifactDirectory, `library-${width}.png`),
        fullPage: true,
      });
    }
    process.stdout.write(`PASS formal browser ${width}px no-overflow assets-visible\n`);
  }

  await page.goto(`${origin}${detailPath}`, { waitUntil: "networkidle" });
  const languageSelect = page.locator("#edit-controls select").first();
  const textInput = page.locator("#edit-controls textarea").first();
  await languageSelect.selectOption("en");
  await textInput.fill("CHECK HELMET BEFORE ENTRY");
  if ((await textInput.inputValue()) !== "CHECK HELMET BEFORE ENTRY") {
    throw new Error("custom text edit failed");
  }
  if ((await page.locator('#download-heading').count()) !== 1) {
    throw new Error("download controls missing");
  }
  const downloadHref = await page
    .locator('a[href*="/api/safety-images/helmet-required/download"]')
    .first()
    .getAttribute("href");
  if (!downloadHref?.includes("format=")) throw new Error("normal download link missing");
  await page.evaluate(() => {
    document.documentElement.style.zoom = "4";
  });
  if (!(await page.locator("#download-heading").isVisible())) {
    throw new Error("400 percent zoom controls missing");
  }
  process.stdout.write("PASS formal browser language custom-text downloads 400%-zoom\n");

  const noJsContext = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: protectionBypass
      ? { "x-vercel-protection-bypass": protectionBypass }
      : {},
  });
  const noJsPage = await noJsContext.newPage();
  const noJsResponse = await noJsPage.goto(`${origin}${detailPath}`, {
    waitUntil: "domcontentloaded",
  });
  if (noJsResponse?.status() !== 200) throw new Error("no-JS detail unavailable");
  if ((await noJsPage.locator('a[href$="helmet-required.png"]').count()) === 0) {
    throw new Error("no-JS clean-master link missing");
  }
  if ((await noJsPage.locator('a[href*="format=pdf"]').count()) === 0) {
    throw new Error("no-JS PDF link missing");
  }
  await noJsContext.close();
  process.stdout.write("PASS formal browser no-JS clean/PDF links\n");

  if (consoleErrors.length || pageErrors.length || assetFailures.length) {
    throw new Error(
      `runtime failures console=${consoleErrors.length} page=${pageErrors.length} assets=${assetFailures.length}\n${[
        ...consoleErrors,
        ...pageErrors,
        ...assetFailures,
      ].join("\n")}`,
    );
  }
  process.stdout.write("PASS formal browser console-errors=0 page-errors=0 asset-failures=0\n");
} finally {
  await browser.close();
}
