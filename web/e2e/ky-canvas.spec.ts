import { expect, test, type Page } from "@playwright/test";

/**
 * F1（KY用紙 直接操作UI・方式確立）の完了条件を回帰固定する。
 *   1) /ky/paper?canvas=1 の初期表示で用紙全体が1画面に収まる（PC/スマホ）
 *   2) Ctrl+ホイールとピンチ（2ポインタ）とボタンで拡縮できる
 *   3) セルタップ→エディタで入力→用紙に反映→localStorage(ky-record)へ自動保存
 */

async function gotoCanvas(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("anzen-onboarding-v1-seen", "1");
    localStorage.removeItem("ky-record");
  });
  await page.goto("/ky/paper?canvas=1");
  // 初回フィット計算が済むと用紙が可視になる
  await expect(page.getByTestId("paper-stage-content")).toBeVisible();
}

/** 用紙（content）の描画上の bbox がビューポート内に完全に収まっているか */
async function expectPaperFullyVisible(page: Page) {
  const box = await page.getByTestId("paper-stage-content").boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height + 1);
  // 「見えている」だけでなく大きく（豆粒でなく）表示されている。縦A4の用紙は
  // PC（横長）では高さ支配・スマホ（縦長）では幅支配でフィットするため、支配軸の
  // どちらかが画面の大半を占めていることを要件とする（縦の高さ%固定は横フィット時に
  // 不当に厳しく、実測で用紙は幅の94%を占めていた）。
  const fillsWidth = box!.width >= viewport!.width * 0.6;
  const fillsHeight = box!.height >= viewport!.height * 0.4;
  expect(fillsWidth || fillsHeight).toBe(true);
}

test.describe("KY用紙キャンバスβ（F1 方式確立）", () => {
  test("PC(1440x900): 初期表示で用紙全体が1画面に収まる", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoCanvas(page);
    await expectPaperFullyVisible(page);
  });

  test("スマホ(390x844): 初期表示で用紙全体が1画面に収まる", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoCanvas(page);
    await expectPaperFullyVisible(page);
  });

  test("Ctrl+ホイールで拡大・ボタンで縮小・「全体」でフィットに戻る", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoCanvas(page);
    const readScale = async () =>
      Number((await page.getByTestId("paper-stage-scale").innerText()).replace("%", ""));
    const initial = await readScale();

    // Ctrl+ホイール（トラックパッドのピンチも同経路）で拡大
    await page.getByTestId("paper-stage-viewport").evaluate((el) => {
      const rect = el.getBoundingClientRect();
      el.dispatchEvent(
        new WheelEvent("wheel", {
          deltaY: -240,
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
        })
      );
    });
    await expect.poll(readScale).toBeGreaterThan(initial);

    // ボタンで縮小
    const zoomed = await readScale();
    await page.getByRole("button", { name: "縮小" }).click();
    await expect.poll(readScale).toBeLessThan(zoomed);

    // 「全体」でフィット倍率へ復帰＝用紙全体が再び1画面に収まる
    await page.getByRole("button", { name: "全体を表示" }).click();
    await expectPaperFullyVisible(page);
  });

  test("ピンチ（2ポインタ）で拡大できる", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoCanvas(page);
    const readScale = async () =>
      Number((await page.getByTestId("paper-stage-scale").innerText()).replace("%", ""));
    const initial = await readScale();

    await page.getByTestId("paper-stage-viewport").evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const opts = { bubbles: true, cancelable: true, pointerType: "touch" as const };
      // 2本指を置く（間隔80px）→ 開く（間隔240px）＝3倍ピンチ（maxScaleでクランプ）
      el.dispatchEvent(new PointerEvent("pointerdown", { ...opts, pointerId: 11, clientX: cx - 40, clientY: cy }));
      el.dispatchEvent(new PointerEvent("pointerdown", { ...opts, pointerId: 12, clientX: cx + 40, clientY: cy }));
      el.dispatchEvent(new PointerEvent("pointermove", { ...opts, pointerId: 11, clientX: cx - 120, clientY: cy }));
      el.dispatchEvent(new PointerEvent("pointermove", { ...opts, pointerId: 12, clientX: cx + 120, clientY: cy }));
      el.dispatchEvent(new PointerEvent("pointerup", { ...opts, pointerId: 11, clientX: cx - 120, clientY: cy }));
      el.dispatchEvent(new PointerEvent("pointerup", { ...opts, pointerId: 12, clientX: cx + 120, clientY: cy }));
    });
    await expect.poll(readScale).toBeGreaterThan(initial);
  });

  test("セルタップ→入力→用紙に反映→自動保存（方式確立の本丸）", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoCanvas(page);

    // 未記入の現場名セルをタップ → エディタが開く
    await page.getByRole("button", { name: "現場名を入力" }).click();
    const sheet = page.getByTestId("field-editor-sheet");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText("現場名", { exact: true })).toBeVisible();

    // 入力すると用紙（紙上のセル）に即時反映される
    await sheet.locator("input").first().fill("E2Eビル新築工事");
    await expect(
      page.getByTestId("paper-stage-content").getByText("E2Eビル新築工事")
    ).toBeVisible();

    // 「次の欄へ」で紙の記入順を辿れる
    await sheet.getByRole("button", { name: "次の欄へ →" }).click();
    await expect(sheet.getByText("工事名・工区", { exact: true })).toBeVisible();
    await sheet.getByRole("button", { name: "閉じる" }).click();
    await expect(sheet).toBeHidden();

    // 自動保存（1秒デバウンス）で localStorage の ky-record に載る
    await expect
      .poll(async () => {
        const raw = await page.evaluate(() => localStorage.getItem("ky-record"));
        return raw ?? "";
      })
      .toContain("E2Eビル新築工事");
  });

  test("O10（第五弾・既定切替）: /ky/paper への通常アクセス（クエリ無し）で既定表示がキャンバスになる", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem("anzen-onboarding-v1-seen", "1");
      localStorage.removeItem("ky-record");
    });
    await page.goto("/ky/paper");
    await expect(page.getByTestId("paper-stage-content")).toBeVisible();
    expect(page.url()).not.toContain("canvas=");
  });

  test("「従来表示」で旧UIに戻れ、「新しい表示へ」で既定表示に戻れる（?canvas=0で旧UIも維持）", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem("anzen-onboarding-v1-seen", "1");
    });
    await page.goto("/ky/paper");
    await expect(page.getByTestId("paper-stage-content")).toBeVisible();

    await page.getByRole("button", { name: "従来表示" }).click();
    await expect(page.getByTestId("paper-stage-content")).toHaveCount(0);
    expect(page.url()).toContain("canvas=0");

    // 明示的な旧UI指定（?canvas=0）は再読込しても保たれる（共有リンク・ブックマーク互換）。
    await page.reload();
    await expect(page.getByTestId("paper-stage-content")).toHaveCount(0);

    await page.getByRole("button", { name: "新しい表示へ" }).click();
    await expect(page.getByTestId("paper-stage-content")).toBeVisible();
    expect(page.url()).not.toContain("canvas=0");
  });

  test("既定表示（キャンバス）からも保存主ボタン・「…」その他操作（複製/共有/転記/印刷）・元請確認欄に到達できる（機能パリティ）", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoCanvas(page);

    await expect(page.getByRole("button", { name: "保存" })).toBeVisible();
    await page.getByRole("button", { name: "その他の操作（複製・共有・転記・印刷）" }).click();
    const sheet = page.getByRole("menu", { name: "その他の操作" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText("↻ 前回を複製")).toBeVisible();
    await expect(sheet.getByRole("menuitem", { name: /朝礼サイネージへ/ })).toBeVisible();
    await expect(sheet.getByText("印刷プレビュー")).toBeVisible();
    await page.getByRole("button", { name: "閉じる" }).click();
    await expect(sheet).toBeHidden();

    await expect(page.getByText("元請確認・承認")).toBeVisible();
  });
});
