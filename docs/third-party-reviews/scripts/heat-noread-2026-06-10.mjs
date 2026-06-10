/**
 * 無読テスト（柱0 熱中症ハブ一式・2026-06-10）
 * 雛形: ky-noread-2026-06-10.mjs（柱0-1）
 *
 * ペルソナ: 「炎天下から片手スマホで開く50代職長・段落を絶対に読まない」
 *   - 7月の現場。直射日光で画面は見づらい。手袋。
 *   - 3秒見て「いまどのくらい危ないか」「次に何をするか」が分からなければ
 *     もう開かない（紙の黒板とラジオ体操に戻る）。
 *
 * 判定（docs/visual-language-2026-06-10.md §4 無読テスト）:
 *   ①結論カード(role=status)がスマホ390×844のファーストビュー内
 *   ②WBGTデカ数字40px以上 ③危険度色帯（5区分）が描画され、危険時は赤系の文法
 *   ④次にやることが同一ビュー内（44px以上のタップ対象）
 *
 * 実行: cp docs/third-party-reviews/scripts/heat-noread-2026-06-10.mjs web/tmp-heat-noread.mjs
 *       cd web && node tmp-heat-noread.mjs && rm tmp-heat-noread.mjs
 * 前提: dev server (localhost:3000) 起動済み
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const results = [];
const ok = (name, cond, detail = "") => {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
};

const main = async () => {
  const browser = await chromium.launch();

  // --- シナリオ1: WBGT計算機（既定値32℃/70%・屋外・中程度） ---
  const p1 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await p1.goto(`${BASE}/heat-illness-prevention/wbgt-calculator`, { waitUntil: "networkidle" });
  const card1 = p1.getByTestId("wbgt-conclusion");
  await card1.waitFor({ state: "visible", timeout: 15000 });
  const box1 = await card1.boundingBox();
  ok("①結論カードがファーストビュー内（計算機）", box1 && box1.y + 80 < 844, `y=${box1?.y}`);
  const big1 = p1.getByTestId("wbgt-big-value");
  const fs1 = await big1.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  ok("②WBGTデカ数字40px以上", fs1 >= 40, `${fs1}px`);
  const chipText1 = (await p1.getByTestId("wbgt-risk-chip").textContent()) || "";
  ok("区分チップ（5区分のいずれか）を表示", /^(ほぼ安全|注意|警戒|厳重警戒|危険)$/.test(chipText1.trim()), chipText1.trim());
  const segs1 = await p1.locator("[data-testid^='wbgt-band-seg-']").count();
  ok("③危険度色帯=5区分", segs1 === 5, `${segs1}区分`);
  const bandBox = await p1.getByTestId("wbgt-band").boundingBox();
  ok("色帯もファーストビュー内", bandBox && bandBox.y + bandBox.height < 844, `y=${bandBox?.y}`);
  // ④次にやること（休憩・水分チップ or 作業中止）が結論カード内
  const actionText1 = (await card1.textContent()) || "";
  ok("④次にやることが同一カード内", /(作業中止|休憩|水分)/.test(actionText1));
  const addBtn = card1.locator("button", { hasText: "日次記録簿に追加" });
  const addBox = await addBtn.boundingBox();
  ok("記録への動線が44px以上", addBox && addBox.height >= 44, `h=${addBox?.height}`);

  // --- シナリオ2: 気温を40℃に上げる → 赤系「危険」へ即時に変わる ---
  const tempInput = p1.locator("input[inputmode='decimal']").first();
  await tempInput.fill("40");
  await p1.waitForTimeout(300);
  const chipText2 = ((await p1.getByTestId("wbgt-risk-chip").textContent()) || "").trim();
  ok("40℃で区分が危険へ", chipText2 === "危険", chipText2);
  const cardClass2 = (await p1.getByTestId("wbgt-conclusion").getAttribute("class")) || "";
  ok("危険=深紅系（JIS赤=停止の文法）", cardClass2.includes("rose"), cardClass2.split(" ").filter((c) => c.includes("rose")).join(","));
  ok("作業中止が出る", ((await p1.getByTestId("wbgt-conclusion").textContent()) || "").includes("作業中止"));
  await p1.close();

  // --- シナリオ3: 日次記録簿（空）→ 青の案内＋デカ動線 → 1件追加で結論カード ---
  const p2 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await p2.goto(`${BASE}/heat-illness-prevention/log`, { waitUntil: "networkidle" });
  const empty = p2.getByRole("status");
  await empty.waitFor({ state: "visible", timeout: 15000 });
  const emptyText = (await empty.textContent()) || "";
  ok("空の記録簿=「今日の記録なし」結論カード", emptyText.includes("記録なし"));
  const emptyClass = (await empty.getAttribute("class")) || "";
  ok("空状態=青（案内）の文法", emptyClass.includes("sky"));
  const cta = empty.locator("a", { hasText: "測定を追加" });
  const ctaBox = await cta.boundingBox();
  ok("追加動線が44px以上＋ファーストビュー内", ctaBox && ctaBox.height >= 44 && ctaBox.y < 844, `h=${ctaBox?.height} y=${ctaBox?.y}`);
  // 測定を1件追加（35℃/75% → 厳重警戒以上を想定）
  await p2.locator("#heat-log-add input[type='number']").first().fill("35");
  await p2.locator("button", { hasText: "この測定を記録に追加" }).click();
  await p2.waitForTimeout(300);
  const wc = p2.getByTestId("wbgt-conclusion");
  await wc.waitFor({ state: "visible", timeout: 5000 });
  const fsLog = await p2.getByTestId("wbgt-big-value").evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  ok("追加後: 最も危険な測定がデカ数字40px以上で先頭に", fsLog >= 40, `${fsLog}px`);
  ok("追加後: 色帯と記録件数チップ", (await wc.textContent() || "").includes("記録 1 件"));
  await p2.close();

  // --- シナリオ4: 暑熱順化 → 進捗デカ数字、体調=作業中止で黄に変わる ---
  const p3 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await p3.goto(`${BASE}/heat-illness-prevention/acclimatization`, { waitUntil: "networkidle" });
  const acclimCard = p3.getByRole("status").first();
  await acclimCard.waitFor({ state: "visible", timeout: 15000 });
  const acclimText = (await acclimCard.textContent()) || "";
  ok("順化: 進捗 N/M 日の結論カード", /0\/7/.test(acclimText), acclimText.slice(0, 40));
  ok("順化中=青（案内）の文法", ((await acclimCard.getAttribute("class")) || "").includes("sky"));
  // 1日目を実施 → 1/7、体調「作業中止」→ 黄=注意へ
  await p3.locator("table input[type='checkbox']").first().check();
  await p3.locator("table select").first().selectOption("stop");
  await p3.waitForTimeout(300);
  const acclimText2 = (await p3.getByRole("status").first().textContent()) || "";
  const acclimClass2 = (await p3.getByRole("status").first().getAttribute("class")) || "";
  ok("体調中止あり→「体調注意」＋黄の文法", acclimText2.includes("体調注意") && acclimClass2.includes("amber"), acclimText2.slice(0, 30));
  await p3.close();

  // --- シナリオ5: 業種別リスク → ピクトグラム付き44pxチップ ---
  const p4 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await p4.goto(`${BASE}/heat-illness-prevention/industry-risk`, { waitUntil: "networkidle" });
  // ヘッダーの「ふりがな」トグルも aria-pressed を持つため、業種選択セクションにスコープを絞る
  const chips = p4
    .locator("section", { hasText: "業種を選択" })
    .first()
    .locator("button[aria-pressed]");
  await chips.first().waitFor({ state: "visible", timeout: 15000 });
  const chipCount = await chips.count();
  ok("業種チップ10件", chipCount === 10, `${chipCount}件`);
  let allTall = true;
  let allIcon = true;
  for (let i = 0; i < chipCount; i++) {
    const b = await chips.nth(i).boundingBox();
    if (!b || b.height < 44) allTall = false;
    if ((await chips.nth(i).locator("svg").count()) === 0) allIcon = false;
  }
  ok("全チップ44px以上", allTall);
  ok("全チップにピクトグラム", allIcon);
  await p4.close();

  // --- シナリオ6: ハブ → 段落は折りたたみ、機能カードに直行できる ---
  const p5 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await p5.goto(`${BASE}/heat-illness-prevention`, { waitUntil: "networkidle" });
  const details = p5.locator("details").first();
  await details.waitFor({ state: "attached", timeout: 15000 });
  ok("位置付け段落は折りたたみ（既定で閉）", !(await details.evaluate((el) => el.open)));
  const calcCard = p5.locator("a[href='/heat-illness-prevention/wbgt-calculator']").first();
  const calcBox = await calcCard.boundingBox();
  ok("WBGT計算機カードがファーストビュー近傍", calcBox && calcBox.y < 844 + 200, `y=${calcBox?.y}`);
  await p5.close();

  await browser.close();
  const fails = results.filter((r) => !r.pass);
  console.log(`\n=== ${results.length - fails.length}/${results.length} PASS ===`);
  if (fails.length) process.exit(1);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
