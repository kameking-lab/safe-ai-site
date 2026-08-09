import { test, expect } from "@playwright/test";

test.describe("安全工程打合せ書", () => {
  test("ページが表示される @smoke", async ({ page }) => {
    const res = await page.goto("/safety-diary");
    expect(res?.status()).toBeLessThan(400);
    await expect(
      page.getByRole("link", { name: "工程を入力する", exact: true }),
    ).toHaveAttribute("href", "/safety-diary?edit=1#meeting-paper-start");
    await expect(
      page.getByRole("link", { name: "内容を確認・承認する", exact: true }),
    ).toHaveAttribute("href", "/safety-diary?edit=1#meeting-approval");
  });

  test("タイトルに『打合せ書』が含まれる", async ({ page }) => {
    await page.goto("/safety-diary");
    await expect(page).toHaveTitle(/打合せ書/);
  });

  test("JavaScript無効でも開始リンクから入力用紙へ進める", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    try {
      await page.goto("/safety-diary");
      await page
        .getByRole("link", { name: "工程を入力する", exact: true })
        .click();
      await expect(page).toHaveURL(/\/safety-diary\?edit=1/);
      await expect(page.getByLabel("作業所名", { exact: true })).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test("既存のcanvas=0 deep linkでもアクセシブル入力を維持する", async ({ page }) => {
    await page.goto("/safety-diary?canvas=0");
    await expect(page.getByLabel("作業所名", { exact: true })).toBeVisible();
    await expect(page.getByTestId("paper-stage-content")).toHaveCount(0);
  });

  test("既定のアクセシブル入力で作成→保存し、localStorage(meeting-record) に永続化される", async ({ page }) => {
    await page.goto("/safety-diary?edit=1");
    await page.waitForLoadState("networkidle");

    const site = page.getByLabel("作業所名", { exact: true });
    await site.fill("E2E現場テスト");

    const saveBtn = page.getByRole("button", { name: "保存" }).first();
    await saveBtn.click();
    await page.waitForTimeout(800);

    const stored = await page.evaluate(() => localStorage.getItem("meeting-record"));
    expect(stored).toContain("E2E現場テスト");
  });

  test("アクセシブル入力が既定で、任意の用紙プレビューと往復できる", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("anzen-onboarding-v1-seen", "1");
      localStorage.removeItem("meeting-record");
    });
    await page.goto("/safety-diary?edit=1");
    await expect(page.getByLabel("作業所名", { exact: true })).toBeVisible();
    await expect(page.getByTestId("paper-stage-content")).toHaveCount(0);
    await page.getByRole("button", { name: /用紙プレビュー/ }).click();
    await expect(page.getByTestId("paper-stage-content")).toBeVisible();
    expect(page.url()).toContain("canvas=1");
    await page.getByRole("button", { name: "アクセシブル入力" }).click();
    await expect(page.getByLabel("作業所名", { exact: true })).toBeVisible();
    expect(page.url()).not.toContain("canvas=1");
  });

  test("任意のキャンバス表示に保存・複製/印刷/点検AIがある（機能パリティ）", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("anzen-onboarding-v1-seen", "1");
    });
    await page.goto("/safety-diary?canvas=1");
    await expect(page.getByTestId("paper-stage-content")).toBeVisible();
    // 保存＝主ボタン（solid・常設）
    await expect(page.getByRole("button", { name: "保存", exact: true })).toBeVisible();
    // 「…」シート
    await page.getByRole("button", { name: "その他の操作（複製・印刷・点検項目AI）" }).click();
    await expect(page.getByRole("menuitem", { name: /前回を複製/ })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /確認候補を抽出/ })).toBeVisible();
    const preview = page.getByRole("menuitem", { name: /印刷プレビュー/ });
    await preview.click();
    await expect(page.getByText("印刷プレビュー（A4横・打合せ書）")).toBeVisible();
  });

  test("保存一覧ページが表示される @smoke", async ({ page }) => {
    const res = await page.goto("/safety-diary/list");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByText("保存した打合せ書")).toBeVisible();
  });

  test("保存一覧の新規作成は入力用紙を直接開く", async ({ page }) => {
    await page.goto("/safety-diary/list");
    await page.getByRole("link", { name: "＋ 新規作成", exact: true }).click();
    await expect(page).toHaveURL(/\/safety-diary\?edit=1/);
    await expect(page.getByLabel("作業所名", { exact: true })).toBeVisible();
  });

  test("旧入力URLは概要を挟まず入力用紙へ移行する", async ({ page }) => {
    for (const path of [
      "/safety-diary/new",
      "/safety-diary/new/detail",
      "/safety-diary/legacy-entry",
      "/safety-diary/legacy-entry/print",
      "/safety-diary/monthly/2026-08",
    ]) {
      await test.step(path, async () => {
        await page.goto(`${path}?source=legacy&edit=0`);
        await expect(page).toHaveURL(/\/safety-diary\?/);
        const target = new URL(page.url());
        expect(target.searchParams.get("edit")).toBe("1");
        expect(target.searchParams.get("source")).toBe("legacy");
        await expect(page.getByLabel("作業所名", { exact: true })).toBeVisible();
      });
    }
  });
});
