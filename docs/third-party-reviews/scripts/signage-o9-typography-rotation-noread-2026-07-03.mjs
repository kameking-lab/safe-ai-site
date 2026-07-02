/**
 * サイネージ O9（Fable診断01 T4+T5）無読テスト 2026-07-03
 *
 * ペルソナ: 休憩所の壁掛けTV(1920x1080)を数メートル先から3秒見る現場監督。
 * 検証対象:
 *   1) キオスクモード(?kiosk=1)で運用UI(ナビ・シナリオ・地点選択・モード切替)が隠れ、
 *      残る文字要素(操作UIを除く)に12px以下が無いこと。
 *   2) トレンド・法改正パネルが自動ローテーションし、DOMが変化し続けること
 *      （6分間観察の代わりに、既定間隔16秒×2周期=約35秒で最低1回の内容変化を確認）。
 *   3) 1画面フィットが崩れていないこと（不可侵条件）。
 *
 * 実行方法（dev はハングするため build+start の本番サーバーで実行する）:
 *   cd web && npm run build && npm run start   # 別ターミナル
 *   cp docs/third-party-reviews/scripts/signage-o9-typography-rotation-noread-2026-07-03.mjs web/tmp-noread.mjs
 *   cd web && node tmp-noread.mjs && rm tmp-noread.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
let pass = 0;
let fail = 0;
const failures = [];

function check(name, cond, detail = "") {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${name}`);
  } else {
    fail += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();

await page.goto(`${BASE}/signage?kiosk=1`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-signage-conclusion]", { timeout: 20000 });
// データ取得完了（トレンド/法改正の描画）を待つ
await page.waitForTimeout(3000);

// ---------------------------------------------------------------------------
console.log("\n■ キオスクモード: 運用UIが隠れている");
{
  const hidden = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    return {
      hasScenario: bodyText.includes("シナリオ："),
      hasPortalLink: !!document.querySelector('a[href="/"]'),
    };
  });
  check("シナリオ操作バーが非表示", !hidden.hasScenario);
  check("ヘッダーの「ポータルへ戻る」リンクが非表示", !hidden.hasPortalLink);
}

// ---------------------------------------------------------------------------
console.log("\n■ フォントサイズ分布: 12px以下が操作UI(button/a/select/input/label)以外で0件");
{
  const distribution = await page.evaluate(() => {
    const OPERATIONAL_TAGS = new Set(["BUTTON", "SELECT", "INPUT", "OPTION"]);
    const offenders = [];
    let smallCount = 0;
    let total = 0;
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const text = (el.textContent ?? "").trim();
      if (!text || el.children.length > 0) continue; // 葉ノードのみ（親の重複カウントを避ける）
      if (el.offsetParent === null && getComputedStyle(el).position !== "fixed") continue; // 非表示(display:none等)は対象外
      const isOperational =
        OPERATIONAL_TAGS.has(el.tagName) ||
        !!el.closest("button, a, select, label, [role='tab']");
      const size = parseFloat(getComputedStyle(el).fontSize);
      total += 1;
      if (size <= 12 && !isOperational) {
        smallCount += 1;
        offenders.push(`${el.tagName}"${text.slice(0, 24)}"=${size}px`);
      }
    }
    return { total, smallCount, offenders };
  });
  check(
    `本文系(操作UI以外)で12px以下が0件 実測${distribution.smallCount}/${distribution.total}件`,
    distribution.smallCount === 0,
    distribution.offenders.slice(0, 15).join(" | "),
  );
}

// ---------------------------------------------------------------------------
console.log("\n■ 不可侵: サイネージ1画面フィット維持（キオスクモードでも）");
{
  const fit = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
  }));
  check(
    `1画面フィット維持 scrollHeight=${fit.scrollHeight} <= viewport=${fit.innerHeight}`,
    fit.scrollHeight <= fit.innerHeight + 1,
  );
}

// ---------------------------------------------------------------------------
console.log("\n■ 自動ローテーション: トレンド・法改正パネルが一定間隔で内容変化する");
{
  const snapshot = async () =>
    page.evaluate(() => {
      const groups = Array.from(document.querySelectorAll("[role='group'][aria-label]"));
      return groups
        .filter((g) => /トレンドニュース|直近の法改正/.test(g.getAttribute("aria-label") ?? ""))
        .map((g) => g.textContent ?? "");
    });

  const before = await snapshot();
  check("ローテーション対象パネル(トレンド/法改正)が見つかる", before.length > 0, JSON.stringify(before));

  // 既定間隔16秒×2周期分待って、最低1回は内容が変わっていることを確認
  await page.waitForTimeout(35000);
  const after = await snapshot();

  const changed = before.some((b, i) => b !== after[i]);
  check(
    "35秒待機後にトレンド/法改正いずれかのDOM内容が変化した",
    changed,
    `before=${JSON.stringify(before)} / after=${JSON.stringify(after)}`,
  );
}

await ctx.close();
await browser.close();

console.log(`\n==== 無読テスト結果: ${pass} PASS / ${fail} FAIL ====`);
if (failures.length) {
  console.log("失敗項目:");
  for (const f of failures) console.log(` - ${f}`);
  process.exit(1);
}
