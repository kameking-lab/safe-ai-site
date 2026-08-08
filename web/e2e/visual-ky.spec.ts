import { expect, test, type Page } from "@playwright/test";

const HUB = "/training/visual-ky";
const SCENARIO = `${HUB}/scaffold-fall`;

async function waitForVisualKyPlayer(page: Page) {
  await expect(
    page.locator('[data-visual-ky-ready="true"]'),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "イラストから危険を探す" }),
  ).toBeEnabled();
}

test.describe("ビジュアルKYT", () => {
  test("ホームの優先順とhubのSSR一覧", async ({ page }) => {
    await page.goto("/");
    const heat = page.locator('[data-home-section="heat"]');
    const learning = page.locator('[data-home-section="learning"]');
    const tasks = page.locator('[aria-labelledby="home-core-features"]');
    const automation = page.locator('[aria-labelledby="home-automation-heading"]');
    await expect(heat).toBeVisible();
    await expect(learning).toBeVisible();
    await expect(tasks).toBeVisible();
    await expect(automation).toBeVisible();
    const positions = await Promise.all(
      [heat, learning, tasks, automation].map(async (locator) => {
        const box = await locator.boundingBox();
        return box?.y ?? Number.POSITIVE_INFINITY;
      }),
    );
    expect(positions[0]).toBeLessThan(positions[1]);
    expect(positions[1]).toBeLessThan(positions[2]);
    expect(positions[2]).toBeLessThan(positions[3]);
    await expect(
      learning.getByRole("link", { name: "問題に挑戦" }),
    ).toBeVisible();
    await expect(
      learning.getByRole("link", { name: "5分学習を始める" }),
    ).toBeVisible();

    await page.goto(HUB);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /画像で学ぶ\s*危険予知/,
      }),
    ).toBeVisible();
    await expect(page.getByText("公開中の15問")).toBeVisible();
    const scenarioList = page.locator(
      'section[aria-labelledby="all-problems-heading"]',
    );
    await expect(
      scenarioList.locator('article a[href^="/training/visual-ky/"]'),
    ).toHaveCount(15);
    await expect(
      page.locator('article[aria-labelledby="daily-visual-ky-title"] a[data-primary-action]'),
    ).toHaveCount(1);
    await expect(page.locator('main [role="alert"]')).toHaveCount(0);
  });

  test("hotspot、テキスト代替、回答、対策、ローカル進捗", async ({
    page,
  }) => {
    await page.goto(SCENARIO);
    await waitForVisualKyPlayer(page);
    await page
      .getByRole("button", { name: "イラストから危険を探す" })
      .focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name: "危険と思う候補を選ぶ" }),
    ).toBeVisible();
    const hotspot = page.getByRole("button", { name: /候補1:/ });
    await hotspot.focus();
    await expect(hotspot).toBeFocused();
    await page.keyboard.press("Space");
    await expect(hotspot).toHaveAttribute("aria-pressed", "true");
    await page
      .getByRole("button", { name: "予想を確定して解説を見る" })
      .click();
    await expect(
      page.getByRole("heading", { name: "危険と優先対策の解説" }),
    ).toBeVisible();
    await expect(page.getByText("作業中止・エスカレーション").first()).toBeVisible();
    await page.getByRole("button", { name: "対策を選ぶ" }).click();
    await page
      .getByRole("checkbox", {
        name: /作業を止め、手すりと床材を復旧してから再開する/,
      })
      .check();
    await page.getByRole("button", { name: "まとめへ進む" }).click();
    await expect(
      page.getByRole("heading", { name: "5分KYTを完了しました" }),
    ).toBeVisible();
    const saved = await page.evaluate(() =>
      localStorage.getItem("safe-ai:visual-ky-progress:v1"),
    );
    expect(saved).toContain("vkyt-001");
    expect(saved).not.toMatch(
      /name|email|company|answerText|health|siteName|location/i,
    );
    await expect(
      page.getByRole("heading", {
        name: "場面説明・危険・対策のテキスト版",
      }),
    ).toBeVisible();
  });

  test("320〜1440px、landscape、reduced motion、forced colors、200%・400%", async ({
    page,
  }) => {
    for (const viewport of [
      { width: 320, height: 780 },
      { width: 360, height: 800 },
      { width: 390, height: 844 },
      { width: 768, height: 900 },
      { width: 1024, height: 768 },
      { width: 1440, height: 900 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(SCENARIO);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await waitForVisualKyPlayer(page);
      await page
        .getByRole("button", { name: "イラストから危険を探す" })
        .click();
      await expect(
        page.getByRole("heading", { name: "危険と思う候補を選ぶ" }),
      ).toBeVisible();
      const hotspot = page.getByRole("button", { name: /候補1:/ });
      await expect(hotspot).toBeVisible();
      const hotspotBox = await hotspot.boundingBox();
      expect(hotspotBox?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(hotspotBox?.height ?? 0).toBeGreaterThanOrEqual(44);
      const imageBox = await hotspot.locator("xpath=..").boundingBox();
      expect((hotspotBox?.x ?? 0) + 0.5).toBeGreaterThanOrEqual(
        imageBox?.x ?? 0,
      );
      expect(
        (hotspotBox?.x ?? 0) + (hotspotBox?.width ?? 0) - 0.5,
      ).toBeLessThanOrEqual(
        (imageBox?.x ?? 0) + (imageBox?.width ?? 0),
      );
      expect((hotspotBox?.y ?? 0) + 0.5).toBeGreaterThanOrEqual(
        imageBox?.y ?? 0,
      );
      expect(
        (hotspotBox?.y ?? 0) + (hotspotBox?.height ?? 0) - 0.5,
      ).toBeLessThanOrEqual(
        (imageBox?.y ?? 0) + (imageBox?.height ?? 0),
      );
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(2);
    }

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(SCENARIO);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.emulateMedia({
      reducedMotion: "no-preference",
      forcedColors: "active",
    });
    await page.goto(SCENARIO);
    await waitForVisualKyPlayer(page);
    await page
      .getByRole("button", { name: "イラストから危険を探す" })
      .click();
    await expect(
      page.getByRole("heading", { name: "危険と思う候補を選ぶ" }),
    ).toBeVisible();
    const forcedHotspot = page.getByRole("button", { name: /候補1:/ });
    await forcedHotspot.focus();
    await expect(forcedHotspot).toBeFocused();

    await page.emulateMedia({ forcedColors: "none" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(SCENARIO);
    for (const zoom of [2, 4]) {
      await page.evaluate((value) => {
        document.documentElement.style.zoom = String(value);
      }, zoom);
      await expect(
        page.getByText("画像の詳しい説明：", { exact: false }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "ビジュアルKYT一覧" }),
      ).toBeVisible();
    }
  });

  test("画像失敗・offline・localStorage失敗でも学習可能", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.route("**/*", (route) => {
      if (route.request().url().includes("scaffold-fall.webp")) {
        return route.abort();
      }
      return route.continue();
    });
    await page.goto(SCENARIO);
    await expect(page.getByText("画像を読み込めませんでした")).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "場面説明・危険・対策のテキスト版",
      }),
    ).toBeVisible();
    await waitForVisualKyPlayer(page);
    await context.setOffline(true);
    await page
      .getByRole("button", { name: "イラストから危険を探す" })
      .click();
    await page
      .getByRole("checkbox", {
        name: /危険なしと判断して解説へ進む/,
      })
      .check();
    await page
      .getByRole("button", { name: "予想を確定して解説を見る" })
      .click();
    await expect(
      page.getByRole("heading", { name: "危険と優先対策の解説" }),
    ).toBeVisible();
    await context.close();

    const noStorageContext = await browser.newContext();
    await noStorageContext.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get() {
          throw new DOMException("blocked", "SecurityError");
        },
      });
    });
    const noStoragePage = await noStorageContext.newPage();
    await noStoragePage.goto(SCENARIO);
    await waitForVisualKyPlayer(noStoragePage);
    await noStoragePage
      .getByRole("button", { name: "イラストから危険を探す" })
      .click();
    await noStoragePage
      .getByRole("checkbox", {
        name: /危険なしと判断して解説へ進む/,
      })
      .check();
    await noStoragePage
      .getByRole("button", { name: "予想を確定して解説を見る" })
      .click();
    await noStoragePage.getByRole("button", { name: "対策を選ぶ" }).click();
    await noStoragePage
      .getByRole("checkbox", {
        name: /作業を止め、手すりと床材を復旧してから再開する/,
      })
      .check();
    await noStoragePage
      .getByRole("button", { name: "まとめへ進む" })
      .click();
    await expect(
      noStoragePage.getByText(/端末保存を利用できませんでした/),
    ).toBeVisible();
    await noStorageContext.close();
  });

  test("ファシリテーター、QR、印刷、KY連携", async ({ page }) => {
    await page.goto(`${SCENARIO}/facilitator`);
    await expect(page.getByRole("heading", { name: "学習目標" })).toBeVisible();
    await page.getByRole("button", { name: "10分" }).click();
    await page.getByRole("button", { name: "答えを表示" }).click();
    await expect(
      page.getByRole("heading", { name: "危険源と優先対策" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "関連法令" })).toBeVisible();
    await page.getByRole("button", { name: "参加者用QR" }).click();
    await expect(
      page.getByText(
        "https://www.anzen-ai-portal.jp/training/visual-ky/scaffold-fall",
      ),
    ).toBeVisible();
    expect(
      await page
        .locator("canvas[aria-label*='canonical URL']")
        .getAttribute("aria-label"),
    ).not.toContain("token");

    await page.goto(`${SCENARIO}/print?format=morning`);
    await expect(
      page.getByRole("heading", { name: /朝礼用1枚/ }),
    ).toBeVisible();
    await expect(page.getByText(/印刷用画面生成時点/)).toBeVisible();

    await page.goto(`${SCENARIO}/print?format=answer`);
    await expect(
      page.getByText("工学的対策：", { exact: false }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("管理的対策：", { exact: false }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("PPE：", { exact: false }).first(),
    ).toBeVisible();

    await page.goto("/ky/paper?import=visual-kyt&scenario=vkyt-001");
    await expect(page.locator("[data-ky-handoff-banner]")).toContainText(
      "候補を確認してください",
    );
    await expect(page.getByText("引継ぎ候補", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "危険候補「墜落・転落」を選択" }),
    ).not.toBeChecked();
    await expect(page.getByRole("button", { name: "内容を確認して確定" })).toBeDisabled();
  });

  test("query派生はnoindex、JS無効でも全教材が読める", async ({
    browser,
    request,
  }) => {
    const response = await request.get(`${SCENARIO}?result=complete`);
    const html = await response.text();
    expect(html).toMatch(
      /<meta[^>]+name="robots"[^>]+content="noindex, follow"|<meta[^>]+content="noindex, follow"[^>]+name="robots"/i,
    );
    expect(html).toContain(
      '<link rel="canonical" href="https://www.anzen-ai-portal.jp/training/visual-ky/scaffold-fall"',
    );

    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(SCENARIO);
    await expect(
      page.getByRole("heading", {
        name: "場面説明・危険・対策のテキスト版",
      }),
    ).toBeVisible();
    await expect(page.getByText("開いた作業床端部")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "一次資料・適用範囲・確認日" }),
    ).toBeVisible();
    await context.close();
  });
});
