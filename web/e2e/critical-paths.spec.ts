import { test, expect } from "@playwright/test";

const pages = [
  { path: "/", label: "トップページ" },
  { path: "/accidents", label: "事故データベース" },
  { path: "/law-search", label: "法改正検索" },
  { path: "/chemical-ra", label: "化学物質RA" },
  { path: "/education", label: "教育" },
  { path: "/chatbot", label: "チャットボット" },
  { path: "/pricing", label: "料金プラン" },
  { path: "/about", label: "概要" },
  { path: "/contact", label: "お問い合わせ" },
];

for (const { path, label } of pages) {
  test(`${label} (${path}) が表示される @smoke`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
  });
}

test("法令検索は初期フォームと第61条の正本確認導線をSSRで表示する @smoke", async ({
  page,
}) => {
  const response = await page.goto(
    "/law-search?law=%E5%8A%B4%E5%83%8D%E5%AE%89%E5%85%A8%E8%A1%9B%E7%94%9F%E6%B3%95&art=%E7%AC%AC61%E6%9D%A1",
  );

  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("searchbox", { name: "法令フリーワード検索" }),
  ).toBeVisible();
  await expect(
    page.getByRole("searchbox", { name: "条番号で検索" }),
  ).toHaveValue("第61条");
  await expect(page.getByText("第61条", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "e-Gov" }).first()).toBeVisible();
});

test("横断検索は結果の種別・一次性・法的位置付け・一致・対象時点・検証状態を明示する @smoke", async ({
  page,
}) => {
  await page.goto("/search?q=%E5%AE%89%E8%A1%9B%E6%B3%95%20%E7%AC%AC61%E6%9D%A1");

  const firstResult = page.locator("main li").filter({ hasText: "第61条" }).first();
  await expect(firstResult).toBeVisible({ timeout: 20_000 });
  await expect(firstResult).toContainText("種別:");
  await expect(firstResult).toContainText("一次資料:");
  await expect(firstResult).toContainText("法的位置付け:");
  await expect(firstResult).toContainText("一致理由:");
  await expect(firstResult).toContainText("一致抜粋:");
  await expect(firstResult).toContainText("更新日・対象時点:");
  await expect(firstResult).toContainText("検証状態:");
});
