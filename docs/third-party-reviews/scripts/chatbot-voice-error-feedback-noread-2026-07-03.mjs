/**
 * 無読テスト: /chatbot 音声完結モードのエラー握りつぶし是正（柱0・2026-07-03）
 *
 * ペルソナ: 「マイク権限を誤って拒否した」現場作業者（スマホ390×844・音声完結モード）。
 * 背景: 「話して質問する」ボタンは Web Speech API の onerror を () => {} で握りつぶしていた。
 *   マイク権限拒否・無音タイムアウト・ネットワーク断のいずれでもUIが無反応に見え、
 *   ユーザーは「聞き取れていないのか、壊れているのか」を判断できなかった（柱0違反）。
 * 是正: onerror を voice-input-field.tsx の既存 describeVoiceError() に接続し、
 *   ボタン脇に日本語のエラーメッセージ（role=alert）を表示するように変更。
 *
 * 検証:
 *   1) 音声完結モードOFF時はエラー文言が存在しない
 *   2) 音声完結モードON→「話して質問する」タップ→SpeechRecognitionが
 *      onerror("not-allowed") を発火するとマイク権限エラー文言が可視化される
 *   3) 音声完結モードをOFFに戻すとエラー文言が消える（次回に持ち越さない）
 *
 * 実行: cd web && npm run build && PORT=3100 npm run start
 *   BASE_URL=http://localhost:3100 node（webから）このスクリプト
 *   （@playwright/test 解決のため web 配下にコピーして実行）
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const MOBILE = { width: 390, height: 844 };

let pass = 0;
let fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) {
    pass++;
    console.log(`  PASS: ${name}`);
  } else {
    fail++;
    console.log(`  FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
const page = await ctx.newPage();

// マイク権限拒否を即座にonerrorで返すモックSpeechRecognition
await page.addInitScript(() => {
  class MockSpeechRecognition {
    lang = "";
    interimResults = false;
    onresult = null;
    onerror = null;
    start() {
      setTimeout(() => {
        this.onerror?.({ error: "not-allowed" });
      }, 50);
    }
  }
  // @ts-expect-error - テスト用モック注入
  window.webkitSpeechRecognition = MockSpeechRecognition;
});

console.log("\n[/chatbot] 音声完結モードのマイク権限エラー可視化");
await page.goto(`${BASE}/chatbot`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);

// Next.js の #__next-route-announcer__（常時role=alertだが空文字）を除外して数える
const voiceAlerts = page.locator('[role="alert"]:not(#__next-route-announcer__)');

const voiceToggle = page.getByRole("button", { name: /音声で会話する/ });
check("音声完結モードOFF時はエラー文言が存在しない", (await voiceAlerts.count()) === 0);

await voiceToggle.click();
const speakButton = page.getByRole("button", { name: "🎤 話して質問する" });
await speakButton.waitFor({ state: "visible" });
await speakButton.click();

await voiceAlerts.first().waitFor({ state: "visible", timeout: 5000 });
const alertText = (await voiceAlerts.first().innerText()).trim();
check(
  "マイク権限拒否時に日本語エラー文言が可視化される",
  alertText.includes("マイクが許可されていません"),
  alertText,
);

const voiceToggleOff = page.getByRole("button", { name: /音声で会話中/ });
await voiceToggleOff.click();
check("音声完結モードをOFFに戻すとエラー文言が消える", (await voiceAlerts.count()) === 0);

console.log(`\n  無読まとめ: マイクエラーが無反応に見えず、日本語文言で「次にすべきこと」が分かる`);
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);

await browser.close();
process.exit(fail === 0 ? 0 : 1);
