/**
 * 無読テスト（柱0 化学物質RA＋保護具ファインダー・2026-06-11）
 * 雛形: heat-noread-2026-06-10.mjs（柱0 熱中症）
 *
 * ペルソナ: 「塗装業の一人親方（48）・SDSを読んだことがない・スマホ・段落を絶対に読まない」
 *   - 元請からRA記録の提出を求められて初めて開いた。
 *   - ドラム缶のラベルの「赤いひし形」と標識の色は体で覚えている。
 *   - 3秒見て「どのくらい危ないか」「次に何をするか」が分からなければ閉じて紙に戻る。
 *
 * 判定（docs/visual-language-2026-06-10.md §4 無読テスト）:
 *   ①結論カード(role=status)が判定後に見える ②レベル/注意喚起語のデカ表示40px以上
 *   ③GHS絵表示・I〜IV色帯=現場の視覚言語 ④次にやること（44px以上）が同一カード内
 *
 * 実行: cp docs/third-party-reviews/scripts/chemical-noread-2026-06-11.mjs web/tmp-chem-noread.mjs
 *       cd web && node tmp-chem-noread.mjs && rm tmp-chem-noread.mjs
 * 前提: dev server (localhost:3000) 起動済み（GEMINI_API_KEY不要=MHLWフォールバックで判定が出る）
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

  // --- シナリオ1: クイック検索（トルエン）→ 注意喚起語の結論カード ---
  const p1 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await p1.goto(`${BASE}/chemical-ra`, { waitUntil: "networkidle" });
  await p1.locator("button", { hasText: "トルエン" }).first().click();
  const card1 = p1.getByTestId("ra-conclusion");
  await card1.waitFor({ state: "visible", timeout: 60000 });
  await p1.waitForTimeout(1200); // 結果へのスムーズスクロール完了を待つ
  const big1 = p1.getByTestId("ra-big-value");
  const fs1 = await big1.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  ok("②デカ表示40px以上（判定なし=注意喚起語）", fs1 >= 40, `${fs1}px`);
  const bigText1 = ((await big1.textContent()) || "").trim();
  ok("トルエン=「危険」の注意喚起語が主役", bigText1 === "危険", bigText1);
  const cardClass1 = (await card1.getAttribute("class")) || "";
  ok("危険=赤系（JIS赤の文法）", cardClass1.includes("rose"), cardClass1.split(" ").filter((c) => c.includes("rose")).join(","));
  const pictos1 = await p1.locator("[data-testid^='ghs-picto-']").count();
  ok("③GHS絵表示（赤ひし形）が描画される", pictos1 >= 1, `${pictos1}個`);
  // ④次にやること: まず行う対策＋保護具動線が同一カード内・44px以上
  const eqLink = card1.getByTestId("ra-equipment-link");
  const eqBox = await eqLink.boundingBox();
  ok("④保護具動線が同一カード内・44px以上", eqBox && eqBox.height >= 44, `h=${eqBox?.height}`);
  ok("④まず行う対策が同一カード内", ((await card1.textContent()) || "").includes("まず行う対策") || ((await card1.textContent()) || "").includes("保護具"));
  // 結論カードが自動スクロール後のビューポート内にある
  const cardBox1 = await card1.boundingBox();
  ok("①結論カードが判定後のビュー内", cardBox1 && cardBox1.y >= -50 && cardBox1.y < 844, `y=${cardBox1?.y}`);
  await p1.close();

  // --- シナリオ2: 作業条件込み（換気なし・大量）→ リスクレベルのデカ表示＋色帯 ---
  const p2 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await p2.goto(`${BASE}/chemical-ra?name=${encodeURIComponent("トルエン")}`, { waitUntil: "networkidle" });
  await p2.locator("label", { hasText: "換気の状況" }).locator("select").selectOption("none");
  await p2.locator("label", { hasText: "1日の取扱量" }).locator("select").selectOption("large");
  await p2.locator("button", { hasText: "STEP 3" }).click();
  const card2 = p2.getByTestId("ra-conclusion");
  await card2.waitFor({ state: "visible", timeout: 60000 });
  const big2 = ((await p2.getByTestId("ra-big-value").textContent()) || "").trim();
  ok("CREATE-SIMPLE判定: レベル(I〜IV)が主役", /^(I|II|III|IV)$/.test(big2), big2);
  const fs2 = await p2.getByTestId("ra-big-value").evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  ok("②レベルのデカ表示40px以上", fs2 >= 40, `${fs2}px`);
  const segs = await p2.locator("[data-testid^='ra-band-seg-']").count();
  ok("③I〜IV色帯=4セグメント", segs === 4, `${segs}セグメント`);
  // 換気なし×大量×トルエンは高リスク側（III/IV）になり赤系の文法のはず
  const cls2 = (await card2.getAttribute("class")) || "";
  ok("高リスク側=橙/深紅系の文法", /(orange|rose)/.test(cls2) && /^(III|IV)$/.test(big2), `${big2} / ${cls2.split(" ").filter((c) => /orange|rose/.test(c)).join(",")}`);
  if (big2 === "IV") {
    ok("レベルIV=原則 作業中止が最前面", ((await card2.textContent()) || "").includes("原則 作業中止"));
  }
  await p2.close();

  // --- シナリオ3: 保護具ファインダー → 12カテゴリ全部にピクトグラム・44pxタップ ---
  const p3 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await p3.goto(`${BASE}/equipment-finder`, { waitUntil: "networkidle" });
  const cards = p3.locator("section button:has([data-testid^='ppe-picto-'])");
  await cards.first().waitFor({ state: "visible", timeout: 15000 });
  const cardCount = await cards.count();
  ok("カテゴリカード12件すべてにピクトグラム", cardCount === 12, `${cardCount}件`);
  let allTall = true;
  for (let i = 0; i < cardCount; i++) {
    const b = await cards.nth(i).boundingBox();
    if (!b || b.height < 44) allTall = false;
  }
  ok("全カテゴリカード44px以上", allTall);
  await p3.close();

  // --- シナリオ4: RA→ファインダー連携（トルエン）→ 絞り込み→ 結論カード（件数デカ数字） ---
  const p4 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await p4.goto(
    `${BASE}/equipment-finder?chemical=${encodeURIComponent("トルエン")}&hazards=${encodeURIComponent("引火性,中枢神経毒性,有機溶剤")}&categories=gas-mask,gloves,goggles`,
    { waitUntil: "networkidle" },
  );
  // 自動でSTEP2（防毒マスクの絞り込み）に遷移している
  const chips = p4.locator("button:has([data-testid^='ppe-picto-'])");
  await chips.first().waitFor({ state: "visible", timeout: 15000 });
  ok("連携バナーの保護具チップにピクトグラム", (await chips.count()) >= 3, `${await chips.count()}個`);
  // 絞り込みに回答（全問の最初の選択肢）して結果へ
  const questions = p4.locator("h3");
  const qCount = await questions.count();
  for (let i = 0; i < qCount; i++) {
    const group = p4.locator("div.space-y-4 > div").nth(i);
    await group.locator("button[aria-pressed]").first().click();
  }
  await p4.locator("button", { hasText: "おすすめ商品を見る" }).click();
  const finderConclusion = p4.getByTestId("finder-conclusion");
  await finderConclusion.waitFor({ state: "visible", timeout: 15000 });
  const countText = ((await p4.getByTestId("finder-big-count").textContent()) || "").trim();
  const fsCount = await p4.getByTestId("finder-big-count").evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  ok("結果: 件数デカ数字40px以上", fsCount >= 40, `${countText}件 / ${fsCount}px`);
  const fcClass = (await finderConclusion.getAttribute("class")) || "";
  const n = parseInt(countText, 10);
  ok(
    "件数>0=緑 / 0件=黄＋絞り込み変更ボタンの文法",
    n > 0 ? fcClass.includes("emerald") : fcClass.includes("amber"),
    `${n}件 ${fcClass.split(" ").filter((c) => /emerald|amber/.test(c)).join(",")}`,
  );
  await p4.waitForTimeout(400); // 結果遷移時の先頭スクロールを待つ
  const fcBox = await finderConclusion.boundingBox();
  ok("①結論カードがファーストビュー内", fcBox && fcBox.y >= -10 && fcBox.y + 80 < 844, `y=${fcBox?.y}`);
  await p4.close();

  await browser.close();
  const fails = results.filter((r) => !r.pass);
  console.log(`\n=== ${results.length - fails.length}/${results.length} PASS ===`);
  if (fails.length) process.exit(1);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
