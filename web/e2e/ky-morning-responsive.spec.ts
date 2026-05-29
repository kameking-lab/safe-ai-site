import { expect, test } from "@playwright/test";

// P0: サイネージ /ky/morning が表示系デバイスで「1画面に収まる」ことを回帰固定する。
const SAMPLE_RECORD = {
  workDateYear: "2026",
  workDateMonth: "5",
  workDateDay: "29",
  weather: "晴れ",
  workRows: [{ workDetail: "3階 鉄骨建方・ボルト本締め", workPlace: "A棟 3階東側" }],
  riskRows: [
    { hazard: "高所からの墜落（足場端部・開口部）", reduction: "親綱設置・フルハーネス常時使用" },
    { hazard: "吊り荷の落下・挟まれ", reduction: "立入禁止区画設定・合図者配置" },
    { hazard: "熱中症（気温上昇）", reduction: "WBGT測定・こまめな水分補給" },
  ],
  teamGoal: "ヨシ！で確認、無災害でいこう",
  pointingCall: "足元ヨシ！ 安全帯ヨシ！ 周囲ヨシ！",
};

test.describe("ky-morning レスポンシブ（1画面フィット）", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript((rec) => {
      try {
        localStorage.setItem("ky-record", JSON.stringify(rec));
      } catch {}
    }, SAMPLE_RECORD);
  });

  for (const [w, h, label] of [
    [1920, 1080, "デスクトップ"],
    [1366, 768, "ノートPC"],
    [844, 390, "スマホ横"],
  ] as const) {
    test(`${label} ${w}x${h} は縦オーバーフローしない @smoke`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/ky/morning");
      // 主作業が見えること（描画確認）
      await expect(page.getByText("本日の主な作業")).toBeVisible();
      // fit縮尺が落ち着くと overflow-hidden により 1画面に収まる（誤差許容 8px）。
      // タイミング揺らぎに強いよう poll で待つ。
      await expect
        .poll(
          async () =>
            page.evaluate(
              () => document.documentElement.scrollHeight - window.innerHeight,
            ),
          { timeout: 8000 },
        )
        .toBeLessThanOrEqual(8);
    });
  }
});
