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
  { path: "/services", label: "サービス一覧" },
];

for (const { path, label } of pages) {
  test(`${label} (${path}) が表示される @smoke`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
  });
}
