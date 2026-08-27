import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const HUB = "/training/safety-seminars";
const DETAIL = `${HUB}/fall-prevention`;

test.describe("安全研修ライブラリ", () => {
  test("一覧は28テーマ、公開1件、Coming Soon 27件で空の個別CTAがない", async ({ page }) => {
    const response = await page.goto(HUB);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "安全研修ライブラリ" })).toBeVisible();
    await expect(page.locator('[data-seminar-status="published"]')).toHaveCount(1);
    await expect(page.locator('[data-seminar-status="coming-soon"]')).toHaveCount(27);
    for (const card of await page.locator('[data-seminar-status="coming-soon"]').all()) {
      await expect(card.locator("a, button")).toHaveCount(0);
      await expect(card.getByText("Coming Soon", { exact: true })).toBeVisible();
    }
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://www.anzen-ai-portal.jp${HUB}`);
  });

  test("音声の再生・一時停止・停止、スライド移動、字幕、原稿、速度、keyboardを操作できる", async ({ page }) => {
    await page.goto(DETAIL);
    const audio = page.locator("audio");
    await expect(audio).toHaveCount(1);
    expect(await audio.evaluate((element) => (element as HTMLAudioElement).paused)).toBe(true);

    await page.getByRole("button", { name: "再生" }).click();
    await expect.poll(() => audio.evaluate((element) => (element as HTMLAudioElement).currentTime)).toBeGreaterThan(0);
    await page.getByRole("button", { name: "一時停止" }).click();
    expect(await audio.evaluate((element) => (element as HTMLAudioElement).paused)).toBe(true);
    await page.getByRole("button", { name: "停止" }).click();
    await expect.poll(() => audio.evaluate((element) => (element as HTMLAudioElement).currentTime)).toBeLessThan(0.1);

    await page.getByRole("button", { name: "次のスライド" }).click();
    await expect(page.getByText("02 / 20")).toBeVisible();
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText("03 / 20")).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText("02 / 20")).toBeVisible();

    await page.getByRole("button", { name: "字幕" }).click();
    await expect(page.locator('[role="status"]')).toHaveCount(0);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("c");
    await expect(page.locator('[role="status"]')).toBeVisible();
    await page.getByRole("button", { name: "音声原稿を読む" }).click();
    await expect(page.getByRole("heading", { name: "講師向け補足" })).toBeVisible();
    await page.getByRole("combobox", { name: "再生速度" }).selectOption("1.5");
    expect(await audio.evaluate((element) => (element as HTMLAudioElement).playbackRate)).toBe(1.5);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("m");
    expect(await audio.evaluate((element) => (element as HTMLAudioElement).muted)).toBe(true);
  });

  test("320/390/768/1440pxと400%相当で横溢れしない", async ({ page }) => {
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
      await page.goto(DETAIL);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${width}px`).toBeLessThanOrEqual(1);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
    await page.setViewportSize({ width: 320, height: 256 });
    await page.goto(DETAIL);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
    await expect(page.getByRole("button", { name: "再生" })).toBeVisible();
  });

  test("light/darkの全viewportと原稿open状態にserious/criticalのAxe違反がない", async ({ page }) => {
    test.setTimeout(120_000);
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme });
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
        await page.goto(DETAIL);
        if (width === 320) {
          await page.getByRole("button", { name: "音声原稿を読む" }).click();
        }
        const results = await new AxeBuilder({ page }).analyze();
        const highImpact = results.violations.filter(
          (violation) => violation.impact === "serious" || violation.impact === "critical",
        );
        expect(
          highImpact,
          `${colorScheme}/${width}px: ${JSON.stringify(highImpact)}`,
        ).toEqual([]);
      }

      await page.setViewportSize({ width: 320, height: 844 });
      await page.goto(HUB);
      const hubResults = await new AxeBuilder({ page }).analyze();
      const hubHighImpact = hubResults.violations.filter(
        (violation) => violation.impact === "serious" || violation.impact === "critical",
      );
      expect(hubHighImpact, `${colorScheme}/hub: ${JSON.stringify(hubHighImpact)}`).toEqual([]);

      await page.goto(`${HUB}/terms`);
      const termsResults = await new AxeBuilder({ page }).analyze();
      const termsHighImpact = termsResults.violations.filter(
        (violation) => violation.impact === "serious" || violation.impact === "critical",
      );
      expect(
        termsHighImpact,
        `${colorScheme}/terms: ${JSON.stringify(termsHighImpact)}`,
      ).toEqual([]);
    }
  });

  test("reduced motion、canonical、query noindex、downloadを満たす", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(DETAIL);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://www.anzen-ai-portal.jp${DETAIL}`);
    const progress = page.locator('[role="progressbar"] > div');
    await expect(progress).toHaveCSS("transition-property", "none");

    await page.goto(`${DETAIL}?slide=4&captions=1`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/u);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://www.anzen-ai-portal.jp${DETAIL}`);

    for (const name of ["編集可能PowerPoint", "投影・印刷用PDF", "講師用台本", "参加者配布用1枚資料", "現場確認チェックリスト", "5問クイズ・解答解説", "出典一覧"]) {
      const href = await page.getByRole("link", { name }).getAttribute("href");
      expect(href).toBeTruthy();
      const response = await page.request.get(href!);
      expect(response.status(), name).toBe(200);
      expect(Number(response.headers()["content-length"] ?? 1), name).toBeGreaterThan(0);
    }
  });

  test("JavaScript無効でもH1・全20枚・注意・downloadを読める", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const page = await context.newPage();
    const response = await page.goto(DETAIL);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "JavaScriptを使わずに読む" })).toBeVisible();
    await expect(page.locator("noscript ol > li")).toHaveCount(20);
    await expect(page.getByText(/法定の特別教育等を代替/u).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "編集可能PowerPoint" })).toBeVisible();
    await context.close();
  });

  test("相談CTAは既存フォームへ固定queryだけを渡す", async ({ page }) => {
    await page.goto(DETAIL);
    const links = page.locator("#customize-title ~ p + div a");
    await expect(links).toHaveCount(3);
    const hrefs = await links.evaluateAll((anchors) =>
      anchors.map((anchor) => anchor.getAttribute("href") ?? ""),
    );
    for (const rawHref of hrefs) {
      const href = new URL(rawHref, "https://www.anzen-ai-portal.jp");
      expect(href.pathname).toBe("/services/automation");
      expect([...href.searchParams.keys()]).toEqual(["consultationType"]);
      expect(href.hash).toBe("#consult-form");
      await page.goto(rawHref);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/u);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        "https://www.anzen-ai-portal.jp/services/automation",
      );
    }
  });
});
