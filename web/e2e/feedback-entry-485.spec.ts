import { expect, test, type Page } from "@playwright/test";

// 485px幅で自動表示の大きなフィードバックバナー（約150px）がホームと
// コンクリート計算の図・入力欄を覆っていた回帰の、最小の再発防止。
test.use({ viewport: { width: 485, height: 900 } });

async function openAsEligibleVisitor(page: Page, path: string) {
  await page.addInitScript(() => {
    window.localStorage.setItem("anzen-usage-score-v1", "40");
    window.localStorage.setItem("anzen-page-view-count-v1", "5");
  });
  await page.clock.install();
  await page.goto(path);
  // 補助UIは DeferredMainEnhancements が15秒後に読み込む。
  await page.clock.fastForward(16_000);
}

test("home: feedback is a small in-flow entry that never opens by itself", async ({ page }) => {
  await openAsEligibleVisitor(page, "/");
  const toggle = page.getByRole("button", { name: "ご意見をお聞かせください" });
  await expect(toggle).toBeAttached();
  await expect(page.getByRole("dialog", { name: /ご意見/ })).toHaveCount(0);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  const position = await toggle.evaluate((element) => {
    let node: Element | null = element;
    while (node) {
      const value = getComputedStyle(node).position;
      if (value === "fixed" || value === "sticky") return value;
      node = node.parentElement;
    }
    return "in-flow";
  });
  expect(position).toBe("in-flow");
  const box = await toggle.boundingBox();
  expect(box?.height ?? 0).toBeLessThanOrEqual(60);

  await toggle.scrollIntoViewIfNeeded();
  await toggle.click();
  await expect(page.getByRole("link", { name: /改善提案/ })).toHaveAttribute("href", "/feedback");
});

for (const path of [
  "/tools/construction-calculators/concrete-quantity",
  "/construction-calc/concrete-volume",
]) {
  test(`calculator ${path}: no feedback entry over inputs or results`, async ({ page }) => {
    await openAsEligibleVisitor(page, path);
    await expect(page.locator("main").first()).toBeVisible();
    await expect(page.getByText("ご意見をお聞かせください")).toHaveCount(0);
  });
}
