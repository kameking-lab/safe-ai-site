import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const origin = (process.argv[2] ?? "http://127.0.0.1:3312").replace(/\/$/u, "");
const outputDirectory =
  process.argv[3] ??
  path.join(process.env.LOCALAPPDATA ?? ".", "Temp", "safe-ai-ux-refresh-390");

const routes = [
  { path: "/", name: "home" },
  { path: "/goods", name: "goods" },
  { path: "/resources/netis-safety", name: "netis" },
  { path: "/materials/safety-images", name: "safety-images" },
  { path: "/accidents-analytics", name: "analytics" },
  {
    path: "/training/safety-seminars/fall-prevention",
    name: "fall-prevention",
  },
];

await fs.mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  for (const route of routes) {
    const response = await page.goto(`${origin}${route.path}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    if (response?.status() !== 200) {
      throw new Error(`${route.path}: HTTP ${response?.status()}`);
    }
    await page.locator("h1").first().waitFor({ state: "visible" });
    await page.waitForTimeout(250);
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    const overflow = dimensions.scrollWidth - dimensions.clientWidth;
    if (overflow > 1) {
      throw new Error(`${route.path}: horizontal overflow ${overflow}px`);
    }
    await page.screenshot({
      path: path.join(outputDirectory, `${route.name}.png`),
      fullPage: false,
    });
    process.stdout.write(`PASS ${route.path} 390px no-overflow\n`);
  }

  await page.goto(`${origin}/materials/safety-images`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("checkbox", { name: "英語" }).check();
  await page.getByRole("checkbox", { name: "ベトナム語" }).check();
  await page.getByRole("checkbox", { name: "中国語（簡体）" }).check();
  await page.getByRole("checkbox", { name: "インドネシア語" }).check();
  if (!(await page.getByRole("checkbox", { name: "日本語" }).isChecked())) {
    throw new Error("Japanese must remain selected by default");
  }
  if (!(await page.getByRole("checkbox", { name: "英語" }).isChecked())) {
    throw new Error("English multi-selection failed");
  }
  if (!(await page.getByRole("checkbox", { name: "ベトナム語" }).isChecked())) {
    throw new Error("Vietnamese multi-selection failed");
  }
  if (!(await page.getByRole("checkbox", { name: "中国語（簡体）" }).isChecked())) {
    throw new Error("Chinese multi-selection failed");
  }
  if (!(await page.getByRole("checkbox", { name: "インドネシア語" }).isChecked())) {
    throw new Error("Indonesian multi-selection failed");
  }
  await page.screenshot({
    path: path.join(outputDirectory, "safety-images-languages.png"),
    fullPage: false,
  });
  process.stdout.write("PASS safety signs five-language simultaneous selection\n");

  await page.goto(`${origin}/goods`, { waitUntil: "domcontentloaded" });
  const categoryImages = page.locator('[aria-label="安全用品カテゴリの画像一覧"] img');
  if ((await categoryImages.count()) !== 15) throw new Error("goods category image count mismatch");
  for (const image of await categoryImages.all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate((node) => node.decode());
    if ((await image.evaluate((node) => node.complete && node.naturalWidth > 0)) !== true) {
      throw new Error(`goods category image failed: ${await image.getAttribute("alt")}`);
    }
  }
  await page.getByText("特徴と候補を見る").first().click();
  const amazonHref = await page.getByRole("link", { name: /Amazon ★4/ }).first().getAttribute("href");
  if (!amazonHref || new URL(amazonHref).searchParams.get("rh") !== "p_72:2227292051") {
    throw new Error("Amazon four-stars-and-up filter missing");
  }
  process.stdout.write("PASS goods category images details and rating filter\n");

  await page.goto(`${origin}/accidents-analytics`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator('[role="meter"]').waitFor({ state: "visible", timeout: 30_000 });
  if ((await page.locator('[role="meter"]').count()) !== 1) {
    throw new Error("fatality rate meter missing");
  }
  if (!(await page.getByText("月別発生ヒートマップ").isVisible())) {
    throw new Error("monthly heatmap missing");
  }
  await page.getByText("グラフの数値を表で確認").click();
  if (!(await page.getByRole("region", { name: "視覚サマリーの代替データ表" }).isVisible())) {
    throw new Error("visual summary alternative table missing");
  }
  await page.screenshot({
    path: path.join(outputDirectory, "analytics-visual-summary.png"),
    fullPage: false,
  });
  process.stdout.write("PASS analytics meter heatmap alternative-table\n");

  if (pageErrors.length > 0) {
    throw new Error(`page errors (${pageErrors.length}):\n${pageErrors.join("\n")}`);
  }
} finally {
  await browser.close();
}
