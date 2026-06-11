/**
 * 無読テスト（柱0 記録キット残り4画面・2026-06-11 第2弾）
 * 雛形: records-noread-2026-06-11.mjs（第1弾・6画面）
 *
 * 対象: 手順書(/site-records/procedure)・死傷病報告(/site-records/incident-report)
 *       資格管理簿(/site-records/qualifications)・安全カレンダー(/site-records/calendar)
 *
 * ペルソナ: 「直行直帰の現場監督・段落を絶対に読まない45歳」
 *   - 朝礼前の3分でスマホから開く。文章は読まない。色とデカい数字しか見ない。
 *   - 3秒見て「いまの状態」と「次にやること」が分からなければ紙に戻る。
 *
 * 判定（docs/visual-language-2026-06-10.md §4 無読テスト）:
 *   ①結論カード(role=status)がスマホ390×844のファーストビュー内
 *   ②状態が変わると色の文法（赤=停止級/黄=要対応/緑=良好/青=案内）どおり即変わる
 *   ③次にやることのタップ対象が44px以上
 *
 * シナリオは実UI操作でデータを作る（localStorage直書きしない＝スキーマ非依存・実フロー検証）。
 * カレンダーは消し込み→リロードで永続化まで確認。
 *
 * 実行: cp docs/third-party-reviews/scripts/records-noread-phase2-2026-06-11.mjs web/tmp-noread-p2.mjs
 *       cd web && node tmp-noread-p2.mjs && rm tmp-noread-p2.mjs
 * 前提: サーバー (localhost:3000) 起動済み（dev か npm run start）
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
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });

  const card = (page) => page.getByRole("status");
  const cardClass = async (page) => (await card(page).getAttribute("class")) || "";
  const cardText = async (page) => ((await card(page).textContent()) || "").trim();
  const firstView = async (page) => {
    const box = await card(page).boundingBox();
    return box && box.y + 80 < 844 ? `y=${Math.round(box.y)}` : null;
  };
  const bigFontPx = (page) =>
    card(page).evaluate((el) => {
      const big = el.querySelector("span.text-5xl");
      return big ? parseFloat(getComputedStyle(big).fontSize) : 0;
    });

  // --- シナリオ1: 作業手順書（青「記入のこり2」→ 記入で即減 → 緑「記入完了」） ---
  const p1 = await ctx.newPage();
  await p1.goto(`${BASE}/site-records/procedure`, { waitUntil: "networkidle" });
  await card(p1).waitFor({ state: "visible", timeout: 15000 });
  ok("①手順書空: 結論カードがファーストビュー内", await firstView(p1), await firstView(p1));
  const c1a = await cardText(p1);
  ok(
    "手順書空: 青「記入のこり2」（作業名＋手順1行。全欄空の行は数えない）",
    /記入のこり/.test(c1a) && /2/.test(c1a) && (await cardClass(p1)).includes("sky"),
    c1a.slice(0, 40),
  );
  ok("手順書: デカ数字40px以上", (await bigFontPx(p1)) >= 40, `${await bigFontPx(p1)}px`);
  await p1.getByPlaceholder("例: 移動式クレーンによる鉄骨建方").fill("移動式クレーンによる鉄骨建方");
  await p1.waitForTimeout(300);
  ok("②手順書: 作業名記入で1件に即減", /1/.test(await cardText(p1)), (await cardText(p1)).slice(0, 30));
  // 1行目の手順×危険×対策を埋める → 完了
  await p1.getByPlaceholder("作業手順").first().fill("玉掛けして合図で巻き上げ");
  await p1.getByPlaceholder("危険・急所").first().fill("つり荷の落下・接触");
  await p1.getByPlaceholder("対策").first().fill("つり荷の下に立ち入らせない");
  await p1.waitForTimeout(300);
  ok(
    "手順書完了: 緑「記入完了」へ即時に変わる",
    (await cardText(p1)).includes("記入完了") && (await cardClass(p1)).includes("emerald"),
  );
  await p1.close();

  // --- シナリオ2: 死傷病報告（青「記入のこり13欄」→ 全欄記入で緑「下書き完了」） ---
  const p2 = await ctx.newPage();
  await p2.goto(`${BASE}/site-records/incident-report`, { waitUntil: "networkidle" });
  await card(p2).waitFor({ state: "visible", timeout: 15000 });
  ok("①死傷病空: 結論カードがファーストビュー内", await firstView(p2), await firstView(p2));
  const c2a = await cardText(p2);
  ok(
    "死傷病空: 青「記入のこり13欄」",
    /記入のこり/.test(c2a) && /13/.test(c2a) && (await cardClass(p2)).includes("sky"),
    c2a.slice(0, 40),
  );
  const fills = [
    ["例: 建設業（鉄骨工事）", "建設業（鉄骨工事）"],
    ["例: ○○新築工事", "無読ビル新築工事"],
    ["例: ○○市○○", "○○市中央1-1"],
    ["例: 25", "25"],
    ["例: ○○ ○○", "被災 太郎"],
    ["例: 男・34", "男・34"],
    ["例: 鉄筋工", "鉄筋工"],
    ["例: 5年", "5年"],
    ["例: 2026-07-09 10:30", "2026-06-01 10:30"],
    ["例: 3F 開口部付近", "3F 開口部付近"],
    ["例: 右足関節骨折", "右足関節骨折"],
    ["例: 30", "30"],
  ];
  for (const [ph, v] of fills) await p2.getByPlaceholder(ph).fill(v);
  await p2.waitForTimeout(300);
  ok("②死傷病: 12欄記入で「のこり1欄」（災害発生状況）に即減", /1\s*欄|のこり.*1/.test(await cardText(p2)), (await cardText(p2)).slice(0, 30));
  await p2.locator("textarea").fill("3F開口部付近で資材運搬中、養生の外れた開口部から墜落した。");
  await p2.waitForTimeout(300);
  const c2b = await cardText(p2);
  ok(
    "死傷病完了: 緑「下書き完了」＋提出は電子申請の補足",
    c2b.includes("下書き完了") && c2b.includes("電子申請") && (await cardClass(p2)).includes("emerald"),
    c2b.slice(0, 40),
  );
  await p2.close();

  // --- シナリオ3: 資格管理簿（青「登録なし」→ 1人登録で「登録1名」＋逆引き動線44px） ---
  const p3 = await ctx.newPage();
  await p3.goto(`${BASE}/site-records/qualifications`, { waitUntil: "networkidle" });
  await card(p3).waitFor({ state: "visible", timeout: 15000 });
  ok("①資格空: 結論カードがファーストビュー内", await firstView(p3), await firstView(p3));
  ok("資格空: 青「登録なし」", (await cardText(p3)).includes("登録なし") && (await cardClass(p3)).includes("sky"));
  await p3.getByPlaceholder("例: 作業 太郎").fill("有資格 太郎");
  await p3.locator("select").first().selectOption({ index: 1 });
  await p3.getByRole("button", { name: "候補を追加" }).click();
  await p3.getByRole("button", { name: "この端末に保存" }).click();
  await p3.waitForTimeout(400);
  const c3 = await cardText(p3);
  ok(
    "②資格登録後: 「登録1名」＋資格1種の現況カード",
    /登録済/.test(c3) && /1/.test(c3) && /1種/.test(c3),
    c3.slice(0, 40),
  );
  const act3 = card(p3).locator("a", { hasText: "資格から逆引き" });
  const actBox3 = await act3.boundingBox();
  ok("③資格: 逆引き動線が44px以上", actBox3 && actBox3.height >= 44, `h=${actBox3?.height}`);
  await act3.click();
  await p3.waitForTimeout(500);
  const lookup = await p3.locator("#qual-lookup").boundingBox();
  ok("資格: タップで逆引き名簿へ移動", lookup && lookup.y < 400, `y=${lookup ? Math.round(lookup.y) : "?"}`);
  ok("資格: 逆引き名簿に登録者が出る", (await p3.locator("#qual-lookup").textContent()).includes("有資格 太郎"));
  await p3.close();

  // --- シナリオ4: 安全カレンダー（青「今月のこりN件」→ 全消し込みで緑 → リロードで永続） ---
  const p4 = await ctx.newPage();
  await p4.goto(`${BASE}/site-records/calendar`, { waitUntil: "networkidle" });
  await card(p4).waitFor({ state: "visible", timeout: 15000 });
  ok("①カレンダー: 結論カードがファーストビュー内", await firstView(p4), await firstView(p4));
  const boxes = p4.locator("#this-month input[type='checkbox']");
  const n = await boxes.count();
  const c4a = await cardText(p4);
  ok(
    `カレンダー初期: 青「今月のこり${n}件」（今月の項目数と一致）`,
    n > 0 && new RegExp(`${n}`).test(c4a) && /今月のこり/.test(c4a) && (await cardClass(p4)).includes("sky"),
    c4a.slice(0, 40),
  );
  const act4 = card(p4).locator("a", { hasText: "今月の項目へ" });
  const actBox4 = await act4.boundingBox();
  ok("③カレンダー: 次の一手が44px以上", actBox4 && actBox4.height >= 44, `h=${actBox4?.height}`);
  for (let i = 0; i < n; i++) await boxes.nth(i).click();
  await p4.waitForTimeout(300);
  ok(
    "②カレンダー全消し込み: 緑「今月完了」へ即時に変わる",
    (await cardText(p4)).includes("今月完了") && (await cardClass(p4)).includes("emerald"),
  );
  await p4.reload({ waitUntil: "networkidle" });
  await card(p4).waitFor({ state: "visible", timeout: 15000 });
  ok("カレンダー永続化: リロード後も緑「今月完了」のまま", (await cardText(p4)).includes("今月完了"));
  // 1件戻すと青に戻る（消し込み解除）
  await p4.locator("#this-month input[type='checkbox']").first().click();
  await p4.waitForTimeout(300);
  ok(
    "カレンダー解除: 1件戻すと青「今月のこり1件」へ",
    /今月のこり/.test(await cardText(p4)) && (await cardClass(p4)).includes("sky"),
  );
  await p4.close();

  await browser.close();
  const passCount = results.filter((r) => r.pass).length;
  console.log(`\n=== ${passCount}/${results.length} PASS ===`);
  process.exit(passCount === results.length ? 0 : 1);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
