/**
 * 無読テスト（柱0-0 共通視覚言語パイロット・2026-06-10）
 *
 * ペルソナ: 「段落を絶対に読まず、色とデカい要素しか見ない現場の人」
 *   - 50代の現場監督。スマホは見るが、画面の文章は読まない。
 *   - 3秒見て「いまの状態」と「次にやること」が分からなければ閉じる。
 *
 * 判定基準（loop-prompt.txt 社長指示 2026-06-10）:
 *   本文を読まずに3秒画面を見て「いまの状態」「次にやること」を言えるか。
 *   機械化: ①結論カード(role=status)がファーストビュー内 ②数字が40px以上のデカ文字
 *           ③状態色(赤/黄/緑)が塗られている ④次にやること(リスト先頭行 or アクション)が同一ビュー内
 *
 * 実行: web/ 配下に一時コピーして実行（node のモジュール解決が web/node_modules を見るため）
 *   cp docs/third-party-reviews/scripts/visual-language-noread-2026-06-10.mjs web/tmp-noread.mjs
 *   cd web && node tmp-noread.mjs && rm tmp-noread.mjs noread-*.png
 * 前提: dev server (localhost:3000) 起動済み
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const results = [];
const ok = (name, cond, detail = "") => {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
};

// 期限超過1件（パトロール指摘・期日昨日）＋使用不可の機械1台 を持つ端末を再現
function seedStorage() {
  const today = new Date();
  const yest = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);
  const date = new Date(today.getTime() - 3 * 86400000).toISOString().slice(0, 10);
  const finding = {
    id: "f1",
    location: "3F 開口部",
    content: "手すり欠落",
    severity: "high",
    owner: "山田",
    due: yest,
    resolved: false,
  };
  const rec = {
    id: "p1",
    date,
    time: "10:00",
    inspector: "佐藤",
    role: "安全管理者",
    area: "全域",
    checks: [],
    findings: [finding],
    summary: "",
    savedAt: new Date(date).toISOString(),
  };
  localStorage.setItem("safe-ai:patrol-by-id:v1", JSON.stringify({ p1: rec }));
  localStorage.setItem(
    "safe-ai:patrol-list:v1",
    JSON.stringify([
      { id: "p1", date, inspector: "佐藤", area: "全域", ngCount: 0, findingCount: 1, openCount: 1, savedAt: rec.savedAt },
    ]),
  );
  localStorage.setItem(
    "safe-ai:inspection-list:v1",
    JSON.stringify([
      { id: "i1", date, site: "A現場", equipKind: "forklift", equipName: "FL-01", ngCount: 1, usable: false, savedAt: rec.savedAt },
    ]),
  );
}

const main = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // iPhone幅

  // --- シナリオ1: 要対応あり（期限超過1件・使用不可1台）の /site-records ---
  await page.addInitScript(seedStorage);
  await page.goto(`${BASE}/site-records`, { waitUntil: "networkidle" });
  const card = page.getByRole("status", { name: /いまの状態/ });
  await card.waitFor({ state: "visible", timeout: 15000 });
  const cardBox = await card.boundingBox();
  ok("結論カードがファーストビュー内（スマホ844px）", cardBox && cardBox.y + 40 < 844, `y=${cardBox?.y}`);
  ok("いまの状態=期限超過 を色とラベルで表示", (await card.textContent())?.includes("期限超過"));

  const big = card.locator("span").first();
  const fontSize = await big.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  ok("デカ数字（40px以上）", fontSize >= 40, `${fontSize}px`);

  const cardClass = (await card.getAttribute("class")) || "";
  ok("状態色=赤（JIS安全色の文法）", cardClass.includes("rose"));

  // 次にやること: 結論カード直下のリスト先頭行（具体アクション=期限超過の指摘是正）が同一ビュー内
  const firstAction = page.locator("a", { hasText: "手すり欠落" }).first();
  const actBox = await firstAction.boundingBox();
  ok("次にやること（先頭アクション行）が同一ビュー内", actBox && actBox.y < 844, `y=${actBox?.y}`);

  // タイル: 使用不可の機械（点検）=赤 トーン（停止級は赤・要対応は黄の文法）
  const tile = page.locator("a", { hasText: "使用不可の機械（点検）" }).first();
  await tile.scrollIntoViewIfNeeded();
  ok("使用不可の機械タイルが赤トーン", ((await tile.getAttribute("class")) || "").includes("rose"));

  await page.screenshot({ path: "noread-site-records-danger.png", fullPage: false });

  // --- シナリオ2: 記録はあるが要対応ゼロ → 緑のOKカード ---
  const page2 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page2.addInitScript(() => {
    const date = new Date().toISOString().slice(0, 10);
    localStorage.setItem(
      "safe-ai:inspection-list:v1",
      JSON.stringify([{ id: "i1", date, site: "A現場", equipKind: "forklift", equipName: "FL-01", ngCount: 0, usable: true, savedAt: new Date().toISOString() }]),
    );
  });
  await page2.goto(`${BASE}/site-records`, { waitUntil: "networkidle" });
  const safeCard = page2.getByRole("status", { name: /いまの状態/ });
  await safeCard.waitFor({ state: "visible", timeout: 15000 });
  ok("要対応ゼロは緑のOKカード", (((await safeCard.getAttribute("class")) || "").includes("emerald")) && ((await safeCard.textContent()) || "").includes("要対応なし"));
  await page2.screenshot({ path: "noread-site-records-safe.png" });

  // --- シナリオ3: トップ「本日の安全トピック」気象バッジ（警報=赤/注意報=黄/なし=緑） ---
  const page3 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page3.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const badge = page3.locator("text=/警報 発表中|注意報のみ|警報・注意報なし/").first();
  await badge.waitFor({ state: "visible", timeout: 15000 });
  const badgeText = await badge.textContent();
  const badgeClass = (await badge.evaluate((el) => el.closest("span")?.className)) || "";
  const grammarOk =
    (badgeText?.includes("警報 発表中") && badgeClass.includes("rose")) ||
    (badgeText?.includes("注意報のみ") && badgeClass.includes("amber")) ||
    (badgeText?.includes("警報・注意報なし") && badgeClass.includes("emerald"));
  ok("トップ気象バッジが色文法どおり", grammarOk, `${badgeText} / ${badgeClass.slice(0, 60)}`);

  await browser.close();
  const fails = results.filter((r) => !r.pass);
  console.log(`\n${results.length - fails.length}/${results.length} PASS`);
  process.exit(fails.length ? 1 : 0);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
