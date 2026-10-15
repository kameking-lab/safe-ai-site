import { expect, test, type Page, type TestInfo } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({ path: testInfo.outputPath(name + ".png") });
}

test.describe("editable questions, PPE consultation and published learning @smoke", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("040 質問例は未送信の入力になり、設備や作業の補足を編集できる", async ({ page }, testInfo) => {
    let sends = 0;
    page.on("request", (request) => {
      if (request.method() === "POST" && /\/api\/gemini\//u.test(request.url())) sends += 1;
    });
    await page.goto("/chatbot");
    const input = page.getByRole("textbox", { name: "質問入力" });
    const examples = page.getByRole("group", { name: "質問例", exact: true });
    const chips = examples.getByRole("button");
    await expect(chips).toHaveCount(3);
    const questions = await chips.allTextContents();
    for (const question of questions) {
      const text = question.trim();
      await expect(async () => {
        await examples.getByRole("button", { name: text, exact: true }).click();
        await expect(input).toHaveValue(text, { timeout: 1_000 });
      }).toPass({ timeout: 20_000 });
      await expect(input).toBeFocused();
      expect(sends).toBe(0);
    }
    const edited = questions[0]!.trim() + " 設備と作業場所は確認中です。";
    await input.fill(edited);
    await expect(input).toHaveValue(edited);
    await expect(page.getByRole("button", { name: "送信", exact: true })).toBeEnabled();
    expect(sends).toBe(0);
    await expectNoHorizontalOverflow(page);
    await capture(page, testInfo, "040-editable-example-390");
    // 実AIへの送信は行わない。明示送信後の本文は既存のmock E2Eとunitで検査する。
  });

  test("063 選んだ作業と未確認点を相談下書きへ渡し、編集内容をサイトへ送信しない", async ({ page }, testInfo) => {
    const privateMarker = "PPE_DRAFT_PRIVATE_CHECK_063";
    const leakedRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes(privateMarker) || request.postData()?.includes(privateMarker)) leakedRequests.push(request.url());
    });
    await page.goto("/goods");
    const wizard = page.locator("#goods-guided-selection");
    await wizard.getByRole("button", { name: "粉じん・ガスを吸う作業", exact: true }).click();
    await wizard.getByRole("button", { name: /粉じん・研削・清掃/u }).click();
    await wizard.getByRole("button", { name: /換気が効いている/u }).click();
    await expect(wizard.getByRole("heading", { name: "酸素濃度を測りましたか？" })).toBeVisible();
    await wizard.getByRole("button", { name: /分からない・未確認/u }).click();
    await wizard.getByRole("button", { name: "未確認のまま確認事項を見る", exact: true }).click();
    await expect(wizard.getByText("選定を保留・確認が必要", { exact: true })).toBeVisible();
    await expect(wizard.getByRole("link", { name: /Amazon|楽天で一般検索/u })).toHaveCount(0);
    await wizard.getByRole("button", { name: "選定を相談する", exact: true }).click();
    await expect(page).toHaveURL(/\/contact\/automation-email\?subject=ppe-selection$/u);
    const draft = page.getByRole("textbox", { name: "相談文（編集できます）", exact: true });
    await expect(draft).toBeEditable();
    await expect(draft).toHaveValue(/粉じん・研削・清掃/u);
    await expect(draft).toHaveValue(/換気が効いている/u);
    await expect(draft).toHaveValue(/【未確認・相談したい点】/u);
    await expect(draft).toHaveValue(/酸素/u);
    const edited = (await draft.inputValue()) + "\n" + privateMarker;
    await draft.fill(edited);
    const mail = page.getByRole("link", { name: "内容を確認してメールアプリを開く", exact: true });
    await expect(mail).toBeVisible();
    const href = await mail.getAttribute("href");
    expect(href).not.toBeNull();
    expect(new URL(href!).protocol).toBe("mailto:");
    expect(new URL(href!).searchParams.get("body")).toBe(edited);
    expect(page.url()).not.toContain(privateMarker);
    const stored = await page.evaluate(() => JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]));
    expect(stored).not.toContain(privateMarker);
    expect(leakedRequests).toEqual([]);
    await expectNoHorizontalOverflow(page);
    await capture(page, testInfo, "063-editable-ppe-draft-390");
    // メールアプリ起動・メール送信は行わない。
  });

  test("064 公開教材を先に選び、準備中を閉じたまま絞り込みと解除ができる", async ({ page }, testInfo) => {
    await page.goto("/training/safety-seminars");
    const published = page.locator('section[aria-labelledby="published-seminars-title"]');
    const cards = published.locator('[data-seminar-status="published"]');
    const pending = page.locator('section[aria-labelledby="coming-soon-title"] details');
    await expect(cards).toHaveCount(3);
    await expect(pending).toHaveJSProperty("open", false);
    await expect(pending.locator('[data-seminar-status="coming-soon"]')).toHaveCount(17);
    expect(await page.evaluate(() => {
      const ready = document.querySelector('[data-seminar-status="published"]')!;
      const future = document.querySelector('section[aria-labelledby="coming-soon-title"]')!;
      return Boolean(ready.compareDocumentPosition(future) & Node.DOCUMENT_POSITION_FOLLOWING);
    })).toBe(true);
    await expect(async () => {
      await published.getByRole("combobox", { name: "形式で絞り込む" }).selectOption("Webスライド");
      await expect(cards).toHaveCount(1, { timeout: 1_000 });
    }).toPass({ timeout: 20_000 });
    await expect(cards.first()).toContainText("化学物質・SDS");
    await published.getByRole("combobox", { name: "標準時間で絞り込む" }).selectOption("確認込み約12〜15分");
    await expect(cards).toHaveCount(0);
    await expect(published.getByRole("status")).toHaveText("公開教材 0件");
    await published.getByRole("button", { name: "絞り込みを解除", exact: true }).click();
    await expect(cards).toHaveCount(3);
    await expect(published.getByRole("status")).toHaveText("公開教材 3件");
    await published.getByRole("combobox", { name: "対象で絞り込む" }).selectOption("建設現場の作業者・職長・安全衛生担当者");
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText("墜落・転落防止");
    await published.getByRole("button", { name: "絞り込みを解除", exact: true }).click();
    await expect(cards).toHaveCount(3);
    await expect(pending).toHaveJSProperty("open", false);
    await published.scrollIntoViewIfNeeded();
    await expectNoHorizontalOverflow(page);
    await capture(page, testInfo, "064-published-seminars-390");
    await published.getByRole("combobox", { name: "標準時間で絞り込む" }).selectOption("約15〜20分");
    await cards.getByRole("link", { name: "今すぐ見る", exact: true }).click();
    await expect(page).toHaveURL(/\/training\/safety-seminars\/chemicals-sds-risk-assessment$/u);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("化学物質");
  });
});

test.describe("PPE consultation without JavaScript", () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });

  test("063 no-JSは編集不能な表示を明示し、宛先・件名・ひな形を手動コピーできる", async ({ page }, testInfo) => {
    await page.goto("/contact/automation-email?subject=ppe-selection");
    await expect(page.getByRole("textbox", { name: "相談文（準備中）", exact: true })).toBeDisabled();
    await expect(page.getByRole("link", { name: "内容を確認してメールアプリを開く", exact: true })).toHaveCount(0);
    await expect(page.getByText(/JavaScriptを利用できない場合は/u)).toBeVisible();
    await expect(page.getByRole("textbox", { name: "宛先", exact: true })).toHaveAttribute("readonly", "");
    await expect(page.getByRole("textbox", { name: "件名", exact: true })).toHaveAttribute("readonly", "");
    await expect(page.getByRole("textbox", { name: "相談文のひな形", exact: true })).toHaveAttribute("readonly", "");
    await expectNoHorizontalOverflow(page);
    await page.getByText(/JavaScriptを利用できない場合は/u).scrollIntoViewIfNeeded();
    await capture(page, testInfo, "063-nojs-manual-copy-390");
  });
});

