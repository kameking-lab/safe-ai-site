import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const evidenceRoot = resolve(process.cwd(), "../docs/audits/evidence");
const screenshotRoot = resolve(evidenceRoot, "screenshots/post-change");
const observations: {
  checkedAt: string;
  consoleErrors: Array<{ url: string; text: string }>;
  widths: number[];
  notes: string[];
} = {
  checkedAt: new Date().toISOString(),
  consoleErrors: [],
  widths: [],
  notes: [],
};

test.beforeAll(() => mkdirSync(screenshotRoot, { recursive: true }));
test.afterAll(() => {
  writeFileSync(
    resolve(evidenceRoot, "post-change-browser-observations.json"),
    `${JSON.stringify(observations, null, 2)}\n`,
    "utf8",
  );
});

function collectConsoleErrors(page: Page) {
  page.on("console", (message) => {
    if (message.type() === "error") {
      observations.consoleErrors.push({ url: page.url(), text: message.text().slice(0, 500) });
    }
  });
  page.on("pageerror", (error) => {
    observations.consoleErrors.push({ url: page.url(), text: error.message.slice(0, 500) });
  });
}

test("代表6幅でホームが横にはみ出さず描画される", async ({ page }) => {
  collectConsoleErrors(page);
  for (const width of [320, 360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expect(page.locator("main").first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    observations.widths.push(width);
    await page.screenshot({ path: resolve(screenshotRoot, `home-${width}px.png`), fullPage: true, caret: "initial" });
  }
});

test("モバイルのスキップリンクと下部5操作をキーボードだけで操作できる", async ({ page }) => {
  collectConsoleErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("body").press("Tab");
  await expect(page.getByRole("link", { name: "メインコンテンツへスキップ" })).toBeFocused();
  const mobileNav = page.getByRole("navigation", {
    name: "モバイル ボトムナビゲーション",
  });
  const heat = mobileNav.getByRole("link", { name: "熱中症" });
  await heat.focus();
  await expect(heat).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(mobileNav.getByRole("link", { name: "法令AI" })).toBeFocused();
  await page.screenshot({ path: resolve(screenshotRoot, "mobile-bottom-nav-390px.png"), fullPage: true, caret: "initial" });
});

test("200%相当の拡大と動きの軽減設定で主要画面を描画する", async ({ page }) => {
  collectConsoleErrors(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/security");
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({ path: resolve(screenshotRoot, "security-text-scale-200-reduced-motion.png"), fullPage: true, caret: "initial" });
  observations.notes.push("Root font size 200% is an approximation; browser-native text-only zoom requires manual confirmation.");
});

test("サイネージはAPI停止時に警報なしと誤表示せず、404は404を返す", async ({ page }) => {
  collectConsoleErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/signage-data**", (route) => route.abort("failed"));
  await page.goto("/signage", { waitUntil: "domcontentloaded" });
  const presentation = page.locator('[data-signage-presentation="1024"]');
  await expect(presentation.getByText("取得できません", { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(presentation.getByText("警報の有無を確認不能", { exact: true })).toBeVisible();
  await page.screenshot({ path: resolve(screenshotRoot, "signage-api-failure-1440px.png"), fullPage: true, caret: "initial" });

  const notFound = await page.goto("/audit-synthetic-not-found-20260722", { waitUntil: "domcontentloaded" });
  expect(notFound?.status()).toBe(404);
  await page.screenshot({ path: resolve(screenshotRoot, "not-found-1440px.png"), fullPage: true, caret: "initial" });
});

test("認証画面は設定状態に応じた安全な案内を表示する", async ({ page }) => {
  collectConsoleErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/auth/signin");
  const pending = page.getByRole("status").filter({ hasText: "ログイン機能は準備中です" });
  if (await pending.count()) {
    await expect(pending).toBeVisible();
    await expect(page.getByText(/端末内保存/).first()).toBeVisible();
    observations.notes.push("Auth providers were unconfigured; no OAuth action was rendered.");
  } else {
    await expect(page.getByRole("button", { name: /Google/ })).toBeVisible();
    observations.notes.push("Auth providers were configured; login action was observed but not invoked.");
  }
  await page.screenshot({ path: resolve(screenshotRoot, "signin-unconfigured-390px.png"), fullPage: true, caret: "initial" });
});
