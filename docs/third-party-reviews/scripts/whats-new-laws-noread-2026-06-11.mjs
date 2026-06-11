/**
 * 無読テスト（柱0-0 社長指示 2026-06-10）: /whats-new・/laws・トップの新着タイル
 *
 * ペルソナ: 「段落を絶対に読まず色とデカい要素しか見ない」現場監督。
 * 3秒見て「いまの状態」（施行間近？新着ある？）と「次にやること」が言えなければ不合格。
 *
 * 実行方法（dev はハングするため build+start の本番サーバーで実行する）:
 *   cd web && npm run build && npm run start  # 別ターミナル
 *   cp docs/third-party-reviews/scripts/whats-new-laws-noread-2026-06-11.mjs web/tmp-noread.mjs
 *   cd web && node tmp-noread.mjs && rm tmp-noread.mjs noread-*.png
 *
 * 判定基準:
 *  ① 結論カード(role="status")がファーストビュー内（top+高さが 884px 以内）
 *  ② デカ数字 40px 以上
 *  ③ 状態色が safety-tone トークンどおり（warning=amber / info=sky / safe=emerald。赤は出ない）
 *  ④ 次にやること（結論カードのアクション or 直下のフィルタ）が同一ビュー内・44px 以上
 *  ⑤ アイコンファースト: カテゴリ・業種チップ、法令ナビのタブに SVG アイコンがある
 *  ⑥ 初期表示は30件以内＋「もっと見る」で全件に到達（情報は消えていない）
 *  ⑦ トップの新着タイル: 未読があると件数バッジが点灯し、/whats-new を見ると消える
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const results = [];
const ok = (name, cond, detail = "") => {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

// ---------- 1) /whats-new ----------
await page.goto(`${BASE}/whats-new`, { waitUntil: "networkidle" });

const card = page.locator('section[role="status"]').first();
ok("WN-1 結論カードが存在する", (await card.count()) === 1);
const box = await card.boundingBox();
ok(
  "WN-2 結論カードがファーストビュー内（+40px）",
  box && box.y + box.height <= 884,
  box ? `bottom=${Math.round(box.y + box.height)}px` : "not found",
);

// ② デカ数字
const bigNum = card.locator("span.text-5xl").first();
if ((await bigNum.count()) > 0) {
  const fs = await bigNum.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  ok("WN-3 デカ数字 40px 以上", fs >= 40, `${fs}px`);
} else {
  // 数字なし（アイコン主役）の状態も仕様上あり得る
  ok("WN-3 デカ数字 40px 以上（アイコン主役のため対象外）", true, "value無しトーン");
}

// ③ 色文法: warning=amber / info=sky / safe=emerald のどれか。rose（赤）は禁止
const cls = (await card.getAttribute("class")) || "";
const toneName = cls.includes("amber") ? "warning(黄)" : cls.includes("sky") ? "info(青)" : cls.includes("emerald") ? "safe(緑)" : "不明";
ok("WN-4 状態色がトークンどおり（amber/sky/emerald）", /amber|sky|emerald/.test(cls), toneName);
ok("WN-5 新着系に赤（rose）を使っていない", !cls.includes("rose"));

// タイトルが体言止め短ラベル（aria-label="いまの状態: 〇〇" で機械検証）
const ariaTitle = ((await card.getAttribute("aria-label")) || "").replace("いまの状態: ", "");
ok("WN-6 短ラベルが「施行間近/新着あり/新着なし」のどれか", ["施行間近", "新着あり", "新着なし"].includes(ariaTitle), ariaTitle);
const title = ariaTitle;

// ④ 次にやること: 結論カードのアクション（warning/info時）が44px以上
const action = card.locator("a");
if ((await action.count()) > 0) {
  const ab = await action.first().boundingBox();
  ok("WN-7 次にやること（アクション）が44px以上・ビュー内", ab && ab.height >= 44 && ab.y < 844, ab ? `h=${Math.round(ab.height)}px y=${Math.round(ab.y)}` : "");
} else {
  ok("WN-7 次にやること（safeトーンはアクション無しが仕様）", (title || "").trim() === "新着なし");
}

// ⑤ アイコンファースト: カテゴリチップにSVG
const catChips = page.locator('[aria-label="カテゴリフィルタ"] button');
const catCount = await catChips.count();
const catSvg = await page.locator('[aria-label="カテゴリフィルタ"] button svg').count();
ok("WN-8 カテゴリチップ全てにアイコン", catCount > 0 && catSvg === catCount, `${catSvg}/${catCount}`);
const chipBox = await catChips.first().boundingBox();
ok("WN-9 チップのタップ対象44px以上", chipBox && chipBox.height >= 44, chipBox ? `h=${Math.round(chipBox.height)}px` : "");
const indSvg = await page.locator('[aria-label="業種フィルタ"] button svg').count();
ok("WN-10 業種チップにピクトグラム", indSvg >= 5, `${indSvg}個`);

// ⑥ 初期30件＋もっと見る
const itemCount = await page.locator("#news-list > li").count();
ok("WN-11 初期表示が30件以内", itemCount <= 30, `${itemCount}件`);
const moreBtn = page.locator('button:has-text("もっと見る")');
ok("WN-12 「もっと見る」ボタンがある", (await moreBtn.count()) === 1);
const restText = await moreBtn.textContent().catch(() => "");
await moreBtn.click();
await page.waitForTimeout(300);
const allCount = await page.locator("#news-list > li").count();
ok("WN-13 もっと見るで全件に到達（情報は消えていない）", allCount > itemCount, `${itemCount}→${allCount}件 (${(restText || "").trim()})`);

// 文字ダイエット: RSS等は折りたたみに格納されているが消えていない
const fold = page.locator("details", { hasText: "RSS購読" }).first();
ok("WN-14 説明・RSSは折りたたみへ格納（消えていない）", (await fold.count()) === 1);
const rssVisibleBefore = await page.locator('a[href="/feed/news.xml"]').isVisible();
await fold.locator("summary").click();
const rssVisibleAfter = await page.locator('a[href="/feed/news.xml"]').isVisible();
ok("WN-15 折りたたみを開くとRSSリンクが出る", !rssVisibleBefore && rssVisibleAfter);

await page.screenshot({ path: "noread-whats-new.png" });

// 業種選択の記憶
await page.locator('[aria-label="業種フィルタ"] button', { hasText: "建設" }).first().click();
await page.reload({ waitUntil: "networkidle" });
const constructionActive = await page
  .locator('[aria-label="業種フィルタ"] button', { hasText: "建設" })
  .first()
  .getAttribute("aria-pressed");
ok("WN-16 業種の選択が再訪時も記憶される", constructionActive === "true");

// ---------- 2) /laws ----------
await page.goto(`${BASE}/laws`, { waitUntil: "networkidle" });
const lawCard = page.locator('section[role="status"]').first();
ok("LW-1 結論カードが存在する", (await lawCard.count()) === 1);
const lawBox = await lawCard.boundingBox();
ok("LW-2 結論カードがファーストビュー内", lawBox && lawBox.y + lawBox.height <= 884, lawBox ? `bottom=${Math.round(lawBox.y + lawBox.height)}px` : "");
const lawCls = (await lawCard.getAttribute("class")) || "";
ok("LW-3 状態色がトークンどおり", /amber|sky|emerald/.test(lawCls));
const lawTitle = ((await lawCard.getAttribute("aria-label")) || "").replace("いまの状態: ", "");
ok("LW-4 短ラベルが「施行間近/施行待ち/施行間近なし」", ["施行間近", "施行待ち", "施行間近なし"].includes(lawTitle), lawTitle);
const lawNum = lawCard.locator("span.text-5xl").first();
if ((await lawNum.count()) > 0) {
  const fs = await lawNum.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  ok("LW-5 デカ数字 40px 以上", fs >= 40, `${fs}px`);
} else {
  ok("LW-5 デカ数字（value無しトーンのため対象外）", true);
}
// 黄のときは「最短: 〇〇（あとN日）」で固有名と日数が見える
const lawDesc = (await lawCard.textContent()) || "";
if (lawCls.includes("amber")) {
  ok("LW-6 施行間近のとき最短の改正名＋残日数が見える", /最短:.*あと\d+日/.test(lawDesc), lawDesc.slice(0, 80));
} else {
  ok("LW-6 （黄以外のため対象外）", true, (lawTitle || "").trim());
}
// 法令ナビのアイコンファースト
const navTabs = page.locator('nav[aria-label="法令ツールナビ"] a');
const navCount = await navTabs.count();
const navSvg = await page.locator('nav[aria-label="法令ツールナビ"] a svg').count();
ok("LW-7 法令ナビ全タブにアイコン", navCount === 6 && navSvg === 6, `${navSvg}/${navCount}`);
const navBox = await navTabs.first().boundingBox();
ok("LW-8 ナビタブのタップ対象44px以上", navBox && navBox.height >= 44, navBox ? `h=${Math.round(navBox.height)}px` : "");
await page.screenshot({ path: "noread-laws.png" });

// ---------- 3) トップの新着タイルバッジ ----------
// 前回訪問を2020年に偽装 → 未読大量 → バッジ点灯
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.evaluate(() => window.localStorage.setItem("anzen_whatsnew_last_visit_v1", "2020-01-01"));
await page.reload({ waitUntil: "networkidle" });
const badge = page.locator('a[href="/whats-new"] ~ span[aria-label$="件"], li:has(a[href="/whats-new"]) > span').first();
await page.waitForTimeout(500);
const badgeVisible = await badge.isVisible().catch(() => false);
const badgeText = badgeVisible ? ((await badge.textContent()) || "").trim() : "";
ok("HM-1 未読があると新着タイルにバッジ点灯", badgeVisible && badgeText.length > 0, `表示=${badgeText}`);
const badgeCls = badgeVisible ? (await badge.getAttribute("class")) || "" : "";
ok("HM-2 バッジは青（情報）＝赤を乱用しない", badgeCls.includes("sky"));

// /whats-new を見る → トップへ戻る → バッジが消える（今日以降の新着のみ残る想定＝0件）
await page.goto(`${BASE}/whats-new`, { waitUntil: "networkidle" });
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
const badgeAfter = await page.locator('li:has(a[href="/whats-new"]) > span').first().isVisible().catch(() => false);
ok("HM-3 新着ハブ閲覧後はバッジが消える", !badgeAfter);
await page.screenshot({ path: "noread-home-badge.png" });

await browser.close();

const fails = results.filter((r) => !r.pass);
console.log(`\n==== 無読テスト結果: ${results.length - fails.length}/${results.length} PASS ====`);
if (fails.length > 0) {
  console.log("不合格:", fails.map((f) => f.name).join(", "));
  process.exit(1);
}
