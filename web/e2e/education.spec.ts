import { test, expect } from "@playwright/test";

const subPages = [
  // 法定教育
  { path: "/education/hoteikyoiku/chemical-ra", label: "化学物質リスクアセスメント" },
  { path: "/education/hoteikyoiku/shokucho", label: "職長教育" },
  // 労働衛生
  { path: "/education/roudoueisei/necchu", label: "熱中症予防" },
  { path: "/education/roudoueisei/shindou", label: "振動障害" },
  { path: "/education/roudoueisei/souon", label: "騒音障害" },
  { path: "/education/roudoueisei/youtsu-yobou", label: "腰痛予防" },
  // 特別教育
  { path: "/education/tokubetsu/ashiba", label: "足場" },
  { path: "/education/tokubetsu/fullharness", label: "フルハーネス" },
  { path: "/education/tokubetsu/kensaku-toishi", label: "研削といし" },
  { path: "/education/tokubetsu/sankesu", label: "酸欠・硫化水素" },
  { path: "/education/tokubetsu/tamakake", label: "玉掛け" },
  { path: "/education/tokubetsu/teiatsu-denki", label: "低圧電気" },
];

test("教育トップページが表示される @smoke", async ({ page }) => {
  const res = await page.goto("/education");
  expect(res?.status()).toBeLessThan(400);
  await expect(page.locator("body")).toBeVisible();
});

for (const { path, label } of subPages) {
  test(`教育詳細: ${label} (${path}) が表示される`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
  });
}
