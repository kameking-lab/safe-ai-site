/**
 * 無読テスト（柱0 判定4機能の色帯結論カード化・2026-06-11）
 * 雛形: records-noread-phase2-2026-06-11.mjs
 *
 * 対象: 石綿事前調査チェッカー(/asbestos-management/investigation-checker)
 *       作業環境測定 管理区分判定(/work-environment-measurement/management-class-judge)
 *       ストレスチェック自己評価(/mental-health-management/stress-check)
 *       健診スケジューラ判定結果(/health-checkup-scheduler/result)
 *
 * ペルソナ:
 *   A「解体も塗装も請ける工務店の専務・52歳」— 段落は絶対に読まない。色とデカい数字だけ見る。
 *     現場の合間にスマホで開き、3秒で「やることがあるか/止まるレベルか」が分からなければ閉じる。
 *   B「兼任の衛生管理者・総務課長・48歳」— ストレスチェックと健診の期限管理が仕事。
 *     何件残っているか・期限を過ぎていないかだけ知りたい。
 *
 * 判定（docs/visual-language-2026-06-10.md §4 無読テスト）:
 *   ①結論カード(role=status)がスマホ390×844のファーストビュー内（管理区分は判定後に自動スクロールで画面内）
 *   ②状態が変わると色の文法（赤=停止級/黄=要対応/緑=良好/青=指示・案内）どおり即変わる
 *   ③次にやることのタップ対象が44px以上
 *
 * シナリオは実UI操作のみ（localStorage直書きしない）。健診はリロード永続化・消去まで検証。
 *
 * 実行: cp docs/third-party-reviews/scripts/judgment-noread-2026-06-11.mjs web/tmp-noread-judgment.mjs
 *       cd web && node tmp-noread-judgment.mjs && rm tmp-noread-judgment.mjs
 * 前提: サーバー (localhost:3000) 起動済み（devハング回避のため npm run start 推奨）
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

  // ConclusionCard は aria-label="いまの状態: …"。詳細ボックスにも role=status が
  // あるページがあるため、結論カードはこの aria-label で特定する。
  const card = (page) => page.locator('section[aria-label^="いまの状態"]').first();
  const cardClass = async (page) => (await card(page).getAttribute("class")) || "";
  const cardText = async (page) => ((await card(page).textContent()) || "").trim();
  const inFirstView = async (loc) => {
    const box = await loc.boundingBox();
    return box && box.y >= -1 && box.y + 80 < 844 ? `y=${Math.round(box.y)}` : null;
  };

  /* ===== シナリオ1（ペルソナA）: 石綿チェッカー — やることが何件か ===== */
  const p1 = await ctx.newPage();
  await p1.goto(`${BASE}/asbestos-management/investigation-checker`, { waitUntil: "networkidle" });
  await card(p1).waitFor({ state: "visible", timeout: 15000 });
  ok("①石綿: 結論カードがファーストビュー内", await inFirstView(card(p1)), `${await inFirstView(card(p1))}`);
  {
    const t = await cardText(p1);
    const c = await cardClass(p1);
    ok(
      "石綿既定（解体・1995年・300万・120m²）: 青「4件 やること」",
      /やること/.test(t) && /4/.test(t) && c.includes("sky"),
      t.slice(0, 50),
    );
    ok(
      "石綿: 義務チップ4種（事前調査・調査者資格・労基署報告・自治体報告）",
      ["事前調査", "調査者資格", "労基署報告", "自治体報告"].every((s) => t.includes(s)),
      t.slice(0, 80),
    );
  }
  // 床面積を80m²未満へ → 自治体報告だけ消えて3件（入力に応じて即時更新）
  await p1.locator('input[type="number"]').nth(2).fill("30");
  await p1.waitForTimeout(300);
  {
    const t = await cardText(p1);
    ok(
      "石綿: 床面積30m²で「3件」へ即時減・自治体報告チップが消える",
      /3/.test(t) && !t.includes("自治体報告") && t.includes("労基署報告"),
      t.slice(0, 60),
    );
  }
  // 工事種別=新築 → 0件 対応不要（緑）
  await p1.locator("select").nth(1).selectOption("new-build");
  await p1.waitForTimeout(300);
  {
    const t = await cardText(p1);
    const c = await cardClass(p1);
    ok(
      "②石綿: 新築へ切替→緑「0件 対応不要」へ色文法どおり即変化",
      /対応不要/.test(t) && /0/.test(t) && c.includes("emerald"),
      t.slice(0, 50),
    );
  }
  await p1.close();

  /* ===== シナリオ2（ペルソナA）: 管理区分判定 — 止まるレベルか ===== */
  const p2 = await ctx.newPage();
  await p2.goto(`${BASE}/work-environment-measurement/management-class-judge`, { waitUntil: "networkidle" });
  const judge = async (aValue) => {
    await p2.locator("#category").selectOption({ index: 1 });
    await p2.locator("#managementConc").fill("25");
    await p2.locator("#aValue").fill(String(aValue));
    await p2.getByRole("button", { name: "管理区分を判定" }).click();
    await p2.locator('[data-testid="class-conclusion"]').waitFor({ state: "visible", timeout: 10000 });
    await p2.waitForTimeout(700); // 自動スクロール完了待ち
  };
  await judge(30); // 30/25=1.2 ≥ 100% → 第3
  {
    const big = (await p2.locator('[data-testid="class-big-value"]').textContent()) || "";
    const chip = (await p2.locator('[data-testid="class-state-chip"]').textContent()) || "";
    const cls = (await p2.locator('[data-testid="class-conclusion"]').getAttribute("class")) || "";
    ok("管理区分: A=30/管理濃度25 → デカ表示「第3管理区分」", big.includes("第3"), big.trim());
    ok("管理区分: 第3は赤＋チップ「直ちに改善」", cls.includes("rose") && chip.includes("直ちに改善"), chip.trim());
    ok(
      "①管理区分: 判定後に結論カードが自動スクロールで画面内",
      await inFirstView(p2.locator('[data-testid="class-conclusion"]')),
      `${await inFirstView(p2.locator('[data-testid="class-conclusion"]'))}`,
    );
    const segs = await p2.locator('[data-testid^="class-band-seg-"]').count();
    const bandText = (await p2.locator('[data-testid="class-band"]').textContent()) || "";
    ok("管理区分: 3区分の色帯＋▼マーカー", segs === 3 && bandText.includes("▼"), `segs=${segs}`);
    const stop = await p2.locator("text=改善完了まで有効な呼吸用保護具").count();
    ok("管理区分: 第3で停止級バナー（保護具着用）が最前面", stop > 0, `count=${stop}`);
  }
  await judge(20); // 0.8 → 第2（黄）
  {
    const big = (await p2.locator('[data-testid="class-big-value"]').textContent()) || "";
    const cls = (await p2.locator('[data-testid="class-conclusion"]').getAttribute("class")) || "";
    ok("②管理区分: A=20 → 黄「第2管理区分」へ即変化", big.includes("第2") && cls.includes("amber"), big.trim());
  }
  await judge(1); // 0.04 → 第1（緑）
  {
    const big = (await p2.locator('[data-testid="class-big-value"]').textContent()) || "";
    const chip = (await p2.locator('[data-testid="class-state-chip"]').textContent()) || "";
    const cls = (await p2.locator('[data-testid="class-conclusion"]').getAttribute("class")) || "";
    ok("②管理区分: A=1 → 緑「第1管理区分・良好」", big.includes("第1") && cls.includes("emerald") && chip.includes("良好"), chip.trim());
  }
  await p2.close();

  /* ===== シナリオ3（ペルソナB）: ストレスチェック自己評価 ===== */
  const p3 = await ctx.newPage();
  await p3.goto(`${BASE}/mental-health-management/stress-check`, { waitUntil: "networkidle" });
  await card(p3).waitFor({ state: "visible", timeout: 15000 });
  ok("①ストレス: 結論カードがファーストビュー内", await inFirstView(card(p3)), `${await inFirstView(card(p3))}`);
  {
    const t = await cardText(p3);
    const c = await cardClass(p3);
    ok(
      "ストレス未回答: 青「7問 自己評価 未回答」（未回答を赤黄で責めない）",
      /7/.test(t) && /未回答/.test(t) && c.includes("sky"),
      t.slice(0, 50),
    );
    const act = card(p3).locator("a");
    const box = await act.first().boundingBox();
    ok("③ストレス: 次にやること（診断に答える）が44px以上", box && box.height >= 44, `h=${box?.height}`);
  }
  // 3問だけ答える → まだ青「回答のこり4問」（途中経過で赤を出さない）
  const yesButtons = p3.getByRole("button", { name: "整っている" });
  for (let i = 0; i < 3; i++) await yesButtons.nth(i).click();
  {
    const t = await cardText(p3);
    const c = await cardClass(p3);
    ok("ストレス回答途中: 青「回答のこり4問」のまま", /回答のこり/.test(t) && /4/.test(t) && c.includes("sky"), t.slice(0, 40));
  }
  // 全問「整っている」 → 緑「実施可能 100%」
  for (let i = 3; i < 7; i++) await yesButtons.nth(i).click();
  {
    const t = await cardText(p3);
    const c = await cardClass(p3);
    ok("②ストレス全問整備: 緑「100% 実施可能」", /100/.test(t) && /実施可能/.test(t) && c.includes("emerald"), t.slice(0, 50));
  }
  // 80人（義務）で全問「未整備」 → 赤「未整備」
  await p3.locator("#headcount").fill("80");
  const noButtons = p3.getByRole("button", { name: "未整備" });
  for (let i = 0; i < 7; i++) await noButtons.nth(i).click();
  {
    const t = await cardText(p3);
    const c = await cardClass(p3);
    ok("②ストレス義務80人・全問未整備: 赤「未整備」（実施義務未達＝停止級）", /未整備/.test(t) && c.includes("rose"), t.slice(0, 50));
  }
  // 20人（努力義務）に変えると赤→黄（法令義務ではないため）
  await p3.locator("#headcount").fill("20");
  await p3.waitForTimeout(300);
  {
    const t = await cardText(p3);
    const c = await cardClass(p3);
    ok("②ストレス努力義務20人: 黄「準備が必要」へ降格（赤を乱発しない）", /準備が必要/.test(t) && c.includes("amber") && !c.includes("rose"), t.slice(0, 50));
  }
  await p3.close();

  /* ===== シナリオ4（ペルソナB）: 健診スケジューラ判定結果 ===== */
  const hcUrl = `${BASE}/health-checkup-scheduler/result?industry=construction&hire=2025-04-01`;
  const p4 = await ctx.newPage();
  await p4.goto(hcUrl, { waitUntil: "networkidle" });
  await card(p4).waitFor({ state: "visible", timeout: 15000 });
  ok("①健診: 結論カードがファーストビュー内", await inFirstView(card(p4)), `${await inFirstView(card(p4))}`);
  {
    const t = await cardText(p4);
    const c = await cardClass(p4);
    ok("健診初回: 青「記録のこりN件」（未記録を緑にしない＝偽安心防止）", /記録のこり/.test(t) && c.includes("sky"), t.slice(0, 50));
    const act = card(p4).locator('a[href="#tracker"]');
    const box = await act.boundingBox();
    ok("③健診: 「漏れチェック台帳へ」が44px以上", box && box.height >= 44, `h=${box?.height}`);
    await act.click();
    await p4.waitForTimeout(500);
    const tracker = p4.locator("#tracker");
    const tb = await tracker.boundingBox();
    ok("健診: 動線タップで台帳セクションへ移動", tb && tb.y < 400, `y=${Math.round(tb?.y ?? 9999)}`);
  }
  // 台帳の最初の定期健診に5年前の実施日を入力 → 最上部の結論が即・赤「期限超過」へ（共有ストアのlive同期）
  const dateInputs = p4.locator('#tracker input[type="date"]');
  await dateInputs.first().fill("2021-01-15");
  await p4.waitForTimeout(500);
  {
    const t = await cardText(p4);
    const c = await cardClass(p4);
    ok(
      "②健診: 台帳入力の瞬間に最上部の結論が赤「期限超過」へ（リロード不要のlive同期）",
      /期限超過/.test(t) && c.includes("rose"),
      t.slice(0, 50),
    );
  }
  // リロードしても赤のまま（localStorage永続化）
  await p4.reload({ waitUntil: "networkidle" });
  await card(p4).waitFor({ state: "visible", timeout: 15000 });
  await p4.waitForTimeout(800);
  {
    const t = await cardText(p4);
    const c = await cardClass(p4);
    ok("健診: リロード後も赤「期限超過」が残る（永続化）", /期限超過/.test(t) && c.includes("rose"), t.slice(0, 50));
  }
  // 全消去 → 青「記録のこり」へ戻る
  await p4.getByRole("button", { name: "入力した実施日をすべて消去" }).click();
  await p4.waitForTimeout(500);
  {
    const t = await cardText(p4);
    const c = await cardClass(p4);
    ok("健診: 消去で青「記録のこり」へ復帰", /記録のこり/.test(t) && c.includes("sky"), t.slice(0, 50));
  }
  await p4.close();

  await browser.close();
  const pass = results.filter((r) => r.pass).length;
  console.log(`\n==== 無読テスト結果: ${pass}/${results.length} PASS ====`);
  if (pass !== results.length) process.exit(1);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
