import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const hubPath = "/materials/safety-images";
const detailPath = `${hubPath}/helmet-required`;

test.describe("market-grounded safety sign library", () => {
  test("lists 100 signs, filters progressively, and exposes six compact entry points", async ({ page }) => {
    const response = await page.goto(hubPath);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "現場安全看板ライブラリ" })).toBeVisible();
    await expect(page.getByText("100点", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "次の20点を表示" })).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(20);
    for (const label of ["よく使う看板", "保護具", "立入・禁止", "重機・吊り荷", "多言語", "荷重・数値編集"]) {
      await expect(page.getByRole("button", { name: label })).toBeVisible();
    }
    await page.getByRole("searchbox").fill("保護帽");
    await expect(page.getByRole("heading", { level: 3, name: "保護帽着用" })).toBeVisible();
    await expect(page.getByText(/検索結果 1点/u)).toBeVisible();
  });

  test("edits a five-language sign without placing custom text in the URL", async ({ page }) => {
    await page.goto(detailPath);
    await expect(page.getByRole("heading", { level: 1, name: "保護帽着用" })).toBeVisible();
    await expect(page.getByRole("link", { name: "そのままダウンロード" })).toHaveAttribute("href", /mode=default/u);
    await expect(page.getByLabel("言語プリセット").locator("option")).toHaveCount(5);
    await expect(page.getByLabel("印刷・看板サイズ").locator("option")).toHaveCount(13);
    await page.getByLabel("言語プリセット").selectOption("vi");
    await expect(page.getByLabel("表示する文字")).toHaveValue("Đội mũ bảo hộ");
    await expect(page.getByLabel("表示する文字")).toHaveAttribute("lang", "vi");
    await expect(page.getByRole("img", { name: /^文字編集プレビュー:/u })).toHaveAttribute("lang", "vi");
    await page.getByLabel("表示する文字").fill("THÔNG ĐIỆP THỬ NGHIỆM");
    await expect(page.getByText("THÔNG ĐIỆP THỬ NGHIỆM")).toBeVisible();
    await page.getByLabel("チワワ・©").uncheck();
    await expect(page.getByAltText("安全AIポータルのチワワ")).toHaveCount(0);
    expect(page.url()).not.toContain("THÔNG");
    await page.getByRole("button", { name: "元に戻す" }).click();
    await expect(page.getByLabel("表示する文字")).toHaveValue("保護帽を着用");
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
    await page.getByLabel("表示する文字").fill("W".repeat(180));
    await page.getByRole("radio", { name: "大", exact: true }).first().check({ force: true });
    await page.getByText("詳細設定", { exact: true }).click();
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
