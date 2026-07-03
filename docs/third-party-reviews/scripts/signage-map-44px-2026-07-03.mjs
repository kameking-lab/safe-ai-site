// 無読テスト補助: /signage/map ピン管理・サイドパネル操作の実boundingBox 44px確認
// 地震アラートモーダル・ピン削除ボタンは実データ/既存ピンが必要な条件付き要素のため
// vitest のソース走査(signage-map-44px.test.ts)側で class 付与を検証する。
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3111";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`${BASE}/signage/map`, { waitUntil: "networkidle" });

let allPass = true;

async function checkByText(label, selector) {
  const el = page.locator(selector, { hasText: label }).first();
  const box = await el.boundingBox();
  const h = box?.height ?? 0;
  const ok = h >= 44;
  allPass &&= ok;
  console.log(`${ok ? "PASS" : "FAIL"} ${label} height=${h.toFixed(1)}px`);
}

// サイドパネルは既定で開いているはずなので、まず「✕ 閉じる」を確認してから
// 「☰ パネルを開く」を確認できるよう開閉を1往復させる
await checkByText("✕ 閉じる", "button");
await checkByText("← 朝礼ダッシュボードへ", "a");
await checkByText("現在のURLをコピー", "button");
await checkByText("フルスクリーン表示", "a");

// ピン管理フォーム（常時表示）
await checkByText("ピンを追加", "button");
const labelInput = page.locator('input[placeholder="例: 第二現場"]');
const labelBox = await labelInput.boundingBox();
const labelH = labelBox?.height ?? 0;
const labelOk = labelH >= 44;
allPass &&= labelOk;
console.log(`${labelOk ? "PASS" : "FAIL"} ラベル入力欄 height=${labelH.toFixed(1)}px`);

const emailInput = page.locator('input[placeholder="warn@example.jp"]');
const emailBox = await emailInput.boundingBox();
const emailH = emailBox?.height ?? 0;
const emailOk = emailH >= 44;
allPass &&= emailOk;
console.log(`${emailOk ? "PASS" : "FAIL"} 通知メール入力欄 height=${emailH.toFixed(1)}px`);

// パネルを閉じてから「☰ パネルを開く」を確認
await page.locator("button", { hasText: "✕ 閉じる" }).first().click();
await checkByText("☰ パネルを開く", "button");

await browser.close();
process.exit(allPass ? 0 : 1);
