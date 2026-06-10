/**
 * 無読テスト（柱0-1 KY用紙＋朝礼サイネージ・2026-06-10）
 * 雛形: visual-language-noread-2026-06-10.mjs（柱0-0）
 *
 * ペルソナ: 「段落を絶対に読まず、色とデカい要素しか見ない現場の人」
 *   - 50代の職長。毎朝KYを書くが、画面の説明文は読まない。
 *   - 3秒見て「いまの状態」と「次にやること」が分からなければ紙に戻る。
 *
 * 判定（docs/visual-language-2026-06-10.md §4）:
 *   ①結論カード(role=status)がスマホ390×844のファーストビュー内
 *   ②デカ数字40px以上 ③状態色がトークンの文法どおり ④次にやることが同一ビュー内
 *   サイネージは1280×800（朝礼TV想定）でリスク文字の大きさと色文法を判定。
 *
 * 実行: cp docs/third-party-reviews/scripts/ky-noread-2026-06-10.mjs web/tmp-ky-noread.mjs
 *       cd web && node tmp-ky-noread.mjs && rm tmp-ky-noread.mjs ky-noread-*.png
 * 前提: dev server (localhost:3000) 起動済み
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const results = [];
const ok = (name, cond, detail = "") => {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
};

// 必須5項目が埋まったKY（リスク3行: 低1・高9・中4 の順=並べ替え検証用）
const fullRecord = {
  siteName: "○○ビル新築工事",
  workDateYear: "2026",
  workDateMonth: "6",
  workDateDay: "10",
  weather: "晴れ",
  teamGoal: "親綱に掛けてから移動しよう",
  pointingCall: "親綱 ヨシ！",
  workRows: [{ workDetail: "3F鉄骨建方・ボルト本締め", workPlace: "3F" }],
  riskRows: [
    { targetLabel: "1", hazard: "工具の落下", qualNo: "", likelihood: 1, severity: 1, reduction: "落下防止コード使用", reLikelihood: 1, reSeverity: 1, reducedBelow2: "", primeSign: "" },
    { targetLabel: "2", hazard: "開口部からの墜落", qualNo: "", likelihood: 3, severity: 3, reduction: "親綱使用・開口部養生", reLikelihood: 1, reSeverity: 1, reducedBelow2: "", primeSign: "" },
    { targetLabel: "3", hazard: "吊荷の振れによる挟まれ", qualNo: "", likelihood: 2, severity: 2, reduction: "介錯ロープで誘導", reLikelihood: 1, reSeverity: 1, reducedBelow2: "", primeSign: "" },
  ],
  participants: [{ name: "山田", qualNo: "", preWork: "", onExit: "" }],
};

const main = async () => {
  const browser = await chromium.launch();

  // --- シナリオ1: 初回の /ky/paper（未記入）→ 青の「記入のこり5」＋次は作業内容 ---
  const p1 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await p1.goto(`${BASE}/ky/paper`, { waitUntil: "networkidle" });
  const card1 = p1.getByRole("status", { name: /いまの状態/ });
  await card1.waitFor({ state: "visible", timeout: 15000 });
  const box1 = await card1.boundingBox();
  ok("①結論カードがファーストビュー内（/ky/paper 未記入）", box1 && box1.y + 40 < 844, `y=${box1?.y}`);
  ok("いまの状態=記入のこり を表示", ((await card1.textContent()) || "").includes("記入のこり"));
  const big1 = card1.locator("span").first();
  const fs1 = await big1.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  ok("②デカ数字40px以上（のこり項目数）", fs1 >= 40, `${fs1}px`);
  ok("③記入中=青（案内）の文法", ((await card1.getAttribute("class")) || "").includes("sky"));
  const act1 = card1.locator("a", { hasText: "作業内容を記入" });
  const actBox1 = await act1.boundingBox();
  ok("④次にやること（作業内容を記入）が同一ビュー内", actBox1 && actBox1.y < 844, `y=${actBox1?.y}`);
  await p1.screenshot({ path: "ky-noread-paper-empty.png" });

  // --- シナリオ2: 必須5項目記入済み → 緑「記入完了」＋サイネージへ ---
  const p2 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await p2.addInitScript((rec) => {
    localStorage.setItem("ky-record", JSON.stringify(rec));
  }, fullRecord);
  await p2.goto(`${BASE}/ky/paper`, { waitUntil: "networkidle" });
  const card2 = p2.getByRole("status", { name: /いまの状態/ });
  await card2.waitFor({ state: "visible", timeout: 15000 });
  ok(
    "記入完了=緑＋サイネージ導線",
    (((await card2.getAttribute("class")) || "").includes("emerald")) &&
      (((await card2.textContent()) || "").includes("記入完了")) &&
      (await card2.locator('a[href="/ky/morning"]').count()) > 0
  );
  await p2.screenshot({ path: "ky-noread-paper-complete.png" });

  // --- シナリオ3: 差し戻し → 黄（要対応）＋修正導線 ---
  const p3 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await p3.addInitScript((rec) => {
    localStorage.setItem(
      "ky-record",
      JSON.stringify({ ...rec, approval: { status: "rejected", history: [{ action: "reject", by: "元請担当", at: new Date().toISOString(), comment: "対策を具体的に" }] } })
    );
  }, fullRecord);
  await p3.goto(`${BASE}/ky/paper`, { waitUntil: "networkidle" });
  const card3 = p3.getByRole("status", { name: /いまの状態/ });
  await card3.waitFor({ state: "visible", timeout: 15000 });
  ok(
    "差し戻し=黄（要対応）の文法",
    (((await card3.getAttribute("class")) || "").includes("amber")) &&
      (((await card3.textContent()) || "").includes("差し戻し"))
  );
  await p3.screenshot({ path: "ky-noread-paper-rejected.png" });

  // --- シナリオ4: /ky/morning（朝礼TV 1280×800）→ Top3が評価値順・色文法・デカ文字 ---
  const p4 = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await p4.addInitScript((rec) => {
    localStorage.setItem("ky-record", JSON.stringify(rec));
  }, fullRecord);
  await p4.goto(`${BASE}/ky/morning`, { waitUntil: "networkidle" });
  const firstRisk = p4.locator("ul > li").first();
  await firstRisk.waitFor({ state: "visible", timeout: 15000 });
  const firstText = (await firstRisk.textContent()) || "";
  ok("Top3がラベルどおり評価値順（先頭=評価値9の墜落）", firstText.includes("開口部からの墜落") && firstText.includes("評価値 9"));
  ok("評価値9=赤（危険）の文法", ((await firstRisk.getAttribute("class")) || "").includes("rose"));
  const hazardEl = firstRisk.locator("p").first();
  const fs4 = await hazardEl.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  ok("リスク本文がデカ文字40px以上（TVサイズ）", fs4 >= 40, `${fs4}px`);
  const second = p4.locator("ul > li").nth(1);
  ok("2番目=評価値4は黄（注意）の文法", (((await second.textContent()) || "").includes("評価値 4")) && (((await second.getAttribute("class")) || "").includes("amber")));
  await p4.screenshot({ path: "ky-noread-morning.png" });

  // --- シナリオ5: /ky/morning 未保存（空状態）→ 読まずに次の一手が分かるデカボタン ---
  const p5 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await p5.goto(`${BASE}/ky/morning`, { waitUntil: "networkidle" });
  const makeBtn = p5.locator('a[href="/ky/paper"]', { hasText: "KY用紙を作る" });
  await makeBtn.waitFor({ state: "visible", timeout: 15000 });
  const btnBox = await makeBtn.boundingBox();
  ok("空状態の次アクションがデカボタン（44px以上・ファーストビュー内）", btnBox && btnBox.height >= 44 && btnBox.y < 844, `h=${btnBox?.height} y=${btnBox?.y}`);
  await p5.screenshot({ path: "ky-noread-morning-empty.png" });

  await browser.close();
  const fails = results.filter((r) => !r.pass);
  console.log(`\n${results.length - fails.length}/${results.length} PASS`);
  process.exit(fails.length ? 1 : 0);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
