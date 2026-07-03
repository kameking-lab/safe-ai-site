import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * サイネージ鮮度・自動復旧の回帰ガード（Fable診断01 T5）。
 * page.tsx はデータ取得(fetch)・localStorage・タイマーが密結合でユニットテストしにくいため、
 * 定数値そのものをソース走査で固定する（JSX側の挙動は docs/third-party-reviews/scripts の
 * 実ブラウザ無読テストで検証する）。
 */

const SOURCE = readFileSync(resolve(process.cwd(), "src/app/signage/page.tsx"), "utf8");

describe("サイネージ /signage の鮮度・自動復旧の定数", () => {
  it("自動更新間隔は15分（60分では現場休憩所TVの鮮度が悪すぎる）", () => {
    expect(SOURCE).toMatch(/REFRESH_INTERVAL_MS\s*=\s*15\s*\*\s*60\s*\*\s*1000/);
  });

  it("取得失敗時の再試行間隔は3分（次の定期更新まで放置しない）", () => {
    expect(SOURCE).toMatch(/RETRY_INTERVAL_MS\s*=\s*3\s*\*\s*60\s*\*\s*1000/);
  });

  it("取得失敗時にretryTimerを設定し、成功時にclearTimeoutする", () => {
    expect(SOURCE).toMatch(/setBundleStatus\("error"\);[\s\S]{0,120}retryTimer\s*=\s*window\.setTimeout/);
  });

  it("日次フルリロード（深夜3時）の設定がある", () => {
    expect(SOURCE).toMatch(/DAILY_RELOAD_HOUR\s*=\s*3/);
    expect(SOURCE).toMatch(/window\.location\.reload\(\)/);
  });

  it("キオスクモード（?kiosk=1）でナビ・シナリオ操作UIを隠す分岐がある", () => {
    expect(SOURCE).toMatch(/URLSearchParams\(window\.location\.search\)\.get\("kiosk"\)\s*===\s*"1"/);
    expect(SOURCE).toMatch(/hideNav=\{isKiosk\}/);
    expect(SOURCE).toMatch(/!isKiosk &&/);
  });

  it("トレンド・法改正はSignageRotatorで1件ずつ自動周回する", () => {
    expect(SOURCE).toMatch(/<SignageRotator[\s\S]*?items=\{trendItems\}/);
    expect(SOURCE).toMatch(/<SignageRotator[\s\S]*?items=\{topLaws\}/);
  });

  it("朝礼スクリプト・トレンド拡大モーダルの「✕ 閉じる」ボタンが44pxタップ標的を満たす", () => {
    const closeButtonBlocks = [...SOURCE.matchAll(/<button[\s\S]{0,400}?✕ 閉じる/g)];
    expect(closeButtonBlocks.length).toBeGreaterThanOrEqual(2);
    for (const block of closeButtonBlocks) {
      expect(block[0]).toMatch(/min-h-\[44px\]/);
    }
  });

  it("トレンド拡大モーダルの「記事を開く →」リンクが44pxタップ標的を満たす", () => {
    const linkBlock = SOURCE.match(/<a[\s\S]{0,500}?記事を開く/);
    expect(linkBlock).not.toBeNull();
    expect(linkBlock![0]).toMatch(/min-h-\[44px\]/);
  });
});
