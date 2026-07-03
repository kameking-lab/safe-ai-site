// 無読テスト: /glossary 関連ページリンク＋/signage モーダル「✕ 閉じる」ボタンが実機で44px以上のタップ標的を満たすか
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3457";

const browser = await chromium.launch();
let allPass = true;

// /glossary: 用語カードの「法令チャット」関連ページリンク
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${BASE}/glossary`, { waitUntil: "networkidle" });
  const link = page.getByRole("link", { name: /法令チャット/ }).first();
  const box = await link.boundingBox();
  const h = box?.height ?? 0;
  const ok = h >= 44;
  if (!ok) allPass = false;
  console.log(`${ok ? "PASS" : "FAIL"} /glossary 関連ページリンク(法令チャット): height=${h.toFixed(1)}px`);
  await page.close();
}

// /signage: 朝礼スクリプトモーダルの「✕ 閉じる」ボタン
{
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`${BASE}/signage`, { waitUntil: "networkidle" });
  const morningScriptTrigger = page.getByRole("button", { name: /朝礼スクリプト/ }).first();
  if (await morningScriptTrigger.count() > 0) {
    await morningScriptTrigger.click();
    const closeBtn = page.getByRole("button", { name: "閉じる" }).first();
    const box = await closeBtn.boundingBox();
    const h = box?.height ?? 0;
    const ok = h >= 44;
    if (!ok) allPass = false;
    console.log(`${ok ? "PASS" : "FAIL"} /signage 朝礼スクリプトモーダル 閉じるボタン: height=${h.toFixed(1)}px`);
  } else {
    console.log("SKIP /signage 朝礼スクリプトモーダル: 起動トリガーが見つからず（データ未取得等）");
  }
  await page.close();
}

await browser.close();
process.exit(allPass ? 0 : 1);
