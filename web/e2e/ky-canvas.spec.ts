import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const WORK = "足場上で外壁パネルを取り付ける";

async function clearKyStorage(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("anzen-onboarding-v1-seen", "1");
    if (!sessionStorage.getItem("ky-e2e-context-ready")) {
      sessionStorage.clear();
      sessionStorage.setItem("ky-e2e-context-ready", "1");
    }
  });
}

async function trackKyHandoffSessionWrites(page: Page) {
  await page.addInitScript(() => {
    const probeWindow = window as Window & {
      __kyHandoffSessionWriteCount?: number;
    };
    probeWindow.__kyHandoffSessionWriteCount = 0;
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key, value) {
      if (this === window.sessionStorage && key === "safe-ai:ky-handoff:v1") {
        probeWindow.__kyHandoffSessionWriteCount =
          (probeWindow.__kyHandoffSessionWriteCount ?? 0) + 1;
      }
      return originalSetItem.call(this, key, value);
    };
  });
}

async function kyHandoffSessionWriteCount(page: Page) {
  return page.evaluate(
    () =>
      (window as Window & { __kyHandoffSessionWriteCount?: number })
        .__kyHandoffSessionWriteCount ?? 0,
  );
}

async function warmKyHandoffDestination(page: Page) {
  // A cold Next.js dev server can trigger a Fast Refresh full reload while the
  // destination chunk is first compiled, which deliberately clears the
  // memory-only handoff. Compile the destination before testing the real
  // source-to-destination transition; production builds do not have this HMR
  // boundary.
  await page.goto("/ky/paper", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { level: 1, name: "KYを作る" }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("#ky-work-description")).toBeEditable();
  await page.waitForLoadState("networkidle", { timeout: 30_000 });
}

async function mockWeather(page: Page) {
  await page.route("**/api/weather-risk?area=tokyo-shinjuku*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        provider: "open-meteo",
        fetchedAt: new Date().toISOString(),
        snapshot: {
          regionName: "東京都 新宿区",
          date: "2026-08-01",
          overview: "晴れ",
          temperatureCelsius: 34,
          windSpeedMs: 3,
          precipitationMm: 0,
          alerts: [],
        },
        current: {
          temperatureCelsius: 31.2,
          relativeHumidityPercent: 71,
          targetAt: new Date().toISOString(),
        },
        officialWarning: {
          status: "live",
          warnings: [],
          headline: null,
          fetchedAt: new Date().toISOString(),
          reportAt: new Date().toISOString(),
          sourceUrl: "https://www.jma.go.jp/bosai/warning/",
        },
      }),
    }),
  );
  await page.route("**/api/wbgt?area=tokyo-shinjuku*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        areaId: "tokyo-shinjuku",
        areaLabel: "東京都 新宿区",
        scopeLabel: "東京都内提供地点",
        provider: "環境省 熱中症予防情報サイト",
        retrievedAt: new Date().toISOString(),
        degraded: false,
        wbgt: {
          status: "estimated",
          valueCelsius: 29.1,
          label: "推定値",
          targetAt: new Date().toISOString(),
          stale: false,
          stationCount: 2,
          expectedStationCount: 2,
        },
        alerts: {
          heatAlert: "active",
          specialHeatAlert: "inactive",
          targetDate: "2026-08-01",
          reportAt: new Date().toISOString(),
        },
      }),
    }),
  );
}

async function selectFallAndMeasure(page: Page) {
  await page.locator("#ky-work-description").fill(WORK);
  await expect(
    page.getByRole("checkbox", { name: "危険候補「墜落・転落」を選択" }),
  ).toBeVisible({ timeout: 2_000 });
  await page
    .getByRole("checkbox", { name: "危険候補「墜落・転落」を選択" })
    .check();
  const measure = page.getByRole("checkbox", {
    name: /危険1の対策候補「作業床・上桟・中桟・幅木を含む手すり設備を設置する」を選択/,
  });
  await expect(measure).toBeVisible();
  await measure.check();
}

test.describe("KY zero-friction builder", () => {
  test.beforeEach(async ({ page }) => clearKyStorage(page));

  test("390px: starts in the first viewport with no fixed-nav overlap", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ky/paper");
    await expect(page.getByRole("heading", { level: 1, name: "KYを作る" })).toBeVisible();
    await expect(page.getByText("最近の下書きはありません")).toBeVisible();
    const work = page.locator("#ky-work-description");
    const box = await work.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeLessThan(844);
    expect(box!.y + box!.height).toBeLessThan(780);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
    const overlap = await work.evaluate((element) => {
      const workRect = element.getBoundingClientRect();
      return [...document.querySelectorAll("body *")].some((candidate) => {
        if (getComputedStyle(candidate).position !== "fixed") return false;
        const fixed = candidate.getBoundingClientRect();
        return !(
          fixed.right <= workRect.left ||
          fixed.left >= workRect.right ||
          fixed.bottom <= workRect.top ||
          fixed.top >= workRect.bottom
        );
      });
    });
    expect(overlap).toBe(false);
  });

  test("work input shows verified hazards without an analysis button", async ({ page }) => {
    await page.goto("/ky/paper");
    const started = Date.now();
    await page.locator("#ky-work-description").fill(WORK);
    await expect(
      page.getByRole("checkbox", { name: "危険候補「墜落・転落」を選択" }),
    ).toBeVisible({ timeout: 2_000 });
    expect(Date.now() - started).toBeLessThan(2_000);
    await expect(page.getByText(/足場・高所・開口部に関係する作業/)).toBeVisible();
    await expect(page.getByText(/reviewed Visual KYT/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /解析|生成|提案させる/ })).toHaveCount(0);
    await expect(
      page.getByRole("checkbox", { name: "危険候補「墜落・転落」を選択" }),
    ).not.toBeChecked();
  });

  test("hazard selection immediately shows concrete measures and deselection removes only selection", async ({ page }) => {
    await page.goto("/ky/paper");
    await page.locator("#ky-work-description").fill(WORK);
    const hazard = page.getByRole("checkbox", {
      name: "危険候補「墜落・転落」を選択",
    });
    await expect(hazard).toBeVisible({ timeout: 2_000 });
    await hazard.check();
    const hazardCard = page.locator('[data-hazard-candidate-id="fall-scaffold"]');
    const inlineMeasures = hazardCard.locator('[data-inline-measures-for="fall-scaffold"]');
    await expect(inlineMeasures.getByText("対策候補（複数選択）")).toBeVisible();
    await expect(inlineMeasures.getByText(/作業床・上桟・中桟・幅木/)).toBeVisible();
    expect(await inlineMeasures.boundingBox()).not.toBeNull();
    await expect(page.getByText(/なくす・変更/).first()).toBeVisible();
    await expect(page.getByText(/工学的対策/).first()).toBeVisible();
    await hazard.uncheck();
    await expect(page.getByText("対策候補（複数選択）")).toHaveCount(0);
    await expect(hazard).toBeVisible();
  });

  test("manual hazard and manual measure stay editable and uniquely labelled", async ({ page }) => {
    await page.goto("/ky/paper");
    await page.getByRole("textbox", { name: "手入力の危険", exact: true }).fill("仮置き材の転倒");
    await page.getByRole("button", { name: "危険を追加", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "危険1の内容", exact: true })).toHaveValue(
      "仮置き材の転倒",
    );
    await page
      .getByRole("textbox", { name: "危険1の手入力対策", exact: true })
      .fill("仮置き材を専用治具で固定する");
    await page.getByRole("button", { name: "対策を追加", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "危険1の対策1", exact: true })).toHaveValue(
      "仮置き材を専用治具で固定する",
    );
    await expect(page.getByText("手入力").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "危険1を音声入力" })).toBeVisible();
    await expect(page.getByRole("button", { name: "対策1-1を音声入力" })).toBeVisible();
  });

  test("verified measures matched to a manual hazard keep verified provenance", async ({ page }) => {
    await page.goto("/ky/paper");
    await page
      .getByRole("textbox", { name: "手入力の危険", exact: true })
      .fill("足場から墜落する危険");
    await page.getByRole("button", { name: "危険を追加", exact: true }).click();
    const measure = page.getByRole("checkbox", {
      name: /危険1の対策候補「作業床・上桟・中桟・幅木を含む手すり設備を設置する」を選択/,
    });
    await measure.check();
    const selectedMeasure = page.getByRole("textbox", {
      name: "危険1の対策1",
      exact: true,
    });
    await expect(selectedMeasure).toHaveValue(
      "作業床・上桟・中桟・幅木を含む手すり設備を設置する",
    );
    await expect(
      selectedMeasure.locator("xpath=ancestor::div[contains(@class, 'rounded-lg')][1]"),
    ).toContainText("確認済みVisual KYT");
    await expect(page.getByText("手入力", { exact: true })).toHaveCount(1);
  });

  test("canonical location autofills weather while ambiguous location requires selection", async ({ page }) => {
    const requested: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/weather-risk") || request.url().includes("/api/wbgt")) {
        requested.push(request.url());
      }
    });
    await mockWeather(page);
    await page.goto("/ky/paper");
    await page.locator("#ky-location").fill("中央区");
    await expect(page.getByText(/同名地域です/)).toBeVisible();
    await page.waitForTimeout(400);
    expect(requested).toEqual([]);
    await page.locator("#ky-location").fill("新宿区");
    await expect(page.getByText("WBGT 29.1℃・推定")).toBeVisible();
    await expect(page.getByText("気温 31.2℃")).toBeVisible();
    await expect(page.getByText("湿度 71%")).toBeVisible();
    expect(requested.length).toBe(2);
    expect(requested.every((url) => url.includes("area=tokyo-shinjuku"))).toBe(true);
    expect(requested.join(" ")).not.toContain(encodeURIComponent("新宿区"));
  });

  test("member registry, autosave and resume stay on-device", async ({ page }) => {
    const outgoing: Array<{ url: string; postData: string }> = [];
    page.on("request", (request) => {
      if (!["document", "script", "stylesheet", "image", "font"].includes(request.resourceType())) {
        outgoing.push({
          url: request.url(),
          postData: request.postData() ?? "",
        });
      }
    });
    await page.goto("/ky/paper");
    await page.getByText("メンバーを追加・管理").click();
    await page.getByRole("textbox", { name: "メンバー名", exact: true }).fill("山田");
    await page.getByRole("textbox", { name: "メンバーの役割", exact: true }).fill("職長");
    await page.getByRole("button", { name: /メンバーを登録して選ぶ/ }).click();
    await page.locator("#ky-work-description").fill(WORK);
    await page.getByRole("textbox", { name: "手入力の危険", exact: true }).fill(
      "追加前の仮入力",
    );
    await expect(page.getByText("保存済み", { exact: true })).toBeVisible({ timeout: 2_500 });
    const serializedRequests = JSON.stringify(outgoing);
    expect(serializedRequests).not.toContain("山田");
    expect(serializedRequests).not.toContain(WORK);
    expect(serializedRequests).not.toContain("追加前の仮入力");
    expect(
      outgoing.filter(({ url }) =>
        /(?:\/api\/stats|analytics|rum|collect|telemetry|member|draft|ky-save)/iu.test(
          url,
        ),
      ),
    ).toEqual([]);
    await page.reload();
    await expect(page.getByRole("button", { name: /山田／職長/ })).toBeVisible();
    await page.getByRole("button", { name: "前回の続き" }).click();
    await expect(page.locator("#ky-work-description")).toHaveValue(WORK);
    await expect(
      page.getByRole("textbox", { name: "手入力の危険", exact: true }),
    ).toHaveValue("追加前の仮入力");
  });

  test("legacy worker master imports locally and every member remains selectable", async ({ page }) => {
    await page.goto("/ky/paper");
    await page.evaluate(() => {
      localStorage.setItem(
        "safe-ai:ky-workers:v1",
        JSON.stringify(
          Array.from({ length: 11 }, (_, index) => ({
            id: `worker-${index + 1}`,
            name: `作業員${String(index + 1).padStart(2, "0")}`,
            affiliation: "self",
            company: "",
            qualNo: "",
            isRegular: true,
            hidden: false,
            createdAt: Date.now() + index,
          })),
        ),
      );
    });
    await page.reload();
    await page.getByRole("button", { name: /作業員マスターから取り込む（11名）/ }).click();
    await expect(page.getByText(/11名をこの端末の31日メンバーへ取り込みました/)).toBeVisible();
    await page.getByRole("button", { name: "他のメンバーを表示（1名）" }).click();
    const last = page.getByRole("button", { name: /作業員11／作業員/ });
    await expect(last).toBeVisible();
    await last.click();
    await expect(last).toHaveAttribute("aria-pressed", "true");
  });

  test("one PDF action downloads a safe draft PDF with a valid header", async ({ page }) => {
    await page.goto("/ky/paper");
    await selectFallAndMeasure(page);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "PDFで保存" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^KY_\d{8}_地域未確認\.pdf$/u);
    expect(download.suggestedFilename()).not.toContain("山田");
    const path = await download.path();
    expect(path).not.toBeNull();
    const bytes = await readFile(path!);
    expect(bytes.byteLength).toBeGreaterThan(1_000);
    expect(bytes.subarray(0, 8).toString("ascii")).toBe("%PDF-1.4");
    expect(bytes.subarray(-32).toString("ascii")).toContain("%%EOF");
    await expect(page.getByText(/\.pdf（\d+ページ）を保存しました/)).toBeVisible();
    await expect(page.getByText(/下書き・未確認/).first()).toBeVisible();
  });

  test("a single long text field is split across multiple A4 PDF pages", async ({ page }) => {
    await page.goto("/ky/paper");
    await page.getByRole("textbox", { name: "備考", exact: true }).fill(
      "長文の現場確認事項。".repeat(500),
    );
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "PDFで保存" }).click();
    await downloadPromise;
    await expect(page.getByText(/\.pdf（(?:[2-9]|\d{2,})ページ）を保存しました/)).toBeVisible();
  });

  test("explicit member confirmation never auto-approves candidates", async ({ page }) => {
    await page.goto("/ky/paper");
    await page.getByText("メンバーを追加・管理").click();
    await page.getByRole("textbox", { name: "メンバー名", exact: true }).fill("山田");
    await page.getByRole("textbox", { name: "メンバーの役割", exact: true }).fill("職長");
    await page.getByRole("button", { name: /メンバーを登録して選ぶ/ }).click();
    await selectFallAndMeasure(page);
    await expect(page.getByText("確認済み", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "山田として確認" }).click();
    await expect(page.getByText("確認済み", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("textbox", { name: "確認者", exact: true })).toHaveValue(
      "山田／職長",
    );
    await page.getByRole("textbox", { name: "危険1の内容", exact: true }).fill("編集後の危険");
    await expect(page.getByText("人の確認が必要", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "内容を確認して確定" })).toBeDisabled();
  });

  test("reviewed Visual KYT handoff is a candidate banner, not confirmation", async ({ page }) => {
    await page.goto("/ky/paper?import=visual-kyt&scenario=vkyt-001");
    const banner = page.locator("[data-ky-handoff-banner]");
    await expect(banner).toContainText("候補として読み込みました");
    await expect(banner).toContainText("候補を確認してください");
    expect((await banner.innerText()).length).toBeLessThanOrEqual(60);
    await expect(page.getByText("引継ぎ候補", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "危険候補「墜落・転落」を選択" }),
    ).not.toBeChecked();
    await expect(page.getByRole("button", { name: "内容を確認して確定" })).toBeDisabled();
  });

  test("heat, risk, accident, Visual KYT and chemical handoffs remain candidate-only", async ({ page }) => {
    await mockWeather(page);
    const cases = [
      {
        href: "/ky/paper?source=heat&area=tokyo-shinjuku",
        candidate: /危険候補「熱中症」/,
      },
      {
        href: "/ky/paper?source=risk&area=tokyo-shinjuku&workCategory=construction",
        candidate: /危険候補「熱中症」/,
      },
      {
        href: "/ky/paper?source=accident&fromAccident=mhlw-2024-001&accidentType=chemical&workCategory=chemical",
        candidate: /危険候補「有機溶剤・化学物質へのばく露」/,
        session: {
          source: "accident",
          accidentId: "mhlw-2024-001",
          accidentType: "chemical",
          workCategory: "chemical",
        },
      },
      {
        href: "/ky/paper?source=visual-kyt&scenario=vkyt-015",
        candidate: /危険候補「車両との接触・激突され」/,
      },
      {
        href: "/ky/paper?source=chemical-ra&chemical=cas%3A108-88-3&cas=108-88-3",
        candidate: /危険候補「有機溶剤・化学物質へのばく露」/,
        session: {
          source: "chemical-ra",
          chemicalId: "cas:108-88-3",
          cas: "108-88-3",
          workCategory: "chemical",
        },
      },
    ];
    for (const item of cases) {
      if ("session" in item && item.session) {
        await page.goto("/ky/paper");
        await page.evaluate((handoff) => {
          const createdAt = new Date();
          sessionStorage.setItem(
            "safe-ai:ky-handoff:v1",
            JSON.stringify({
              version: 1,
              ...handoff,
              createdAt: createdAt.toISOString(),
              expiresAt: new Date(createdAt.getTime() + 15 * 60_000).toISOString(),
            }),
          );
        }, item.session);
      }
      await page.goto(item.href);
      await expect(page.locator("[data-ky-handoff-banner]")).toContainText(
        "候補として読み込みました",
      );
      const candidate = page.getByRole("checkbox", { name: item.candidate }).first();
      await expect(candidate).toBeVisible({ timeout: 2_000 });
      await expect(candidate).not.toBeChecked();
      expect(page.url()).not.toMatch(/[?&](?:q|payload|work|member|site|note)=/u);
      await expect(page.getByText("確認済み", { exact: true })).toHaveCount(0);
    }
  });

  test("risk CTA carries the displayed WBGT snapshot without a second KY fetch", async ({ page }) => {
    await trackKyHandoffSessionWrites(page);
    const now = new Date();
    const targetAt = new Date(now.getTime() - 2 * 60_000).toISOString();
    const retrievedAt = new Date(now.getTime() - 60_000).toISOString();
    const todayJst = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    let weatherRequests = 0;
    let wbgtRequests = 0;
    await page.route("**/api/weather-risk?area=tokyo-shinjuku*", (route) => {
      weatherRequests += 1;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          provider: "open-meteo",
          fetchedAt: retrievedAt,
          snapshot: {
            regionName: "東京都 新宿区",
            date: todayJst,
            overview: "晴れ",
            temperatureCelsius: 34,
            windSpeedMs: 3,
            precipitationMm: 0,
            alerts: [],
          },
          current: {
            temperatureCelsius: 31.2,
            relativeHumidityPercent: 71,
            targetAt,
          },
          officialWarning: {
            status: "live",
            warnings: [],
            headline: null,
            fetchedAt: retrievedAt,
            reportAt: retrievedAt,
            sourceUrl: "https://www.jma.go.jp/bosai/warning/",
          },
        }),
      });
    });
    await page.route("**/api/wbgt?area=tokyo-shinjuku*", (route) => {
      wbgtRequests += 1;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          areaId: "tokyo-shinjuku",
          areaLabel: "東京都 新宿区",
          prefectureIso: "JP-13",
          scopeLabel: "東京都内提供地点",
          provider: "環境省 熱中症予防情報サイト",
          sourceUrl: "https://www.wbgt.env.go.jp/",
          dataServiceUrl: "https://www.wbgt.env.go.jp/data_service.php",
          retrievedAt,
          degraded: false,
          wbgt: {
            status: "estimated",
            mode: "official-estimated-current",
            valueCelsius: 30.7,
            label: "推定値",
            targetAt,
            createdAt: targetAt,
            stale: false,
            stationCount: 2,
            expectedStationCount: 2,
          },
          alerts: {
            heatAlert: "active",
            specialHeatAlert: "inactive",
            targetDate: todayJst,
            reportAt: retrievedAt,
          },
        }),
      });
    });

    await page.goto("/risk?area=tokyo-shinjuku");
    await expect(page.getByText("30.7℃", { exact: true })).toBeVisible();
    const kyLink = page.getByRole("link", { name: "この条件でKYを作る" });
    await expect(kyLink).toHaveAttribute("href", "/ky/paper");
    const weatherRequestsBeforeHandoff = weatherRequests;
    const wbgtRequestsBeforeHandoff = wbgtRequests;
    expect(weatherRequestsBeforeHandoff).toBeGreaterThanOrEqual(1);
    expect(wbgtRequestsBeforeHandoff).toBeGreaterThanOrEqual(1);
    await kyLink.click();
    await expect(page).toHaveURL(/\/ky\/paper$/);
    expect(new URL(page.url()).search).toBe("");
    expect(await kyHandoffSessionWriteCount(page)).toBe(0);
    await expect
      .poll(() =>
        page.evaluate(() =>
          sessionStorage.getItem("safe-ai:ky-handoff:v1"),
        ),
      )
      .toBeNull();
    await expect(page.getByText("WBGT 30.7℃・推定")).toBeVisible();
    const targetLabel = new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(targetAt));
    const retrievedLabel = new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(retrievedAt));
    await expect(page.getByText(new RegExp(`WBGT対象: ${targetLabel} / WBGT取得: ${retrievedLabel}`))).toBeAttached();
    expect(weatherRequests).toBe(weatherRequestsBeforeHandoff);
    expect(wbgtRequests).toBe(wbgtRequestsBeforeHandoff);
  });

  test("reviewed accident CTA click reaches an unconfirmed KY candidate", async ({ page }) => {
    test.setTimeout(90_000);
    await warmKyHandoffDestination(page);
    await page.goto("/accidents/mhlw-100620");
    const link = page.getByRole("link", {
      name: /この事故を参考にKYを作る/,
    }).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("data-ky-handoff-ready", "true", {
      timeout: 30_000,
    });
    await page.waitForLoadState("networkidle", { timeout: 30_000 });
    await link.click();
    await expect(page.locator("[data-ky-handoff-banner]")).toContainText(
      "候補として読み込みました",
      { timeout: 30_000 },
    );
    const candidate = page.getByRole("checkbox", {
      name: /危険候補「墜落・転落」を選択/,
    }).first();
    await expect(candidate).toBeVisible();
    await expect(candidate).not.toBeChecked();
  });

  test("Visual KYT CTA carries the user's selected hazard and measure as candidates", async ({ page }) => {
    test.setTimeout(90_000);
    await trackKyHandoffSessionWrites(page);
    await warmKyHandoffDestination(page);
    await page.goto("/training/visual-ky/scaffold-fall");
    await expect(
      page.locator('[data-visual-ky-ready="true"]'),
    ).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "イラストから危険を探す" }).click();
    await expect(
      page.getByRole("heading", { name: "危険と思う候補を選ぶ" }),
    ).toBeVisible();
    await page.getByRole("button", { name: /候補1:/ }).click();
    await page.getByRole("button", { name: "予想を確定して解説を見る" }).click();
    await page.getByRole("button", { name: "対策を選ぶ" }).click();
    await page.getByRole("checkbox", {
      name: /作業を止め、手すりと床材を復旧してから再開する/,
    }).check();
    await page.getByRole("button", { name: "まとめへ進む" }).click();
    const summary = page.locator('section[aria-labelledby="summary-heading"]');
    const link = summary.getByRole("link", { name: "この問題でKYを作る" });
    await expect(link).toHaveAttribute("href", "/ky/paper");
    await expect(link).toHaveAttribute("data-ky-handoff-ready", "true", {
      timeout: 30_000,
    });
    await expect
      .poll(() =>
        page.evaluate(() =>
          sessionStorage.getItem("safe-ai:ky-handoff:v1"),
        ),
      )
      .toBeNull();
    await link.click();
    await expect(page).toHaveURL(/\/ky\/paper$/, { timeout: 30_000 });
    const target = new URL(page.url());
    expect([...target.searchParams.keys()]).toEqual([]);
    expect(decodeURIComponent(page.url())).not.toContain("開いた作業床端部");
    expect(decodeURIComponent(page.url())).not.toContain("作業を止め");
    expect(await kyHandoffSessionWriteCount(page)).toBe(0);
    await expect
      .poll(() =>
        page.evaluate(() =>
          sessionStorage.getItem("safe-ai:ky-handoff:v1"),
        ),
      )
      .toBeNull();
    await expect(page.locator("[data-ky-handoff-banner]")).toContainText(
      "候補として読み込みました",
      { timeout: 30_000 },
    );
    await expect(page.locator("#ky-work-description")).toHaveValue("足場からの墜落");
    const candidate = page.getByRole("checkbox", {
      name: "危険候補「開いた作業床端部」を選択",
    });
    await expect(candidate).toBeVisible();
    await expect(candidate).not.toBeChecked();
    await expect(candidate.locator("xpath=ancestor::div[1]")).toContainText("引継ぎ候補");
    await expect(page.getByRole("button", { name: "内容を確認して確定" })).toBeDisabled();
    await candidate.check();
    const inheritedMeasure = page.getByRole("checkbox", {
      name: /対策候補「作業を止め、手すりと床材を復旧してから再開する」を選択/,
    }).first();
    await expect(inheritedMeasure).toBeVisible();
    await expect(inheritedMeasure).not.toBeChecked();
    await expect(inheritedMeasure.locator("xpath=ancestor::label")).toContainText(
      "引継ぎ候補",
    );
    await expect(page.getByRole("button", { name: "内容を確認して確定" })).toBeDisabled();
  });

  test("chemical RA CTA carries verified CAS conditions without raw work text in the URL", async ({ page }) => {
    test.setTimeout(90_000);
    await trackKyHandoffSessionWrites(page);
    await warmKyHandoffDestination(page);
    await page.route("**/api/chemical-ra", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          chemicalName: "トルエン",
          casNumber: "108-88-3",
          flashPoint: "4℃",
          exposureLimit: "50 ppm",
          ghsHazards: [],
          ppeRecommendations: [],
          safetyMeasures: [],
          emergencyMeasures: [],
          regulatoryNotes: [],
          relatedHazards: [],
          assessmentStatus: "unavailable",
          assessmentNotice: "公式SDSと専門家による最終確認が必要です。",
          aiStatus: "disabled_for_safety",
        }),
      }),
    );
    const workDraft = "屋内で有機溶剤を小分けする";
    await page.goto("/chemical-ra");
    const searchResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/chemical/search" &&
        response.request().method() === "POST" &&
        response.request().postData()?.includes('"query":"108-88-3"') === true,
      { timeout: 30_000 },
    );
    await page.locator("#chemical-onebox-input").fill("108-88-3");
    expect((await searchResponse).status()).toBe(200);
    const tolueneOption = page
      .getByRole("option")
      .filter({ hasText: "CAS 108-88-3" });
    await expect(tolueneOption).toBeVisible({ timeout: 15_000 });
    await tolueneOption.getByRole("button").click();
    const confirmationResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/chemical/search" &&
        response.request().method() === "POST" &&
        response.request().postData()?.includes('"selection"') === true,
      { timeout: 30_000 },
    );
    await page
      .getByRole("button", { name: "名称とCASを確認して続行" })
      .click();
    expect((await confirmationResponse).status()).toBe(200);
    await expect(page.locator("#chemical-onebox-input")).toHaveValue("トルエン");
    await page.getByRole("button", { name: "作業条件へ進む" }).click();
    const workContent = page.getByRole("textbox", {
      name: /作業内容（任意）/,
    });
    await expect(workContent).toBeVisible();
    await workContent.fill(workDraft);
    await page.getByRole("button", { name: "公的情報を確認" }).click();
    const link = page.getByRole("link", { name: "この作業条件をKYへ" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/ky/paper");
    await link.click();
    await expect(page).toHaveURL(/\/ky\/paper$/);
    expect(new URL(page.url()).search).toBe("");
    expect(await kyHandoffSessionWriteCount(page)).toBe(0);
    await expect
      .poll(() =>
        page.evaluate(() =>
          sessionStorage.getItem("safe-ai:ky-handoff:v1"),
        ),
      )
      .toBeNull();
    await expect(page.locator("[data-ky-handoff-banner]")).toContainText(
      "候補として読み込みました",
    );
    await expect(page.locator("#ky-work-description")).toHaveValue(workDraft);
    expect(decodeURIComponent(page.url())).not.toContain(workDraft);
    const candidate = page.getByRole("checkbox", {
      name: /危険候補「有機溶剤・化学物質へのばく露」を選択/,
    }).first();
    await expect(candidate).not.toBeChecked();
  });

  test("one-shot accident candidates survive autosave and draft resume", async ({ page }) => {
    await page.goto("/ky/paper");
    await page.evaluate(() => {
      const createdAt = new Date();
      sessionStorage.setItem(
        "safe-ai:ky-handoff:v1",
        JSON.stringify({
          version: 1,
          source: "accident",
          accidentId: "mhlw-2024-001",
          accidentType: "chemical",
          workCategory: "chemical",
          createdAt: createdAt.toISOString(),
          expiresAt: new Date(createdAt.getTime() + 15 * 60_000).toISOString(),
        }),
      );
    });
    await page.goto(
      "/ky/paper?source=accident&fromAccident=mhlw-2024-001&accidentType=chemical&workCategory=chemical",
    );
    const candidate = page.getByRole("checkbox", {
      name: "危険候補「有機溶剤・化学物質へのばく露」を選択",
    });
    await expect(candidate).toBeVisible({ timeout: 2_000 });
    await expect(candidate).not.toBeChecked();
    await expect(page.getByText("保存済み", { exact: true })).toBeVisible({
      timeout: 2_500,
    });
    expect(
      await page.evaluate(() =>
        sessionStorage.getItem("safe-ai:ky-handoff:v1"),
      ),
    ).toBeNull();

    await page.goto("/ky/paper");
    await page.getByRole("button", { name: "前回の続き" }).click();
    await expect(page.locator("[data-ky-handoff-banner]")).toContainText(
      "候補として読み込みました",
    );
    await expect(candidate).toBeVisible();
    await expect(candidate).not.toBeChecked();
  });

  test("legacy allowlisted preset opens with work, hazard and measure candidates", async ({ page }) => {
    await page.goto("/ky/paper?preset=ladder");
    await expect(page.locator("[data-ky-handoff-banner]")).toContainText("候補");
    await expect(page.locator("#ky-work-description")).toHaveValue(/脚立/u);
    const hazard = page.getByRole("checkbox", {
      name: /脚立の開脚金具が未ロック/u,
    });
    await hazard.check();
    await expect(
      page.getByRole("checkbox", { name: /使用前に必ず開脚金具のロックを確認/u }),
    ).toBeVisible();
    await expect(page.getByText("確認済み", { exact: true })).toHaveCount(0);
  });

  test("320 through 1440, landscape and 200% text have no page overflow", async ({ page }) => {
    const viewports = [
      { width: 320, height: 844 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
      { width: 1440, height: 900 },
      { width: 844, height: 390 },
    ];
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto("/ky/paper");
      await expect(page.getByRole("heading", { level: 1, name: "KYを作る" })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      ).toBeLessThanOrEqual(2);
    }
    await page.setViewportSize({ width: 320, height: 844 });
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(2);
  });

  test("mobile keyboard space selection and short viewport do not hide the active control", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 500 });
    await page.goto("/ky/paper");
    await page.locator("#ky-work-description").fill(WORK);
    const hazard = page.getByRole("checkbox", {
      name: "危険候補「墜落・転落」を選択",
    });
    await expect(hazard).toBeVisible({ timeout: 2_000 });
    await hazard.focus();
    await page.keyboard.press("Space");
    await expect(hazard).toBeChecked();
    const geometry = await hazard.evaluate((element) => {
      const control = element.getBoundingClientRect();
      const nav = document.querySelector<HTMLElement>("[data-mobile-nav='bottom']")?.getBoundingClientRect();
      return { bottom: control.bottom, navTop: nav?.top ?? innerHeight };
    });
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.navTop);
  });

  test("offline mode keeps editing, local save and PDF download available", async ({ page, context }) => {
    await page.goto("/ky/paper");
    await context.setOffline(true);
    await expect(
      page.locator("#ky-paper-start").getByRole("alert").filter({ hasText: "オフラインモード" }),
    ).toBeVisible();
    await selectFallAndMeasure(page);
    await expect(page.getByText("保存済み", { exact: true })).toBeVisible({ timeout: 2_500 });
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "PDFで保存" }).click();
    await downloadPromise;
    await expect(page.getByText(/\.pdf（\d+ページ）を保存しました/)).toBeVisible();
  });

  test("JavaScript disabled keeps a printable A4-style HTML fallback", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/ky/paper");
    await expect(page.getByRole("heading", { name: "KYを作る（印刷用HTML）" })).toBeVisible();
    await expect(page.locator("#ky-paper-start")).toBeHidden();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByText("下書き・未確認", { exact: true })).toBeVisible();
    await expect(page.getByRole("rowheader", { name: "危険" })).toBeVisible();
    await context.close();
  });

  test("400% text, forced colors and reduced motion remain one-column and operable", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    await page.goto("/ky/paper");
    await page.addStyleTag({ content: "html { font-size: 400% !important; }" });
    await expect(page.locator("#ky-work-description")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(2);
    await page.locator("#ky-work-description").fill("足場作業");
    await expect(page.getByRole("checkbox", { name: /危険候補/ }).first()).toBeVisible({
      timeout: 2_000,
    });
  });
});
