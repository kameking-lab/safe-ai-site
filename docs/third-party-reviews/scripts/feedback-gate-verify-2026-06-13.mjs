// FeedbackGateModal 非ブロッキング化の挙動検証（第三者レビュー §C 是正）。
// 検証項目:
//  1) 利用スコアを満たした状態で /accidents に下部バナーが出る（aria-modal でない・背景暗転なし）
//  2) バナーが本文を覆っていない（中央モーダルでない＝下部に位置）
//  3) /ky/paper（作業画面）ではバナーが出ない
//  4) print:hidden クラスが付いている（印刷時に消える）
// 使い方: node scripts/feedback-gate-verify.mjs  （prod server localhost:3000 必須）
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const VP = { width: 390, height: 844 }; // iPhone 12 相当

// localStorage を「ゲート発火条件を満たす」状態に仕込む。
// score>=20 かつ PV>=3。snooze / dismissed / submitted は無し。
function seedScript() {
  return `(() => {
    try {
      localStorage.setItem('anzen-usage-score-v1', '50');
      localStorage.setItem('anzen-page-view-count-v1', '5');
      localStorage.removeItem('anzen-feedback-gate-snoozed-until-v1');
      localStorage.removeItem('anzen-feedback-gate-dismissed-v1');
      localStorage.removeItem('anzen-feedback-gate-submitted-v1');
    } catch (e) {}
  })();`;
}

let pass = 0;
let fail = 0;
function check(name, cond) {
  if (cond) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${name}`);
  }
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: VP, serviceWorkers: "block" });
const page = await ctx.newPage();

// localStorage を立てるため一旦アクセス → seed → リロード
await page.goto(`${BASE}/accidents`, { waitUntil: "domcontentloaded" });
await page.addInitScript(seedScript());
await page.goto(`${BASE}/accidents`, { waitUntil: "networkidle" });
// マウント1.5秒後に判定 → 余裕をみて待つ
await page.waitForTimeout(2500);

const banner = page.locator('[role="dialog"][aria-labelledby="feedback-gate-title"]');
const appeared = (await banner.count()) > 0 && (await banner.first().isVisible());
check("/accidents: フィードバックバナーが表示される", appeared);

if (appeared) {
  const ariaModal = await banner.first().getAttribute("aria-modal");
  check("aria-modal を持たない（非モーダル）", ariaModal === null);

  const cls = (await banner.first().getAttribute("class")) || "";
  check("背景暗転オーバーレイ（bg-slate-900/60）を使わない", !cls.includes("bg-slate-900/60"));
  check("print:hidden が付与されている", cls.includes("print:hidden"));
  check("下部固定（bottom- を含む）= 中央モーダルでない", cls.includes("bottom-"));

  // バナーが画面下部にあり、本文の最上部を覆っていないこと
  const box = await banner.first().boundingBox();
  check("バナーが画面下半分に位置する（本文を覆わない）", box !== null && box.y > VP.height / 2);

  // 背景の本文がクリック可能＝操作をブロックしていないこと（pointer-events を奪う全画面オーバーレイが無い）
  const overlayCount = await page.locator(".fixed.inset-0").filter({ hasNot: page.locator("nav") }).count();
  // 注: inset-0 全画面要素が "本文を覆う暗幕" として存在しないことの目安（厳密でないため参考表示）
  console.log(`  info  全画面 inset-0 要素数: ${overlayCount}`);
}

// /ky/paper（作業画面）では出ないこと
await page.goto(`${BASE}/ky/paper`, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
const onKy = (await banner.count()) > 0 && (await banner.first().isVisible());
check("/ky/paper（KY記入中）ではバナーを出さない", !onKy);

await browser.close();
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
