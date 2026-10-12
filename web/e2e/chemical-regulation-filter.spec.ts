import { expect, test } from "@playwright/test";

test("有機則第二種の検索結果から、同じ区分と根拠を持つトルエン詳細を開ける", async ({ page }) => {
  await page.goto("/chemical-database", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "有機則 第二種", exact: true }).first().click();
  await expect(page.getByRole("status", { name: /収録情報に一致/ })).toContainText(
    "各法令の全対象を網羅する一覧ではありません",
  );

  const toluene = page.getByRole("row", { name: /108-88-3/ });
  await expect(toluene).toBeVisible();
  await expect(toluene.getByRole("button", { name: "有機則 第二種", exact: true })).toBeVisible();
  await toluene.getByRole("link", { name: "開く", exact: true }).click();

  await expect(page).toHaveURL(/\/chemical-database\/108-88-3$/);
  await expect(page.getByRole("heading", { name: "トルエン", exact: true })).toBeVisible();
  await expect(page.getByText(/有機則：第二種有機溶剤/)).toBeVisible();
  await expect(page.getByText(/別表第6の2第37号/)).toBeVisible();
});

test("規制情報のAND/ORと0件の注意を保ち、収録済み物質をDB未収録と表示しない", async ({ page }) => {
  await page.goto("/chemical-database", { waitUntil: "domcontentloaded" });
  await page.getByRole("searchbox", { name: "物質名・CAS番号で検索", exact: true }).fill("108-88-3");
  await page.getByRole("button", { name: "有機則 第二種", exact: true }).first().click();
  await page.getByRole("button", { name: "特化則 第二類", exact: true }).first().click();

  const empty = page.getByRole("status", { name: /検索結果0件/ });
  await expect(empty).toBeVisible();
  await expect(empty).toContainText("規制対象外の判定ではありません");
  await expect(page.getByText(/統合DB.*物質に見つかりません/)).toHaveCount(0);
  await expect(page.getByRole("row", { name: /108-88-3/ })).toHaveCount(0);

  await page.getByRole("button", { name: "いずれか (OR)", exact: true }).click();
  await expect(page.getByRole("row", { name: /108-88-3/ })).toBeVisible();
  await page.getByRole("button", { name: "クリア", exact: true }).click();
  await expect(page.getByRole("row", { name: /108-88-3/ })).toBeVisible();
});
