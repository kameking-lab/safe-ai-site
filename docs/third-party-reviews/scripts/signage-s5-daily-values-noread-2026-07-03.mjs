/**
 * サイネージ S5（Fable診断01 T10）無読テスト 2026-07-03
 *
 * ペルソナ: 休憩所の壁掛けTV(1920x1080)を毎日見る現場作業員。「毎日見る理由」があるかを検証する。
 * 検証対象:
 *   1) 常掲価値3タイル（無災害日数・今日の一言・暑さ指数(WBGT)）が結論ストリップ直下に表示される。
 *   2) 無災害日数: 起点日を保存すると経過日数が表示される。
 *   3) 今日の一言: 日付が変わると表示内容（スローガン）が変わる（2日連続比較）。
 *   4) 1画面フィットが崩れていないこと（不可侵条件）。
 *
 * 実行方法（dev はハングするため build+start の本番サーバーで実行する）:
 *   cd web && npm run build && npm run start   # 別ターミナル
 *   cp docs/third-party-reviews/scripts/signage-s5-daily-values-noread-2026-07-03.mjs web/tmp-noread.mjs
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

// ---------------------------------------------------------------------------
console.log("\n■ 常掲価値3タイルが表示される");
await page.goto(`${BASE}/signage?kiosk=1`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-signage-conclusion]", { timeout: 20000 });
await page.waitForTimeout(2000);
{
  const bodyText = await page.evaluate(() => document.body.innerText);
  check("「無災害日数」タイルが表示される", bodyText.includes("無災害日数"));
  check("「今日の一言」タイルが表示される", bodyText.includes("今日の一言"));
  check("「暑さ指数(WBGT)」タイルが表示される", bodyText.includes("暑さ指数"));
}

// ---------------------------------------------------------------------------
console.log("\n■ 無災害日数: 起点日を設定すると経過日数が表示される");
{
  await page.getByText("起点日を設定").click();
  await page.getByLabel("無災害日数の起点日").fill("2026-06-01");
  await page.getByText("保存", { exact: true }).click();
  await page.waitForTimeout(300);
  const bodyText = await page.evaluate(() => document.body.innerText);
  check("設定ボタンが消え日数表示に切り替わる", !bodyText.includes("起点日を設定"));
  check("「起点日を変更」リンクが表示される", bodyText.includes("起点日を変更"));
}

// ---------------------------------------------------------------------------
console.log("\n■ 今日の一言: 日付が変わると内容が変わる（2日連続比較）");
{
  const day1Match = await page.evaluate(() => {
    const el = [...document.querySelectorAll("p")].find((p) => p.previousElementSibling?.textContent === "今日の一言");
    return null;
  });
  // 「今日の一言」ラベルの直後の兄弟要素を本文として取得
  const getSlogan = () =>
    page.evaluate(() => {
      const label = [...document.querySelectorAll("p")].find((p) => p.textContent === "今日の一言");
      return label?.nextElementSibling?.textContent ?? null;
    });

  const day1 = await getSlogan();
  check("1日目のスローガンが取得できる", !!day1, `day1=${day1}`);

  // Playwright Clock API で翌日に固定してリロード
  await page.clock.install({ time: new Date() });
  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
  await page.clock.setFixedTime(tomorrow);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-signage-conclusion]", { timeout: 20000 });
  await page.waitForTimeout(1000);
  const day2 = await getSlogan();
  check("2日目のスローガンが取得できる", !!day2, `day2=${day2}`);
  check("翌日にはスローガンの内容が変わる", day1 !== day2, `day1=${day1} day2=${day2}`);
}

// ---------------------------------------------------------------------------
console.log("\n■ 1画面フィット（不可侵）が崩れていない");
{
  const fit = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
  }));
  check(
    "scrollHeight <= viewport(1080)",
    fit.scrollHeight <= fit.viewportHeight + 2,
    `scrollHeight=${fit.scrollHeight} viewport=${fit.viewportHeight}`,
  );
}

await page.screenshot({ path: "docs/third-party-reviews/scripts/signage-s5-daily-values-2026-07-03.png" });
await browser.close();

console.log(`\n合計: ${pass}/${pass + fail} PASS`);
if (fail > 0) {
  console.log("失敗:");
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
