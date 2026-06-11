/**
 * サイネージ(/signage) 無読テスト 2026-06-11（柱0 ビジュアルファースト）
 *
 * ペルソナ: 「段落を絶対に読まず、色とデカい要素しか見ない」現場監督。
 * 数メートル先のTV(1920x1080)を3秒見て「いまの状態」と「次にやること」が
 * 言えるかを機械検証する。
 *
 * 実行方法（dev はハングするため build+start の本番サーバーで実行する）:
 *   cd web && npm run build && npm run start  # 別ターミナル
 *   cp docs/third-party-reviews/scripts/signage-noread-2026-06-11.mjs web/tmp-noread.mjs
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

/** /api/signage-data のモック応答（型: SignageDataApiResponse） */
function mockBundle({ headline, warnings }) {
  return {
    fetchedAt: "2026-06-11T06:00:00+09:00",
    prefectureLevels: headline ? { "JP-13": "warning" } : {},
    laborTrend: [
      {
        title: "テスト用ニュース見出し｜テスト媒体",
        link: "https://example.com/news/1",
        pubDate: "2026-06-11 05:00",
      },
    ],
    hourly: [
      { time: "2026-06-11T06:00", hourLabel: "6時", tempC: 24, precipMm: 0, weatherCode: 1 },
      { time: "2026-06-11T07:00", hourLabel: "7時", tempC: 26, precipMm: 0, weatherCode: 2 },
    ],
    jmaHeadline: headline,
    jmaReportTime: "2026-06-11T05:30:00+09:00",
    selectedWarnings: warnings,
    locationLabel: "東京（新宿）",
  };
}

async function newPage(browser, bundle) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  if (bundle) {
    await page.route("**/api/signage-data*", (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify(bundle) }),
    );
  }
  await page.goto(`${BASE}/signage`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-signage-conclusion]", { timeout: 20000 });
  return { ctx, page };
}

const browser = await chromium.launch();

// ---------------------------------------------------------------------------
console.log("\n■ シナリオ1: 警報発表中（モック） — 3秒で「停止級」と分かるか");
{
  const headline = "【テスト】東京都では、土砂災害や河川の増水に最大級の警戒をしてください。";
  const { ctx, page } = await newPage(
    browser,
    mockBundle({ headline, warnings: [{ code: "03", status: "大雨警報" }] }),
  );
  // 取得完了（=モック反映）まで待つ: 結論ストリップが slate 以外になる
  await page.waitForFunction(
    () =>
      document.querySelector("[data-signage-conclusion]")?.getAttribute("data-tone") !== "slate",
    { timeout: 20000 },
  );

  const strip = page.locator("[data-signage-conclusion]");
  check("結論ストリップが赤(red)", (await strip.getAttribute("data-tone")) === "red");

  const label = page.locator("[data-signage-conclusion-label]");
  const labelText = (await label.textContent()) ?? "";
  check("主文が「警報 発表中」", labelText.includes("警報 発表中"), labelText);

  const fontSize = await label.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  check(`主文がデカ文字(>=40px) 実測${fontSize}px`, fontSize >= 40);

  const box = await strip.boundingBox();
  check("結論ストリップが画面最上部域(上端<300px)", box !== null && box.y < 300);

  const panelKind = await page
    .locator("[data-warning-panel-kind]")
    .getAttribute("data-warning-panel-kind");
  check("警報パネルがheadline状態", panelKind === "headline");

  const panelClass =
    (await page.locator("[data-warning-panel-kind]").getAttribute("class")) ?? "";
  check("警報パネルが黄(amber)枠", panelClass.includes("amber"));

  await ctx.close();
}

// ---------------------------------------------------------------------------
console.log("\n■ シナリオ2: 警報なし（モック） — 緑/黄のみ・赤の誤発火なし");
{
  const { ctx, page } = await newPage(browser, mockBundle({ headline: null, warnings: [] }));
  await page.waitForFunction(
    () =>
      document.querySelector("[data-signage-conclusion]")?.getAttribute("data-tone") !== "slate",
    { timeout: 20000 },
  );

  const tone = await page.locator("[data-signage-conclusion]").getAttribute("data-tone");
  // 記録なし端末＋警報なし: 高リスク予測(気温依存)が無ければ緑、あれば黄。赤は出てはならない。
  check(`結論ストリップが緑または黄(実測:${tone})`, tone === "green" || tone === "amber");

  const labelText =
    (await page.locator("[data-signage-conclusion-label]").textContent()) ?? "";
  if (tone === "green") {
    check("緑のとき主文が「本日 警報なし」", labelText.includes("警報なし"), labelText);
  } else {
    check("黄のとき主文が高リスク/要対応/確認不能", /高リスク|要対応|確認不能/.test(labelText), labelText);
  }

  const panelKind = await page
    .locator("[data-warning-panel-kind]")
    .getAttribute("data-warning-panel-kind");
  check("警報パネルがnone状態", panelKind === "none");

  const panelClass =
    (await page.locator("[data-warning-panel-kind]").getAttribute("class")) ?? "";
  check("警報なしパネルが緑(emerald)枠（常時黄の是正）", panelClass.includes("emerald"));
  check("警報なしパネルに黄(amber)枠が残っていない", !panelClass.includes("border-amber"));

  // 色文法: 危険アラートバーは平常時は無彩（常時roseの是正）
  const dangerActive = await page
    .locator("[data-danger-active]")
    .getAttribute("data-danger-active");
  check("危険アラートバーが非検知状態(0)", dangerActive === "0");
  const dangerClass = (await page.locator("[data-danger-active]").getAttribute("class")) ?? "";
  check("非検知の危険アラートバーが無彩枠（常時roseの是正）", dangerClass.includes("border-slate-600"));

  // 1画面フィット維持（不可侵）: xl ではページ全体がスクロールしない
  const fit = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
  }));
  check(
    `1画面フィット維持 scrollHeight=${fit.scrollHeight} <= viewport=${fit.innerHeight}`,
    fit.scrollHeight <= fit.innerHeight + 1,
  );

  // タップ対象44px: シナリオ・朝礼・縦横・地図・モード切替ボタン
  const buttons = await page
    .locator(
      "button:has-text('朝礼前'), button:has-text('休憩時間'), button:has-text('退場時'), button:has-text('朝礼スクリプト'), a:has-text('地図サイネージ'), button:has-text('図面'), button:has-text('地図'), button:has-text('作業資料')",
    )
    .all();
  let allTall = buttons.length > 0;
  for (const b of buttons) {
    const bb = await b.boundingBox();
    if (!bb || bb.height < 44) allTall = false;
  }
  check(`主要ボタン${buttons.length}個すべて高さ44px以上`, allTall);

  // 3秒ペルソナ判定: 上端300px以内に「色帯＋デカ文字」があり、説明段落を読まずに状態が言える
  check(
    "無読3秒判定: 色帯(tone)とデカ主文だけで状態が言える",
    (tone === "green" && labelText.includes("警報なし")) ||
      (tone === "amber" && /高リスク|要対応|確認不能/.test(labelText)),
  );

  await ctx.close();
}

// ---------------------------------------------------------------------------
console.log("\n■ シナリオ3: 実データ(モックなし) — 本番経路でも結論ストリップが成立");
{
  const { ctx, page } = await newPage(browser, null);
  const tone = await page.locator("[data-signage-conclusion]").getAttribute("data-tone");
  check(
    `結論ストリップのtoneが定義済み4色のいずれか(実測:${tone})`,
    ["red", "amber", "green", "slate"].includes(tone ?? ""),
  );
  const labelText =
    (await page.locator("[data-signage-conclusion-label]").textContent()) ?? "";
  const toneLabelConsistent =
    (tone === "red" && /警報 発表中|期限超過/.test(labelText)) ||
    (tone === "amber" && /高リスク|要対応|確認不能/.test(labelText)) ||
    (tone === "green" && labelText.includes("警報なし")) ||
    (tone === "slate" && labelText.includes("確認中"));
  check(`tone(${tone})と主文(${labelText})が色文法どおり対応`, toneLabelConsistent);
  await ctx.close();
}

await browser.close();

console.log(`\n==== 無読テスト結果: ${pass} PASS / ${fail} FAIL ====`);
if (failures.length) {
  console.log("失敗項目:");
  for (const f of failures) console.log(` - ${f}`);
  process.exit(1);
}
