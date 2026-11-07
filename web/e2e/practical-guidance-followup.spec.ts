import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 375, height: 812 } });

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

test("脚立を選んだ最初の条件画面で作業台への置換を確認できる", async ({ page }, testInfo) => {
  await page.goto("/goods");
  await page.getByRole("button", { name: "高所・足場の作業", exact: true }).click();
  await page.getByRole("button", { name: /^はしご・脚立/ }).click();
  await expect(page.getByRole("heading", { name: "現場の条件は？", exact: true })).toBeVisible();
  const notice = page.getByText("まず、作業台・足場に置き換えられないか確認してください。", { exact: true });
  await expect(notice).toBeInViewport();
  await expect(page.locator("#goods-guided-selection a[rel*=sponsored]")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await testInfo.attach("ladder-first-check", { body: await page.screenshot(), contentType: "image/png" });
  await page.getByRole("button", { name: "ひとつ戻る", exact: true }).click();
  await expect(notice).toHaveCount(0);
});

test("公的過去事例2件から当該作業の確認資料へ進める", async ({ page }, testInfo) => {
  await page.goto("/accident-news");
  for (const [id, href, label] of [
    ["100003", "https://www.mhlw.go.jp/new-info/kobetu/roudou/gyousei/anzen/dl/170322-1.pdf", "厚労省｜はしご・脚立を使う前の確認（PDF）"],
    ["100005", "https://www.mhlw.go.jp/web/t_doc?dataId=00tc4287&dataType=1&pageNo=1", "厚労省｜墜落制止用器具の安全使用ガイドライン"],
  ]) {
    const note = page.locator('[data-verified-case="' + id + '"]');
    await note.locator("summary").click();
    await expect(note.getByText("自社で先に確認する条件", { exact: true })).toBeVisible();
    const next = note.getByRole("link", { name: label, exact: true });
    await expect(next).toHaveAttribute("href", href);
    await expect(next).toHaveAttribute("rel", "noopener noreferrer");
    await expect(next).toBeVisible();
    await expect(note.getByRole("link", { name: "厚労省 個票No." + id + "で確認", exact: true })).toBeVisible();
    await next.scrollIntoViewIfNeeded();
    await testInfo.attach("case-next-" + id, { body: await page.screenshot(), contentType: "image/png" });
  }
  await expectNoHorizontalOverflow(page);
});

for (const [cas, name, hazard, category] of [
  ["1310-73-2", "水酸化ナトリウム", "皮膚腐食性/刺激性", "区分1"],
  ["108-88-3", "トルエン", "引火性液体", "区分2"],
  ["71-43-2", "ベンゼン", "発がん性", "区分1A"],
]) {
  test(name + "は共通法令より先に物質固有GHSを表示する", async ({ page }, testInfo) => {
    const response = await page.goto("/chemical-database/" + cas);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name, exact: true, level: 1 })).toBeVisible();
    const firstSection = page.locator(".accident-report-print-root > section").first();
    await expect(firstSection.getByRole("heading", { name: "政府版 GHS 主要有害性区分 (NITE)", exact: true })).toBeVisible();
    const row = firstSection.locator("dl > div").filter({ has: page.locator("dt").filter({ hasText: hazard }) });
    await expect(row.locator("dd")).toHaveText(category);
    await expect(firstSection.getByRole("link", { name: "このCASのNITE政府版GHS原典を確認", exact: true })).toHaveAttribute("href", "https://www.chem-info.nite.go.jp/chem/ghs/m-nite-" + cas + ".html");
    await expect(firstSection).toContainText("メーカーの最新製品SDSの第2・3・8項");
    await expectNoHorizontalOverflow(page);
    await row.scrollIntoViewIfNeeded();
    await testInfo.attach("ghs-" + cas, { body: await page.screenshot(), contentType: "image/png" });
  });
}

