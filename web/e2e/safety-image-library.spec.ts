import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const hubPath = "/materials/safety-images";
const detailPath = `${hubPath}/helmet-required`;

test.describe("market-grounded safety sign library", () => {
  test("lists 100 signs, filters progressively, and keeps extra filters in details", async ({ page }) => {
    const response = await page.goto(hubPath);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "現場安全看板ライブラリ" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "現場でよく使う10枚" })).toHaveCount(0);
    await expect(page.getByText("検索結果 100点")).toBeVisible();
    await expect(page.getByRole("button", { name: "次の20点を表示" })).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(20);
    await page.locator("summary").filter({ hasText: "詳細条件" }).click();
    for (const label of ["よく使う看板", "保護具", "立入・禁止", "重機・吊り荷", "多言語優先", "数値編集"]) {
      await expect(page.getByRole("button", { name: label })).toBeVisible();
    }
    await expect(page.getByRole("link", { name: /保護帽着用.*看板を開く/u })).toHaveCount(1);
    await page.getByRole("searchbox").fill("保護帽");
    await expect(page.getByRole("heading", { level: 3, name: "保護帽着用" })).toBeVisible();
    await expect(page.getByText(/検索結果 1点/u)).toBeVisible();
  });

  test("puts search and category in the first viewport without horizontal overflow", async ({ page }) => {
    for (const { width, height } of [{ width: 1280, height: 900 }, { width: 320, height: 900 }, { width: 320, height: 640 }]) {
      await page.setViewportSize({ width, height });
      await page.goto(hubPath);
      const search = await page.getByRole("searchbox").boundingBox();
      const category = await page.getByLabel("カテゴリ").boundingBox();
      expect(search, `${width}px search`).not.toBeNull();
      expect(category, `${width}px category`).not.toBeNull();
      expect(search!.y + search!.height, `${width}×${height}px search bottom`).toBeLessThan(height);
      expect(category!.y + category!.height, `${width}×${height}px category bottom`).toBeLessThan(height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${width}px overflow`).toBeLessThanOrEqual(1);
    }
  });

  test("restores filters, result count and scroll after browser Back and explicit return", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(hubPath);
    await page.getByRole("button", { name: "次の20点を表示" }).click();
    await expect(page.getByRole("article")).toHaveCount(40);
    const card = page.getByRole("article").nth(30).getByRole("link");
    await card.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => window.scrollY);
    await card.click();
    await expect(page).toHaveURL(/\/materials\/safety-images\/[^/]+\?fromLibrary=1$/u, { timeout: 30000 });
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${hubPath}$`, "u"));
    await expect(page.getByRole("article")).toHaveCount(40);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before - 50);
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - before)).toBeLessThanOrEqual(50);

    await page.getByRole("searchbox").fill("保護帽");
    await page.locator("summary").filter({ hasText: "詳細条件" }).click();
    await page.getByRole("button", { name: "保護具", exact: true }).click();
    await page.getByLabel("並び順").selectOption("new");
    await expect(page.getByRole("heading", { level: 3, name: "保護帽着用" })).toBeVisible();
    await page.getByRole("link", { name: /保護帽着用.*看板を開く/u }).click();
    await page.getByRole("link", { name: "現場安全看板ライブラリへ" }).click();
    await expect(page.getByRole("searchbox")).toHaveValue("保護帽");
    await expect(page.getByText("条件あり", { exact: true })).toBeVisible();
    await page.locator("summary").filter({ hasText: "詳細条件" }).click();
    await expect(page.getByRole("button", { name: "保護具", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByLabel("並び順")).toHaveValue("new");
  });

  test("restores a deep mobile list and its scroll position after Back", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(hubPath);
    await page.getByRole("button", { name: "次の20点を表示" }).click();
    await page.getByRole("button", { name: "次の20点を表示" }).click();
    await expect(page.getByRole("article")).toHaveCount(60);
    const card = page.getByRole("article").nth(50).getByRole("link");
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await expect(page).toHaveURL(/fromLibrary=1$/u, { timeout: 30000 });
    const saved = await page.evaluate(() => JSON.parse(window.sessionStorage.getItem("anzen-ai:safety-sign-list:v1:/materials/safety-images") ?? "{}") as {scrollY?: number});
    expect(saved.scrollY).toBeGreaterThan(0);
    await page.goBack();
    await expect(page.getByRole("article")).toHaveCount(60);
    await expect.poll(() => page.evaluate((target) => Math.abs(window.scrollY - target), saved.scrollY!), { timeout: 10000 }).toBeLessThanOrEqual(50);
    const after = await page.evaluate(() => window.scrollY);
    expect(Math.abs(after - saved.scrollY!)).toBeLessThanOrEqual(50);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  });

  test("a direct detail visit returns to the unfiltered library", async ({ page }) => {
    await page.goto(hubPath);
    await page.getByRole("searchbox").fill("保護帽");
    await page.goto(detailPath);
    await page.getByRole("link", { name: "現場安全看板ライブラリへ" }).click();
    await expect(page).toHaveURL(new RegExp(`${hubPath}$`, "u"));
    await expect(page.getByRole("searchbox")).toHaveValue("");
    await expect(page.getByText("検索結果 100点")).toBeVisible();
  });

  test("edits a five-language sign without placing custom text in the URL", async ({ page }) => {
    await page.goto(detailPath);
    await expect(page.getByRole("heading", { level: 1, name: "保護帽着用" })).toBeVisible();
    await expect(page.getByRole("button", { name: "この看板をダウンロード" })).toBeVisible();
    for (const language of ["日本語", "英語", "ベトナム語", "中国語（簡体）", "インドネシア語"]) {
      await expect(page.getByLabel(language, { exact: true })).toBeVisible();
    }
    await page.getByText("詳細設定（文字・サイズ・形式）", { exact: true }).click();
    await expect(page.getByLabel("印刷・看板サイズ").locator("option")).toHaveCount(13);
    await page.getByLabel("ベトナム語", { exact: true }).check();
    await expect(page.getByLabel("表示する文字（ベトナム語）")).toHaveValue("Đội mũ bảo hộ");
    await expect(page.getByLabel("表示する文字（ベトナム語）")).toHaveAttribute("lang", "vi");
    await expect(page.getByRole("img", { name: /^文字編集プレビュー:/u })).toHaveAttribute("lang", "ja");
    await page.getByLabel("表示する文字（ベトナム語）").fill("THÔNG ĐIỆP THỬ NGHIỆM");
    await expect(page.getByText("THÔNG ĐIỆP THỬ NGHIỆM").first()).toBeVisible();
    await page.getByText("文字の装飾", { exact: true }).click();
    await page.getByLabel("チワワ・©").uncheck();
    await expect(page.getByAltText("安全AIポータルのチワワ")).toHaveCount(0);
    expect(page.url()).not.toContain("THÔNG");
    await page.getByRole("button", { name: "元に戻す" }).click();
    await expect(page.getByLabel("表示する文字（日本語）")).toHaveValue("保護帽を着用");
    await expect(page.getByLabel("ベトナム語", { exact: true })).not.toBeChecked();
  });

  test("loads related sign pictures when the user scrolls to them", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(detailPath);
    const related = page.locator('section[aria-labelledby="related-heading"]');
    await related.scrollIntoViewIfNeeded();
    for (const name of ["耳栓着用の安全看板イラスト", "防じんマスク着用の安全看板イラスト"]) {
      const picture = related.getByRole("img", { name });
      await picture.scrollIntoViewIfNeeded();
      await expect.poll(() => picture.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    }
  });

  test("downloads the size, format and languages shown beside the preview", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(detailPath);
    await page.getByRole("button", { name: "A4横", exact: true }).click();
    await page.getByLabel("ベトナム語", { exact: true }).check();
    await page.getByLabel("英語", { exact: true }).check();
    await page.getByText("詳細設定（文字・サイズ・形式）", { exact: true }).click();
    await page.getByRole("combobox", { name: "形式" }).selectOption("png");
    await expect(page.getByText("A4横・PNG・日本語／ベトナム語／英語")).toBeVisible();
    await expect(page.locator('[data-preview-fit="pass"]')).toBeVisible();
    const [response, download] = await Promise.all([
      page.waitForResponse((item) => item.url().endsWith("/api/safety-images/helmet-required/download") && item.request().method() === "POST"),
      page.waitForEvent("download"),
      page.getByRole("button", { name: "この看板をダウンロード" }).click(),
    ]);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
    expect(response.request().postDataJSON()).toMatchObject({
      size: "a4-landscape",
      format: "png",
      settings: { languages: ["ja", "vi", "en"] },
    });
    expect(download.suggestedFilename()).toBe("helmet-required-ja-vi-en-a4-landscape.png");
  });

  test("keeps the numeric value visible on numeric sign templates", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(`${hubPath}/site-speed-limit`);
    const numeric = page.getByLabel("数値・連絡先");
    await expect(numeric).toBeVisible();
    await numeric.fill("8");
    await expect(page.getByText(/8 km\/h/u).first()).toBeVisible();
  });

  test("keeps five-language text clear of the illustration in both orientations", async ({ page }) => {
    test.setTimeout(120_000);
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(detailPath, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => {
        const button = [...document.querySelectorAll("button")].find((item) => item.textContent === "A4横");
        return button && Object.keys(button).some((key) => key.startsWith("__reactFiber$"));
      });
      await page.getByRole("button", { name: "A4横", exact: true }).click();
      await expect(page.getByRole("button", { name: "A4横", exact: true })).toHaveAttribute("aria-pressed", "true");
      for (const language of ["インドネシア語", "英語", "中国語（簡体）", "ベトナム語"]) {
        const checkbox = page.getByLabel(language, { exact: true });
        await checkbox.focus();
        await page.keyboard.press("Space");
        await expect(checkbox).toBeChecked();
      }
      expect(await page.locator("#edit-controls textarea").evaluateAll((fields) => fields.map((field) => field.getAttribute("lang")))).toEqual(["ja", "vi", "zh-CN", "en", "id"]);
      for (const orientation of ["A4縦", "A4横"]) {
        await page.getByRole("button", { name: orientation, exact: true }).click();
        await expect(page.locator('[data-preview-fit="pass"]')).toBeVisible();
        const artwork = await page.locator("[data-safety-sign-artwork]").boundingBox();
        const text = await page.locator("[data-safety-sign-text]").boundingBox();
        expect(artwork).not.toBeNull();
        expect(text).not.toBeNull();
        const overlapWidth = Math.max(0, Math.min(artwork!.x + artwork!.width, text!.x + text!.width) - Math.max(artwork!.x, text!.x));
        const overlapHeight = Math.max(0, Math.min(artwork!.y + artwork!.height, text!.y + text!.height) - Math.max(artwork!.y, text!.y));
        expect(overlapWidth * overlapHeight).toBeLessThanOrEqual(1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      }
    }
  });

  test("downloads valid JPEG, PNG and PDF with private edited output", async ({ request }) => {
    test.setTimeout(300_000);
    for (const format of ["jpeg", "png", "pdf"] as const) {
      const response = await request.get(
        `/api/safety-images/helmet-required/download?mode=default&lang=ja&brand=branded&size=a4-portrait&format=${format}`,
      );
      expect(response.status(), format).toBe(200);
      expect(response.headers()["content-disposition"], format).toContain("attachment");
      expect((await response.body()).byteLength, format).toBeGreaterThan(1_000);
    }
    const edited = await request.post("/api/safety-images/site-speed-limit/download", {
      data: {
        size: "flat-600x450",
        format: "png",
        settings: {
          mode: "edited",
          language: "id",
          text: "Batas kecepatan di lokasi",
          fontSize: "standard",
          position: "bottom",
          textColor: "#082f49",
          band: true,
          bandColor: "#ffffff",
          brand: false,
          lineHeight: 1.18,
          align: "center",
          border: true,
          padding: "standard",
          writingMode: "horizontal",
          subMessage: "",
          numericValue: "8",
          numericUnit: "km/jam",
        },
      },
    });
    expect(edited.status()).toBe(200);
    expect(edited.headers()["cache-control"]).toContain("private");
    expect(edited.headers()["content-disposition"]).not.toContain("8");
  });

  test("indexes only the hub, seven categories and 100 public details", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    const signLocations = [...sitemap.matchAll(/<loc>[^<]*\/materials\/safety-images(?:\/[^<]*)?<\/loc>/gu)].map((match) => match[0]);
    expect(signLocations).toHaveLength(108);
    expect(sitemap).toContain(`${detailPath}</loc>`);
    expect(sitemap).not.toContain("/materials/safety-images/terms</loc>");
    expect(sitemap).not.toContain("/materials/safety-images/pilot/");
    expect(sitemap).not.toContain("/print</loc>");
  });

  test("redirects equivalent old URLs and retires unsuitable old assets", async ({ request }) => {
    const redirect = await request.get(`${hubPath}/full-harness-required`, { maxRedirects: 0 });
    expect(redirect.status()).toBe(301);
    expect(redirect.headers().location).toContain(`${hubPath}/full-body-harness-required`);
    expect((await request.get(`${hubPath}/photo-record`)).status()).toBe(410);
    expect((await request.get(`${hubPath}/pilot/helmet-required`)).status()).toBe(404);
    expect((await request.get("/safety-images/pilot/helmet-required-a-all-branded.webp")).status()).toBe(404);
  });

  test("remains usable from 320px through 1440px, including 400% equivalent", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(width === 320 ? detailPath : hubPath);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${width}px`).toBeLessThanOrEqual(1);
    }
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus-visible")).toHaveCount(1);
  });

  test("fits maximum custom text in the shared preview model at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(detailPath);
    await page.getByText("詳細設定（文字・サイズ・形式）", { exact: true }).click();
    await page.getByLabel("表示する文字").fill("W".repeat(180));
    await page.getByText("文字の装飾", { exact: true }).click();
    await page.getByRole("radio", { name: "大", exact: true }).first().check({ force: true });
    await page.getByLabel(/行間/u).fill("1.8");
    await expect(page.locator('[data-preview-fit="pass"]')).toBeVisible();
    await expect(page.getByText("文字が収まりません。文字量・サイズ・行間を調整してください。", { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  });

  test("has no serious or critical axe violations across public sign routes", async ({ page }) => {
    test.setTimeout(120_000);
    const routes = [
      hubPath,
      `${hubPath}/category/protective-equipment`,
      detailPath,
      `${hubPath}/terms`,
    ];
    const mediaModes = [
      { label: "light", colorScheme: "light" as const, forcedColors: "none" as const },
      { label: "dark", colorScheme: "dark" as const, forcedColors: "none" as const },
      { label: "forced", colorScheme: "light" as const, forcedColors: "active" as const },
    ];
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const media of mediaModes) {
        await page.emulateMedia({
          colorScheme: media.colorScheme,
          forcedColors: media.forcedColors,
          reducedMotion: "reduce",
        });
        for (const route of routes) {
          await page.goto(route, { waitUntil: "domcontentloaded" });
          await expect(page.locator("h1").first()).toBeVisible();
          const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
          const blocking = results.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
          expect(blocking, `${route} at ${width}px/${media.label}`).toEqual([]);
        }
      }
    }
  });

  test("shows links and instructions instead of a dead editor without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(detailPath);
    await expect(page.getByRole("heading", { name: "JavaScriptを有効にすると文字を編集できます" })).toBeVisible();
    await expect(page.getByLabel("表示する文字")).toBeHidden();
    await expect(page.getByRole("link", { name: "文字なしPNGをダウンロード" })).toBeVisible();
    await context.close();
  });
});
