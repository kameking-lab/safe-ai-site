import { expect, test, type Page } from "@playwright/test";

// 485px幅で自動表示の大きなフィードバックバナー（約150px）がホームと
// コンクリート計算の図・入力欄を覆っていた回帰の、最小の再発防止。
test.use({ viewport: { width: 485, height: 900 } });

const DEFERRED_LOAD_STEP_MS = 16_000;

async function openAsEligibleVisitor(page: Page, path: string) {
  await page.addInitScript(() => {
    window.localStorage.setItem("anzen-usage-score-v1", "40");
    window.localStorage.setItem("anzen-page-view-count-v1", "5");
  });
  await page.clock.install();
  await page.goto(path);
}

/** 補助UIは DeferredMainEnhancements がhydrate後15秒で読み込む。その遅延を越える分だけ時計を進める。 */
async function advancePastDeferredLoad(page: Page) {
  await page.clock.fastForward(DEFERRED_LOAD_STEP_MS);
}

test("home: feedback is a small in-flow entry that never opens by itself", async ({ page }) => {
  await openAsEligibleVisitor(page, "/");
  const toggle = page.getByRole("button", { name: "ご意見をお聞かせください" });
  // hydrate前に時計を進めても遅延タイマーは未登録なので、実際の入口が現れるまで進め続ける。
  // 現れなければここで失敗する（握りつぶさない）。
  await expect
    .poll(
      async () => {
        await advancePastDeferredLoad(page);
        return toggle.count();
      },
      { timeout: 30_000 },
    )
    .toBe(1);
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

/** hydrate済みを確かめた後、遅延読込の時間を十分に越えても入口が無いことを確認する。 */
async function expectNoFeedbackAfterDeferredWindow(page: Page) {
  for (let step = 0; step < 3; step += 1) {
    await advancePastDeferredLoad(page);
    await page.waitForTimeout(500);
  }
  await expect(page.getByText("ご意見をお聞かせください")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /シェアメニュー/ })).toHaveCount(0);
}

test("calculator /tools/construction-calculators/concrete-quantity: no feedback entry over inputs or results", async ({ page }) => {
  await openAsEligibleVisitor(page, "/tools/construction-calculators/concrete-quantity");
  const resultTitle = page.locator("#calculation-result-title");
  // 空欄開始なので結果は無い。例の数字ボタンはhydrate後にだけ入力を埋め、ブラウザ内で概算する。
  await expect(resultTitle).toHaveCount(0);
  await page.getByRole("button", { name: "例の数字で試す" }).click();
  await expect(resultTitle).toHaveText("結果（例の数字）", { timeout: 15_000 });

  await expectNoFeedbackAfterDeferredWindow(page);
  await expect(resultTitle).toBeVisible();
});

test("calculator /construction-calc/concrete-volume: no feedback entry over inputs or results", async ({ page }) => {
  await openAsEligibleVisitor(page, "/construction-calc/concrete-volume");
  const result = page.locator('[aria-label="計算結果: 発注量を算定"]');
  await expect(result).toBeVisible();
  const before = (await result.innerText()).trim();
  // 制御入力なので、hydrate後でなければ結果は更新されない。AI解説（外部API）は押さない。
  await expect(async () => {
    await page.locator("#calc-field-lengthDim").fill("12");
    await page.locator("#calc-field-widthDim").fill("6");
    await page.locator("#calc-field-heightDim").fill("0.8");
    await expect(result).not.toHaveText(before, { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  await expect(page.locator("#calc-field-lengthDim")).toHaveValue("12");

  await expectNoFeedbackAfterDeferredWindow(page);
  await expect(result).toBeVisible();
});
