import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const AI_HUB = "/training/ai-seminars";
const AI_DETAIL = `${AI_HUB}/ai-chat-work`;
const CALCULATOR_HUB = "/tools/construction-calculators";
const CALCULATOR_SLUGS = [
  "concrete-quantity",
  "excavation-backfill",
  "average-end-area",
  "earthwork-conversion-dump-trucks",
  "aggregate-base-quantity",
  "asphalt-mixture-quantity",
  "rebar-weight",
  "rebar-spacing",
  "formwork-area",
  "slope-angle-length",
  "drainage-slope",
  "scale-coordinate",
] as const;

test.describe("AI実務研修と建設計算ツール", () => {
  test("AI一覧は公開1件、Coming Soon 24件で空詳細リンクを作らない", async ({ page }) => {
    const response = await page.goto(AI_HUB);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "AI実務研修" })).toBeVisible();
    await expect(page.locator('[data-ai-seminar-status="published"]')).toHaveCount(1);
    await expect(page.locator('[data-ai-seminar-status="coming-soon"]')).toHaveCount(24);
    await expect(page.locator('[data-ai-seminar-status="coming-soon"] a')).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://www.anzen-ai-portal.jp${AI_HUB}`,
    );
  });

  test("AI教材は20枚、手動音声、字幕、原稿、演習、7成果物を提供する", async ({ page }) => {
    await page.goto(AI_DETAIL);
    await expect(page.getByRole("heading", { level: 1, name: "AIチャット仕事術" })).toBeVisible();
    await expect(page.getByText("01 / 20")).toBeVisible();
    const audio = page.locator("audio");
    await expect(audio).toHaveCount(1);
    expect(await audio.evaluate((element) => (element as HTMLAudioElement).paused)).toBe(true);
    await expect(audio).toHaveAttribute("src", /\/audio\/slide-01\.mp3$/u);
    for (let slideNumber = 1; slideNumber <= 20; slideNumber += 1) {
      const asset = await page.request.get(
        `${AI_DETAIL}/audio/slide-${String(slideNumber).padStart(2, "0")}.mp3`,
      );
      expect(asset.status(), `audio ${slideNumber}`).toBe(200);
      expect(asset.headers()["content-type"], `audio ${slideNumber}`).toContain("audio/mpeg");
      expect((await asset.body()).byteLength, `audio ${slideNumber}`).toBeGreaterThan(1_000);
    }

    await page.getByRole("button", { name: "再生", exact: true }).click();
    await expect.poll(() => audio.evaluate((element) => (element as HTMLAudioElement).paused)).toBe(false);
    await page.getByRole("button", { name: "一時停止", exact: true }).click();
    await expect.poll(() => audio.evaluate((element) => (element as HTMLAudioElement).paused)).toBe(true);
    await page.getByRole("button", { name: "停止", exact: true }).click();
    await expect.poll(() => audio.evaluate((element) => (element as HTMLAudioElement).currentTime)).toBeLessThan(0.1);

    await page.getByRole("button", { name: "次のスライド" }).click();
    await expect(page.getByText("02 / 20")).toBeVisible();
    await page.getByLabel("再生速度").selectOption("1.25");
    await expect.poll(() => audio.evaluate((element) => (element as HTMLAudioElement).playbackRate)).toBe(1.25);
    await page.getByRole("button", { name: "ミュート", exact: true }).click();
    await expect.poll(() => audio.evaluate((element) => (element as HTMLAudioElement).muted)).toBe(true);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText("03 / 20")).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText("02 / 20")).toBeVisible();
    await expect(page.locator('[role="status"]')).toBeVisible();
    await page.getByRole("button", { name: "字幕" }).click();
    await expect(page.locator('[role="status"]')).toHaveCount(0);
    await page.getByRole("button", { name: "字幕" }).click();
    await expect(page.locator('[role="status"]')).toBeVisible();
    await page.getByRole("button", { name: "音声原稿を読む" }).click();
    await expect(page.getByRole("heading", { name: "講師向け補足" })).toBeVisible();

    const exercise = page.locator("#exercise-title").locator("xpath=following::article[1]");
    await expect(exercise.getByRole("button")).toBeDisabled();
    await exercise.getByLabel("あなたの回答").fill("架空例で目的・背景・条件・形式を明確にする");
    await exercise.getByRole("button").click();
    await expect(exercise.getByText("解説例")).toBeVisible();

    for (const name of [
      "編集可能PowerPoint",
      "投影・印刷用PDF",
      "講師用台本",
      "参加者配布用1枚資料",
      "AI依頼テンプレート",
      "5問クイズ・解答解説",
      "出典一覧",
    ]) {
      const href = await page.getByRole("link", { name }).getAttribute("href");
      expect(href, name).toBeTruthy();
      const asset = await page.request.get(href!);
      expect(asset.status(), name).toBe(200);
      expect((await asset.body()).byteLength, name).toBeGreaterThan(100);
    }
  });

  test("建設計算一覧は公開12件、Coming Soon 23件で個別URLは公開分だけ", async ({ page }) => {
    const response = await page.goto(CALCULATOR_HUB);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "建設計算ツール" })).toBeVisible();
    await expect(page.locator('[data-calculator-status="published"]')).toHaveCount(12);
    await expect(page.locator('[data-calculator-status="coming-soon"]')).toHaveCount(23);
    await expect(page.locator('[data-calculator-status="coming-soon"] a')).toHaveCount(0);
    const publishedHrefs = await page
      .locator('[data-calculator-status="published"] a')
      .evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href")));
    expect(publishedHrefs.sort()).toEqual(
      CALCULATOR_SLUGS.map((slug) => `${CALCULATOR_HUB}/${slug}`).sort(),
    );
  });

  test("12計算は入力途中に結果を出さず、明示ボタン後だけ概算結果を出す", async ({ page }) => {
    test.setTimeout(120_000);
    for (const slug of CALCULATOR_SLUGS) {
      const response = await page.goto(`${CALCULATOR_HUB}/${slug}`);
      expect(response?.status(), slug).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("heading", { name: "結果", exact: true })).toHaveCount(0);
      await page.getByRole("button", { name: "計算する" }).click();
      await expect(page.getByRole("heading", { name: "結果", exact: true })).toBeVisible();
      await expect(
        page
          .getByRole("region", { name: "結果" })
          .getByText("概算結果です。設計図書、仕様書、実測値を確認してください。", { exact: true }),
      ).toBeVisible();
      expect(new URL(page.url()).search).toBe("");
    }
  });

  test("代表計算のcopy・PDF・CSV・31日端末履歴・削除が同じ結果を使う", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.addInitScript(() => {
      Object.defineProperty(window, "print", {
        configurable: true,
        value: () => document.body.setAttribute("data-print-called", "true"),
      });
    });
    await page.goto(`${CALCULATOR_HUB}/concrete-quantity`);
    await page.getByRole("button", { name: "計算する" }).click();
    const primaryResult = await page.locator("#calculation-result-title + dl dd").first().innerText();

    await page.getByRole("button", { name: "結果をコピー" }).click();
    await expect(page.getByRole("button", { name: "コピーしました" })).toBeVisible();
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText.replace(/\s+/gu, "")).toContain(primaryResult.replace(/\s+/gu, ""));

    await page.getByRole("button", { name: "PDF保存（印刷画面）" }).click();
    await expect.poll(() => page.locator("body").getAttribute("data-print-called")).toBe("true");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "CSV" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^concrete-quantity-\d{4}-\d{2}-\d{2}\.csv$/u);

    await expect(page.getByRole("heading", { name: "最近の計算" })).toBeVisible();
    await expect(page.getByRole("button", { name: "入力を復元" })).toHaveCount(1);
    const stored = await page.evaluate(() => localStorage.getItem("anzen-ai:construction-calculators:history:v1"));
    expect(stored).toContain("concrete-quantity");
    await page.getByRole("button", { name: "この履歴を削除" }).click();
    await expect(page.getByRole("button", { name: "入力を復元" })).toHaveCount(0);
  });

  test("表示済みの計算ページは通信断後も明示ボタンで計算できる", async ({ page, context }) => {
    await page.goto(`${CALCULATOR_HUB}/concrete-quantity`);
    await expect(page.getByRole("button", { name: "計算する" })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await context.setOffline(true);
    try {
      await page.getByRole("button", { name: "計算する" }).click();
      await expect(page.getByRole("heading", { name: "結果", exact: true })).toBeVisible();
    } finally {
      await context.setOffline(false);
    }
  });

  test("query noindex、reduced motion、forced colors、主要viewport、Axeを満たす", async ({ page }) => {
    await page.goto(`${AI_DETAIL}?captions=1`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/u);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://www.anzen-ai-portal.jp${AI_DETAIL}`,
    );
    await page.goto(`${CALCULATOR_HUB}/concrete-quantity?unit=mm`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/u);

    await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
      await page.goto(width === 320 ? AI_DETAIL : `${CALCULATOR_HUB}/rebar-spacing`);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
        `${width}px`,
      ).toBeLessThanOrEqual(1);
    }
    await page.setViewportSize({ width: 320, height: 256 });
    await page.goto(`${CALCULATOR_HUB}/rebar-spacing`);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
      "400%相当",
    ).toBeLessThanOrEqual(1);
    await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "none" });
    const axe = await new AxeBuilder({ page }).analyze();
    expect(
      axe.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? "")),
    ).toEqual([]);
  });

  test("JavaScript無効でも教材全文と計算式を読め、動かないフォームを出さない", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const page = await context.newPage();
    await page.goto(AI_DETAIL);
    await expect(page.locator("noscript ol > li")).toHaveCount(20);
    await expect(page.getByRole("link", { name: "研修PDFを開く" })).toBeVisible();
    await page.goto(`${CALCULATOR_HUB}/concrete-quantity`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "計算式" })).toBeVisible();
    await expect(page.locator("form")).toHaveCount(0);
    await context.close();
  });
});
