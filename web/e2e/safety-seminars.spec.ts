import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const HUB = "/training/safety-seminars";
const DETAIL = `${HUB}/fall-prevention`;
const OSH_DETAIL = `${HUB}/safety-management-basics-osh-law`;

test.describe("安全研修ライブラリ", () => {
  test("一覧は全20テーマ（公開2件、Coming Soon 18件）で空の個別CTAがない", async ({ page }) => {
    const response = await page.goto(HUB);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "安全研修ライブラリ" })).toBeVisible();
    const publishedCards = page.locator('[data-seminar-status="published"]');
    await expect(publishedCards).toHaveCount(2);
    expect(
      await publishedCards
        .getByRole("link", { name: "今すぐ見る" })
        .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
    ).toEqual([
      `${HUB}/safety-management-basics-osh-law`,
      DETAIL,
    ]);
    await expect(page.locator('[data-seminar-status="coming-soon"]')).toHaveCount(18);
    for (const card of await page.locator('[data-seminar-status="coming-soon"]').all()) {
      await expect(card.locator("a, button")).toHaveCount(0);
      await expect(card.getByText("Coming Soon", { exact: true })).toBeVisible();
    }
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://www.anzen-ai-portal.jp${HUB}`);
  });

  test("音声の再生・一時停止、スライド移動、常時字幕、原稿、keyboardを操作できる", async ({ page }) => {
    await page.goto(DETAIL);
    const audio = page.locator("audio");
    await expect(audio).toHaveCount(1);
    expect(await audio.evaluate((element) => (element as HTMLAudioElement).paused)).toBe(true);

    await page.getByRole("button", { name: "再生" }).click();
    await expect.poll(() => audio.evaluate((element) => (element as HTMLAudioElement).currentTime)).toBeGreaterThan(0);
    await page.getByRole("button", { name: "一時停止" }).click();
    expect(await audio.evaluate((element) => (element as HTMLAudioElement).paused)).toBe(true);
    await page.getByRole("button", { name: "次のスライド" }).click();
    await expect(page.getByText("02 / 20")).toBeVisible();
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText("03 / 20")).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText("02 / 20")).toBeVisible();

    await expect(page.getByTestId("seminar-controls").getByRole("button")).toHaveCount(5);
    await expect(page.getByRole("button", { name: "字幕" })).toHaveCount(0);
    await expect(page.locator('[role="status"]')).toBeVisible();
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("c");
    await expect(page.locator('[role="status"]')).toBeVisible();
    await page.getByRole("button", { name: "音声原稿を読む" }).click();
    await expect(page.getByRole("heading", { name: "講師向け補足" })).toBeVisible();
    await expect(page.getByRole("button", { name: "停止" })).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "再生速度" })).toHaveCount(0);
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
    const progress = page.getByRole("progressbar", { name: "教材全体の進捗" }).locator(":scope > div");
    await expect(progress).toHaveCSS("transition-property", "none");

    await page.goto(`${DETAIL}?slide=4&captions=1`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/u);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://www.anzen-ai-portal.jp${DETAIL}`);

    await page.getByText("講師・配布用の補助資料を開く（5点）").click();
    for (const name of ["編集可能PowerPoint", "投影・印刷用PDF", "講師用台本", "参加者配布用1枚資料", "現場確認チェックリスト", "5問クイズ・解答解説", "出典一覧"]) {
      const href = await page.getByRole("link", { name }).getAttribute("href");
      expect(href).toBeTruthy();
      const response = await page.request.get(href!);
      expect(response.status(), name).toBe(200);
      expect(Number(response.headers()["content-length"] ?? 1), name).toBeGreaterThan(0);
    }
  });

  test("墜落防止5問は誤答理由・根拠・復習・再訪を示し、基本教材の回答を保つ", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(DETAIL);
    await expect(page.getByText(/器具の配布だけでは/u)).toHaveCount(0);
    const answers = [0, 2, 2, 2, 2];
    for (const [index, answer] of answers.entries()) {
      await page.getByRole("group", { name: /問目の選択肢/u }).getByRole("button").nth(answer).click();
      const status = page.locator('[role="status"]').filter({ hasText: index === 0 ? /不正解です/u : /正解です/u });
      await expect(status).toBeFocused();
      await expect(page.getByText(/未選択：/u)).toHaveCount(index === 0 ? 2 : 3);
      for (const link of await status.getByRole("link", { name: /根拠:/u }).all()) {
        expect(await link.getAttribute("href")).toMatch(/^https:\/\/(www\.mhlw\.go\.jp|laws\.e-gov\.go\.jp|www\.jniosh\.johas\.go\.jp)\//u);
      }
      if (index === 2) {
        await expect(status.getByRole("link", { name: /第36条第41号/u }))
          .toHaveAttribute("href", /#Mp-At_36$/u);
      }
      if (index === 4) {
        await expect(status.getByRole("link", { name: /冊子p80／PDF p84/u }))
          .toHaveAttribute("href", /#page=84$/u);
        await expect(status.getByRole("link", { name: /第7の1（落下衝撃後の使用禁止）/u })).toBeVisible();
        await page.setViewportSize({ width: 320, height: 844 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
          .toBeLessThanOrEqual(1);
      }
      await page.getByRole("button", { name: index === 4 ? "結果を見る" : "次の問題" }).click();
    }
    await expect(page.getByText("4/5問 正解")).toBeVisible();
    await page.getByRole("button", { name: "間違えた問題だけ再挑戦" }).click();
    await expect(page.getByText("問題 1/1", { exact: true })).toBeVisible();
    await page.getByRole("group", { name: /問目の選択肢/u }).getByRole("button").nth(1).click();
    await page.reload();
    await page.getByRole("button", { name: "続きから" }).click();
    await expect(page.getByText("回答済み 1/1問", { exact: true })).toBeVisible();
    await page.getByRole("navigation", { name: "パンくず" }).getByRole("link", { name: "安全研修ライブラリ" }).click();
    await expect(page).toHaveURL(/\/training\/safety-seminars$/u);
    await page.goBack();
    const resume = page.getByRole("button", { name: "続きから" });
    if (await resume.isVisible()) await resume.click();
    await expect(page.getByText("回答済み 1/1問", { exact: true })).toBeVisible();
    await page.goto(OSH_DETAIL);
    await expect(page.getByText("問題 1/5", { exact: true })).toBeVisible();
  });

  test("JavaScript無効でもH1・全20枚・注意・downloadを読める", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const page = await context.newPage();
    const response = await page.goto(DETAIL);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "JavaScriptを使わずに読む" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "JavaScriptを使わずに読む" }).locator("..").locator("ol > li")).toHaveCount(20);
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

test.describe("安全管理の基本と安衛法 PR1", () => {
  test("320/390/1440pxで投影面の寸法・文字・5操作・タップ対象を満たす", async ({ page }) => {
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
      await page.goto(OSH_DETAIL);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${width}px overflow`).toBeLessThanOrEqual(1);

      const stage = page.getByTestId("seminar-stage");
      const controls = page.getByTestId("seminar-controls");
      const play = page.getByRole("button", { name: "再生" });
      await expect(controls.locator("button")).toHaveCount(5);
      const [stageBox, controlsBox, playBox] = await Promise.all([
        stage.boundingBox(),
        controls.boundingBox(),
        play.boundingBox(),
      ]);
      expect(stageBox).toBeTruthy();
      expect(controlsBox).toBeTruthy();
      expect(playBox).toBeTruthy();
      if (width <= 390) {
        expect(playBox!.y - stageBox!.y, `${width}px stage to play`).toBeLessThanOrEqual(640);
      } else {
        expect(controlsBox!.y + controlsBox!.height - stageBox!.y, "desktop stage and controls")
          .toBeLessThanOrEqual(820);
      }

      const titleSize = Number.parseFloat(await page.getByTestId("stage-title").evaluate((element) => getComputedStyle(element).fontSize));
      const headlineSize = Number.parseFloat(await page.getByTestId("stage-headline").evaluate((element) => getComputedStyle(element).fontSize));
      expect(titleSize, `${width}px title`).toBeGreaterThanOrEqual(width >= 1024 ? 40 : 24);
      expect(headlineSize, `${width}px headline`).toBeGreaterThanOrEqual(width >= 1024 ? 24 : 18);

      const minimumStageFont = await stage.evaluate((element) => {
        const sizes = [...element.querySelectorAll<HTMLElement>("p, li, a, h3")]
          .filter((node) => node.textContent?.trim() && getComputedStyle(node).display !== "none")
          .map((node) => Number.parseFloat(getComputedStyle(node).fontSize));
        return Math.min(...sizes);
      });
      expect(minimumStageFont, `${width}px minimum stage font`).toBeGreaterThanOrEqual(width >= 1024 ? 20 : 14);

      const undersizedTargets = await page.locator('[data-testid="seminar-stage"] a, [data-testid="seminar-controls"] button').evaluateAll((elements) =>
        elements.filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width < 44 || rect.height < 44;
        }).map((element) => ({ text: element.textContent, rect: element.getBoundingClientRect().toJSON() })),
      );
      expect(undersizedTargets, `${width}px targets`).toEqual([]);
      const mascot = stage.locator("img");
      await mascot.evaluate((element) => (element as HTMLImageElement).decode());
      expect((await mascot.boundingBox())!.width).toBeLessThanOrEqual(280);
    }
  });

  test("選択前に答えをDOMへ出さず、5問を10タップで完了し、根拠ドメインを限定する", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(OSH_DETAIL);
    await expect(page.getByText(/本人だけを確認すると/u)).toHaveCount(0);
    await expect(page.getByText(/正解です/u)).toHaveCount(0);

    const correctIndexes = [1, 1, 0, 2, 3];
    for (const [index, answer] of correctIndexes.entries()) {
      await page.getByRole("group", { name: /問目の選択肢/u }).getByRole("button").nth(answer).click();
      const status = page.locator('[role="status"]').filter({ hasText: /正解です/u });
      await expect(status).toBeFocused();
      await expect(page.getByText(/○ 正解：/u)).toHaveCount(1);
      await expect(page.getByText(/未選択：/u)).toHaveCount(3);
      const links = status.getByRole("link", { name: /根拠:/u });
      for (const link of await links.all()) {
        const href = await link.getAttribute("href");
        expect(href).toMatch(/^(\/law-navi\/|https:\/\/(laws\.e-gov\.go\.jp|www\.mhlw\.go\.jp)\/)/u);
      }
      await page.getByRole("button", { name: index === 4 ? "結果を見る" : "次の問題" }).click();
    }
    await expect(page.getByText("5/5問 正解")).toBeVisible();
  });

  test("light/darkの320/390/768/1440pxでserious/criticalのAxe違反がない", async ({ page }) => {
    test.setTimeout(120_000);
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
        await page.goto(OSH_DETAIL);
        const results = await new AxeBuilder({ page }).analyze();
        const highImpact = results.violations.filter(
          (violation) => violation.impact === "serious" || violation.impact === "critical",
        );
        expect(highImpact, `${colorScheme}/${width}px: ${JSON.stringify(highImpact)}`).toEqual([]);
      }
    }
  });

  test("JavaScript無効でも12枚・クイズ選択肢・配布物を読める", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    expect((await page.goto(OSH_DETAIL))?.status()).toBe(200);
    await expect(page.locator("noscript ol").first().locator(":scope > li")).toHaveCount(12);
    await expect(page.getByRole("heading", { name: /Q1. 事故原因を調べるとき/u }).last()).toBeVisible();
    for (const name of ["編集可能PowerPoint", "投影・印刷用PDF"]) {
      const href = await page.getByRole("link", { name }).getAttribute("href");
      const response = await page.request.get(href!);
      expect(response.status(), name).toBe(200);
      expect(Number(response.headers()["content-length"] ?? 0), name).toBeGreaterThan(0);
    }
    await context.close();
  });

  test("保存拒否と壊れた保存値でもクイズを操作できる", async ({ browser, baseURL }) => {
    for (const blocked of [true, false]) {
      const context = await browser.newContext({ baseURL });
      await context.addInitScript((denyStorage) => {
        if (denyStorage) {
          for (const method of ["getItem", "setItem", "removeItem"] as const) {
            Storage.prototype[method] = () => { throw new DOMException("Storage blocked", "SecurityError"); };
          }
        } else {
          localStorage.setItem("seminar-quiz:safety-management-basics-osh-law:1.0.0", JSON.stringify({ queue: [99], position: 0, responses: { 99: 1 }, complete: false }));
        }
      }, blocked);
      const page = await context.newPage();
      await page.goto(OSH_DETAIL);
      const choice = page.getByRole("group", { name: /問目の選択肢/u }).getByRole("button").first();
      await choice.focus();
      await page.keyboard.press("Space");
      await expect(page.getByRole("status")).toContainText("不正解です");
      await page.getByRole("button", { name: "次の問題" }).click();
      await expect(page.getByText("問題 2/5", { exact: true })).toBeVisible();
      await context.close();
    }
  });

  test("誤答再挑戦、再読み込みと根拠から戻る操作で進捗を維持する", async ({ page }) => {
    await page.goto(OSH_DETAIL);
    const answers = [0, 1, 0, 2, 3];
    for (const [index, answer] of answers.entries()) {
      await page.getByRole("group", { name: /問目の選択肢/u }).getByRole("button").nth(answer).click();
      await page.getByRole("button", { name: index === 4 ? "結果を見る" : "次の問題" }).click();
    }
    await expect(page.getByText("4/5問 正解")).toBeVisible();
    await page.getByRole("button", { name: "間違えた問題だけ再挑戦" }).click();
    await expect(page.getByText("問題 1/1", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "人、設備、作業方法、管理の条件を確認する", exact: true }).click();
    await page.reload();
    await page.getByRole("button", { name: "続きから", exact: true }).click();
    await expect(page.getByText("回答済み 1/1問", { exact: true })).toBeVisible();
    const evidence = page.getByRole("link", { name: "根拠: 安衛法 第28条の2", exact: true });
    await expect(evidence).toHaveAttribute("href", "https://laws.e-gov.go.jp/law/347AC0000000057#Mp-At_28_2");
    await expect(evidence).toHaveAttribute("target", "_blank");
    await page.getByRole("navigation", { name: "パンくず" }).getByRole("link", { name: "安全研修ライブラリ", exact: true }).click();
    await expect(page).toHaveURL(/\/training\/safety-seminars$/u);
    await page.goBack();
    const resume = page.getByRole("button", { name: "続きから", exact: true });
    if (await resume.isVisible()) await resume.click();
    await page.getByRole("button", { name: "結果を見る" }).click();
    await expect(page.getByText("1/1問 正解")).toBeVisible();
  });
});
