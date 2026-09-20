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

  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
    const route = width === 320 || width === 768 ? hubPath : detailPath;
    const response = await page.goto(`${origin}${route}`, { waitUntil: "domcontentloaded" });
    if (response?.status() !== 200) throw new Error(`${width}px page status ${response?.status()}`);
    if (!(await page.locator("h1").first().isVisible())) throw new Error(`${width}px H1 missing`);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    if (overflow > 1) throw new Error(`${width}px horizontal overflow ${overflow}px`);
    await page.waitForFunction(() =>
      [...document.images].some((image) => image.complete && image.naturalWidth > 0),
    );
    const loadedImageCount = await page.locator("img").evaluateAll((images) =>
      images.filter((image) => image.complete && image.naturalWidth > 0).length,
    );
    if (loadedImageCount === 0) throw new Error(`${width}px safety image missing`);
    if (
      process.env.CAPTURE_SAFETY_SIGN_SCREENSHOTS === "1" &&
      (width === 390 || width === 1440)
    ) {
      await page.screenshot({
        path: path.join(artifactDirectory, `library-${width}.png`),
        fullPage: true,
      });
    }
    process.stdout.write(`PASS formal browser ${width}px no-overflow assets-visible\n`);
  }

  await page.goto(`${origin}${hubPath}`, { waitUntil: "domcontentloaded" });
  const search = page.getByPlaceholder("例：ヘルメット、足場、熱中症");
  await search.fill("熱中症");
  await page.getByText(/検索結果 \d+点/u).waitFor();
  const heatCount = Number((await page.getByText(/検索結果 \d+点/u).textContent())?.match(/\d+/u)?.[0]);
  if (!(heatCount > 0 && heatCount < 100)) throw new Error(`keyword filter invalid: ${heatCount}`);
  await search.fill("");
  await page.getByRole("button", { name: "荷重・数値編集" }).click();
  if (!(await page.getByText("検索結果 10点").isVisible())) {
    throw new Error("numeric quick filter must return 10 items");
  }
  process.stdout.write("PASS formal browser search/filter/numeric-count\n");

  await page.goto(`${origin}${detailPath}`, { waitUntil: "domcontentloaded" });
  const languageSelect = page.locator("#edit-controls select").first();
  const textInput = page.locator("#edit-controls textarea").first();
  await languageSelect.selectOption("en");
  await textInput.fill("CHECK HELMET BEFORE ENTRY");
  if ((await textInput.inputValue()) !== "CHECK HELMET BEFORE ENTRY") {
    throw new Error("custom text edit failed");
  }
  if ((await textInput.getAttribute("lang")) !== "en") {
    throw new Error("edited language is not exposed to assistive technology");
  }
  const previewLanguage = await page.getByRole("img", { name: /文字編集プレビュー/u }).last().getAttribute("lang");
  if (previewLanguage !== "en") throw new Error("preview language attribute did not follow the preset");
  if ((await page.locator('#download-heading').count()) !== 1) {
    throw new Error("download controls missing");
  }
  const downloadHref = await page
    .locator('a[href*="/api/safety-images/helmet-required/download"]')
    .first()
    .getAttribute("href");
  if (!downloadHref?.includes("format=")) throw new Error("normal download link missing");
  // 1440px at 400% browser zoom reflows to an effective 360 CSS-pixel viewport.
  // Exercising that viewport catches the reflow failures without relying on the
  // non-standard CSS `zoom` property, which does not update media queries.
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto(`${origin}${detailPath}`, { waitUntil: "domcontentloaded" });
  if (!(await page.locator("#download-heading").isVisible())) {
    throw new Error("400 percent zoom controls missing");
  }
  const zoomOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  if (zoomOverflow > 1) throw new Error(`400 percent zoom horizontal overflow ${zoomOverflow}px`);
  const downloadBox = await page.locator("#download-heading").boundingBox();
  if (!downloadBox || downloadBox.x < 0 || downloadBox.x + downloadBox.width > 362) {
    throw new Error("400 percent zoom download controls leave the effective viewport");
  }
  await page.keyboard.press("Tab");
  if ((await page.locator(":focus-visible").count()) !== 1) {
    throw new Error("400 percent zoom keyboard focus is not visible");
  }
  process.stdout.write("PASS formal browser language custom-text downloads 400%-equivalent reflow\n");

  await page.goto(`${origin}/materials/safety-images/maximum-load`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("数値・連絡先").fill("250");
  await page.getByLabel("単位").fill("kg");
  await page.getByLabel("チワワ・©").click();
  if ((await page.getByLabel("数値・連絡先").inputValue()) !== "250") {
    throw new Error("numeric edit failed");
  }
  process.stdout.write("PASS formal browser numeric-edit brand-toggle\n");

  const noJsContext = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: protectionBypass
      ? { "x-vercel-protection-bypass": protectionBypass }
      : {},
  });
  const noJsPage = await noJsContext.newPage();
  const noJsHubResponse = await noJsPage.goto(`${origin}${hubPath}`, {
    waitUntil: "domcontentloaded",
  });
  if (noJsHubResponse?.status() !== 200) throw new Error("no-JS hub unavailable");
  const noJsDetailHrefs = await noJsPage
    .locator('a[href^="/materials/safety-images/"]')
    .evaluateAll((links) => [...new Set(links.map((link) => link.getAttribute("href")).filter(Boolean))]);
  if (noJsDetailHrefs.length < 100) {
    throw new Error(`no-JS hub exposes only ${noJsDetailHrefs.length} unique detail links`);
  }
  const noJsResponse = await noJsPage.goto(`${origin}${detailPath}`, {
    waitUntil: "domcontentloaded",
  });
  if (noJsResponse?.status() !== 200) throw new Error("no-JS detail unavailable");
  if ((await noJsPage.locator('a[href*="mode=clean"][href*="format=png"]').count()) === 0) {
    throw new Error("no-JS clean-master link missing");
  }
  if ((await noJsPage.locator('a[href*="format=pdf"]').count()) === 0) {
    throw new Error("no-JS PDF link missing");
  }
  await noJsContext.close();
  process.stdout.write("PASS formal browser no-JS 100-detail fallback plus clean/PDF links\n");

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
