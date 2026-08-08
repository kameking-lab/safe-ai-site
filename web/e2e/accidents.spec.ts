import { test, expect } from "@playwright/test";

test.describe("事故データベースの公開隔離", () => {
  test("サイト内事故検索は検索語とページを保持し、暗黙転送しない @smoke", async ({
    request,
  }) => {
    const response = await request.get(
      `/accidents?acc_kw=${encodeURIComponent("墜落")}&acc_page=2`,
      { maxRedirects: 0 },
    );
    expect(response.status()).toBe(200);
    expect(response.url()).toContain("acc_kw=%E5%A2%9C%E8%90%BD");
    expect(response.url()).toContain("acc_page=2");
    expect(response.headers().location).toBeUndefined();
  });

  test("事故詳細サブパスは未検証レコードを表示せず404で隔離する", async ({
    request,
  }) => {
    const response = await request.get("/accidents/synthetic-audit-case", {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(404);
    expect(response.headers().location).toBeUndefined();
  });

  test("業種別事故レポートは隔離された事故DBへ集約する", async ({ request }) => {
    const response = await request.get("/accidents-reports", {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(308);
    expect(response.headers().location).toBe("/accidents");
  });

  test("事故分析ダッシュボードも隔離された事故DBへ集約する", async ({
    request,
  }) => {
    const response = await request.get("/accidents-analytics", {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(308);
    expect(response.headers().location).toBe("/accidents");
  });
});

test.describe("重大災害事例の疎結果・最終ページ", () => {
  const results = "[data-accident-news-results]";

  test("通常・1件・0件・最終ページで件数とページングが安定する", async ({
    page,
  }) => {
    await page.goto("/accident-news");
    await expect(page.locator(results)).toHaveAttribute("data-result-count", "30");

    const paginationText = await page
      .getByRole("navigation", { name: "重大災害事例の検索結果ページ" })
      .textContent();
    const pageCount = Number(paginationText?.match(/1\s*\/\s*(\d+)/)?.[1]);
    expect(pageCount).toBeGreaterThan(1);

    await page.goto(
      `/accident-news?page=${pageCount}`,
    );
    const finalCount = Number(
      await page.locator(results).getAttribute("data-result-count"),
    );
    expect(finalCount).toBeGreaterThan(0);
    expect(finalCount).toBeLessThanOrEqual(30);
    await expect(
      page.getByRole("link", { name: /次の30件/ }),
    ).toHaveCount(0);

    await page.goto(
      `/accident-news?q=${encodeURIComponent("タクシー待機所")}`,
    );
    await expect(page.locator(results)).toHaveAttribute("data-result-count", "1");
    await expect(page.locator(results)).toHaveAttribute("data-result-total", "1");

    await page.goto(
      `/accident-news?q=${encodeURIComponent("存在しない事故検索語ZXQY9876")}`,
    );
    await expect(page.locator(results)).toHaveAttribute("data-result-count", "0");
    await expect(page.locator("[data-accident-news-empty]")).toBeVisible();
  });

  test("フィルタ変更中は前回結果を保持し、任意キーワードをURLへ出さない", async ({
    page,
  }) => {
    await page.goto("/accident-news");
    await expect(page.locator(results)).toHaveAttribute("data-result-count", "30");
    await page.waitForLoadState("networkidle");
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const target = window as Window & {
        __accidentLayoutShift?: number;
        __accidentLayoutSources?: Array<{
          value: number;
          tag: string;
          id: string;
          marker: string;
          text: string;
          previous: string;
          current: string;
        }>;
      };
      target.__accidentLayoutShift = 0;
      target.__accidentLayoutSources = [];
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
            sources?: Array<{
              node?: Node | null;
              previousRect?: DOMRectReadOnly;
              currentRect?: DOMRectReadOnly;
            }>;
          };
          if (!shift.hadRecentInput) {
            target.__accidentLayoutShift =
              (target.__accidentLayoutShift ?? 0) + shift.value;
            for (const source of shift.sources ?? []) {
              const element =
                source.node instanceof Element ? source.node : null;
              target.__accidentLayoutSources?.push({
                value: shift.value,
                tag: element?.tagName ?? "",
                id: element?.id ?? "",
                marker:
                  element?.getAttribute("data-home-section") ??
                  element?.getAttribute("data-accident-news-results") ??
                  element?.getAttribute("aria-label") ??
                  "",
                text: (element?.textContent ?? "").trim().slice(0, 80),
                previous: source.previousRect
                  ? `${source.previousRect.x},${source.previousRect.y},${source.previousRect.width},${source.previousRect.height}`
                  : "",
                current: source.currentRect
                  ? `${source.currentRect.x},${source.currentRect.y},${source.currentRect.width},${source.currentRect.height}`
                  : "",
              });
            }
          }
        }
      }).observe({ type: "layout-shift" });
    });
    const initialUrl = page.url();
    await page.route("**/*", async (route) => {
      const request = route.request();
      if (
        request.url().includes("/accident-news") &&
        request.resourceType() === "fetch"
      ) {
        await new Promise((resolve) => setTimeout(resolve, 1_200));
      }
      await route.continue();
    });

    await page.getByRole("textbox", { name: "キーワード" }).fill("タクシー待機所");
    const beforeHeight = (await page.locator(results).boundingBox())?.height ?? 0;
    const searchResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/accident-news/search" &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "検索", exact: true }).click();
    await expect(
      page.locator("[data-accident-news-filter-pending]"),
    ).toContainText("前回の結果");
    await expect(page.locator(results)).toHaveAttribute("data-result-count", "30");
    const pendingHeight = (await page.locator(results).boundingBox())?.height ?? 0;
    expect(Math.abs(pendingHeight - beforeHeight)).toBeLessThanOrEqual(2);

    const completedSearch = await searchResponse;
    expect(completedSearch.status()).toBe(200);
    expect(new URL(completedSearch.url()).search).toBe("");
    expect(completedSearch.request().postDataJSON()).toMatchObject({
      q: "タクシー待機所",
    });
    await expect(page.locator(results)).toHaveAttribute("data-result-count", "1");
    expect(page.url()).toBe(initialUrl);
    expect(page.url()).not.toContain(encodeURIComponent("タクシー待機所"));
    await page.waitForTimeout(650);
    const layoutShift = await page.evaluate(() => {
      const target = window as Window & {
        __accidentLayoutShift?: number;
        __accidentLayoutSources?: unknown[];
      };
      return {
        value: target.__accidentLayoutShift ?? 0,
        sources: target.__accidentLayoutSources ?? [],
      };
    });
    expect(
      layoutShift.value,
      JSON.stringify(layoutShift.sources),
    ).toBeLessThanOrEqual(0.1);
    await page.getByRole("button", { name: "条件クリア" }).click();
    await expect(page.locator(results)).toHaveAttribute("data-result-count", "30");
  });

  test("loading fallbackは3件分に限定し、reduced motionとlayout安定性を実測する", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => {
      (
        window as Window & {
          __accidentLoadingLayoutShift?: number;
        }
      ).__accidentLoadingLayoutShift = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          };
          if (!shift.hadRecentInput) {
            (
              window as Window & {
                __accidentLoadingLayoutShift?: number;
              }
            ).__accidentLoadingLayoutShift =
              ((window as Window & {
                __accidentLoadingLayoutShift?: number;
              }).__accidentLoadingLayoutShift ?? 0) + shift.value;
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto("/accident-news?playwright_stream_probe=1", {
      waitUntil: "commit",
    });

    const shell = page.locator("[data-accident-news-loading-shell]");
    await expect(shell).toBeVisible();
    await expect(
      page.locator("[data-accident-news-loading-grid] > li"),
    ).toHaveCount(3);
    const shellHeight = (await shell.boundingBox())?.height ?? 0;
    expect(shellHeight).toBeGreaterThan(300);
    expect(shellHeight).toBeLessThan(1_200);
    const animationNames = await shell.locator(".animate-pulse").evaluateAll(
      (nodes) => nodes.map((node) => getComputedStyle(node).animationName),
    );
    expect(animationNames.every((name) => name === "none")).toBe(true);

    await page.waitForLoadState("load");
    await expect(page).toHaveURL(/\/accident-news\?playwright_stream_probe=1$/);
    await expect(page.locator(results)).toHaveAttribute("data-result-count", "30");
    await page.waitForTimeout(650);
    const layoutShift = await page.evaluate(
      () =>
        (window as Window & { __accidentLoadingLayoutShift?: number })
          .__accidentLoadingLayoutShift ?? 0,
    );
    expect(layoutShift).toBeLessThanOrEqual(0.1);
  });

  test("320〜1440pxで横方向へ破綻しない", async ({
    page,
  }) => {
    await page.goto(
      `/accident-news?industry=${encodeURIComponent("官公署")}`,
    );
    await expect(page.locator(results)).toHaveAttribute("data-result-count", "3");

    for (const width of [320, 360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `${width}px の横overflow`).toBeLessThanOrEqual(1);
    }
  });
});
