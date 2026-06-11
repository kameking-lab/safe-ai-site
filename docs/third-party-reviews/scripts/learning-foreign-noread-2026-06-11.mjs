/**
 * 無読テスト（柱0 外国人労働者教育＋Eラーニングのビジュアルファースト化・2026-06-11）
 * 雛形: judgment-noread-2026-06-11.mjs
 *
 * 対象: /foreign-workers（ハブ）
 *       /foreign-workers/safety-training（多言語教材ビルダー）
 *       /e-learning（Eラーニング）
 *
 * ペルソナ:
 *   A「ベトナム人技能実習生2名を受け入れた建設会社の職長・45歳」— 段落は絶対に読まない。
 *     絵とデカいボタンだけ見る。「教材をどこで作るか」「実習生に何を見せるか」が3秒で
 *     分からなければ紙のパンフに戻る。
 *   B「来日8か月の技能実習生・23歳」— 日本語の漢字はほぼ読めない。ピクトグラムと母語表記
 *     （Tiếng Việt）だけが頼り。教材選択ボタンの絵で「何の教育か」が分かる必要がある。
 *   C「初めて安全担当になった製造業の若手・26歳」— /e-learning を開いて「自分が今どこまで
 *     やったか」「次に何をやるか」が読まずに分かるか。
 *
 * 判定（docs/visual-language-2026-06-10.md §4 無読テスト）:
 *   ①最上部の結論/動線がスマホ390×844のファーストビュー内
 *   ②色の文法（青=指示/緑=完了/黄=要対応・誤答。このページ群に赤は無い）どおりに変わる
 *   ③タップ対象44px以上・ピクトグラムは言語の壁を越える（aria-label併記）
 *
 * シナリオは実UI操作のみ（localStorage直書きしない）。Eラーニングはリロード永続化まで検証。
 *
 * 実行: cp docs/third-party-reviews/scripts/learning-foreign-noread-2026-06-11.mjs web/tmp-noread-learning.mjs
 *       cd web && node tmp-noread-learning.mjs && rm tmp-noread-learning.mjs
 * 前提: サーバー (localhost:3000) 起動済み（devハング回避のため npm run start 推奨）
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const results = [];
const ok = (name, cond, detail = "") => {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
};
const tappable = async (loc) => {
  const box = await loc.boundingBox();
  return box && box.height >= 44 ? `h=${Math.round(box.height)}` : null;
};

const main = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });

  /* ===== シナリオ1（ペルソナA）: /foreign-workers — 行き先が3秒で分かるか ===== */
  const p1 = await ctx.newPage();
  await p1.goto(`${BASE}/foreign-workers`, { waitUntil: "networkidle" });
  const buildLane = p1.locator('a[href="/foreign-workers/safety-training"]').first();
  const guideLane = p1.locator('a[href="#status-guide"]').first();
  ok("①FWハブ: 「教材を作る」レーンが見える", await buildLane.isVisible());
  {
    const box = await buildLane.boundingBox();
    ok("FWハブ: 教材レーンがファーストビュー内", box && box.y + 44 < 844, `y=${box ? Math.round(box.y) : "?"}`);
  }
  ok("③FWハブ: 教材レーン44px以上", await tappable(buildLane), `${await tappable(buildLane)}`);
  ok("③FWハブ: 在留資格レーン44px以上", await tappable(guideLane), `${await tappable(guideLane)}`);
  {
    // 文字ダイエット: チェックリストと出典の段落は初期折りたたみ（情報は消えていない）
    const details = p1.locator("details");
    const n = await details.count();
    let openCount = 0;
    for (let i = 0; i < n; i++) {
      if (await details.nth(i).getAttribute("open") !== null) openCount++;
    }
    ok("FWハブ: 段落系details初期折りたたみ", n >= 2 && openCount === 0, `details=${n} open=${openCount}`);
    // 格納であって削除ではない: チェックリストのsummaryをタップすると内容が現れる
    const checklist = p1.locator("details", { hasText: "事業主向けチェックリスト" }).first();
    const beforeOpen = await checklist.locator("ul li").first().isVisible();
    await checklist.locator("summary").click();
    await p1.waitForTimeout(300);
    const afterOpen = await checklist.locator("ul li").first().isVisible();
    ok("FWハブ: チェックリストは格納(タップで全文)・削除ではない", !beforeOpen && afterOpen);
    await checklist.locator("summary").click(); // 閉じて元に戻す
  }
  {
    // 在留資格レーン → ページ内 #status-guide に着地
    await guideLane.click();
    await p1.waitForTimeout(600);
    const anchor = p1.locator("#status-guide");
    const box = await anchor.boundingBox();
    ok("FWハブ: 在留資格レーンでガイドへ着地", box && box.y > -50 && box.y < 300, `y=${box ? Math.round(box.y) : "?"}`);
  }

  /* ===== シナリオ2（ペルソナA+B）: 教材ビルダー — 絵で選べるか ===== */
  const p2 = await ctx.newPage();
  await p2.goto(`${BASE}/foreign-workers/safety-training`, { waitUntil: "networkidle" });
  const industryBtns = p2.locator("fieldset").nth(0).locator("button[aria-pressed]");
  const topicBtns = p2.locator("fieldset").nth(1).locator("button[aria-pressed]");
  ok("②ビルダー: 業種ボタン6種", (await industryBtns.count()) === 6, `n=${await industryBtns.count()}`);
  ok("②ビルダー: トピックボタン5種", (await topicBtns.count()) === 5, `n=${await topicBtns.count()}`);
  {
    // 全ボタンにピクトグラム(svg)と44px以上(実装は64px)のタップ対象
    let allSvg = true;
    let allTall = true;
    for (let i = 0; i < 6; i++) {
      const b = industryBtns.nth(i);
      if ((await b.locator("svg").count()) === 0) allSvg = false;
      if (!(await tappable(b))) allTall = false;
    }
    for (let i = 0; i < 5; i++) {
      const b = topicBtns.nth(i);
      if ((await b.locator("svg").count()) === 0) allSvg = false;
      if (!(await tappable(b))) allTall = false;
    }
    ok("③ビルダー: 全選択ボタンにピクトグラム", allSvg);
    ok("③ビルダー: 全選択ボタン44px以上", allTall);
  }
  {
    // ペルソナB: 母語表記が主表示（Tiếng Việt が読める）
    const text = await p2.locator("fieldset").nth(2).innerText();
    ok("②ビルダー: 言語ボタンは母語表記が主", /Tiếng Việt/.test(text) && /Bahasa Indonesia/.test(text), "Tiếng Việt/Bahasa表示");
  }
  {
    // トピック切替: 熱中症をタップ → 教材ヘッダーが熱中症 + ヘッダーにもピクトグラム（印刷物にも載る）
    await topicBtns.nth(2).click(); // 熱中症
    await p2.waitForTimeout(400);
    ok("②ビルダー: 熱中症タップで選択状態", (await topicBtns.nth(2).getAttribute("aria-pressed")) === "true");
    const header = p2.locator("article header").first();
    ok("②ビルダー: 教材ヘッダーに熱中症", /熱中症/.test(await header.innerText()));
    ok("③ビルダー: 教材ヘッダーにピクトグラム(印刷にも載る)", (await header.locator("svg").count()) >= 1);
  }
  {
    // 業種切替（サーバー再取得を伴う）: 製造をタップ → URLと選択状態
    await industryBtns.nth(1).click(); // 製造
    await p2.waitForURL(/industry=manufacturing/, { timeout: 15000 });
    const btns2 = p2.locator("fieldset").nth(0).locator("button[aria-pressed]");
    ok("②ビルダー: 製造タップで業種切替", (await btns2.nth(1).getAttribute("aria-pressed")) === "true", p2.url());
  }

  /* ===== シナリオ3（ペルソナC）: /e-learning — 履歴ゼロ → 入門から開始（青） ===== */
  const p3 = await ctx.newPage();
  await p3.goto(`${BASE}/e-learning`, { waitUntil: "networkidle" });
  const card = p3.locator('section[aria-label^="いまの状態"]').first();
  await card.waitFor({ state: "visible", timeout: 15000 });
  {
    const t = (await card.textContent()) || "";
    const c = (await card.getAttribute("class")) || "";
    ok("①EL: 履歴ゼロ=青「入門から開始」カードが最上部", /入門から開始/.test(t) && c.includes("sky"));
    const box = await card.boundingBox();
    ok("①EL: 結論カードがファーストビュー内", box && box.y + 80 < 844, `y=${box ? Math.round(box.y) : "?"}`);
    const action = card.locator("a");
    ok("③EL: 「入門から始める」44px以上", await tappable(action), `${await tappable(action)}`);
    // タップ → クイズ位置へ移動し intro-step1 が選ばれる
    await action.click();
    await p3.waitForURL(/theme=intro-step1/, { timeout: 15000 });
    const sel = p3.locator("#learning-theme");
    ok("②EL: 結論カードから入門Step1へ直行", (await sel.inputValue()) === "intro-step1");
  }
  {
    // 回答前: 採点ストリップは青「回答のこりN問」
    const strip = p3.locator('[role="status"][aria-label^="採点"]');
    const t0 = (await strip.textContent()) || "";
    const c0 = (await strip.getAttribute("class")) || "";
    ok("②EL: 回答前=青「回答のこり」", /回答のこり/.test(t0) && c0.includes("sky"), t0.replace(/\s+/g, " ").slice(0, 30));
    // 実UI操作で全問に回答（全部1番目の選択肢 → 誤答が出る想定。全問正答なら緑も正）
    const questions = p3.locator("#el-quiz .space-y-3 > div");
    const qn = await questions.count();
    for (let i = 0; i < qn; i++) {
      await questions.nth(i).locator('input[type="radio"]').first().check();
    }
    await p3.waitForTimeout(600);
    const t1 = (await strip.textContent()) || "";
    const c1 = (await strip.getAttribute("class")) || "";
    const wrong = /誤答/.test(t1) && c1.includes("amber");
    const perfect = /全問正答/.test(t1) && c1.includes("emerald");
    ok("②EL: 全問回答後=黄「誤答N問」or 緑「全問正答」", wrong || perfect, t1.replace(/\s+/g, " ").slice(0, 40));
    if (wrong) {
      // 黄には「もう一度」44px → タップで回答リセット=青へ戻る
      const retry = p3.locator("#el-quiz button", { hasText: "もう一度" });
      ok("③EL: 「もう一度」44px以上", await tappable(retry), `${await tappable(retry)}`);
      await retry.click();
      await p3.waitForTimeout(400);
      const t2 = (await strip.textContent()) || "";
      const c2 = (await strip.getAttribute("class")) || "";
      ok("②EL: もう一度=青「回答のこり」へ復帰", /回答のこり/.test(t2) && c2.includes("sky"));
    }
  }
  {
    // リロード → 進捗はlocalStorage永続化済み=結論カードが「学習のこり」(青・続きから) になる
    await p3.goto(`${BASE}/e-learning`, { waitUntil: "networkidle" });
    const card2 = p3.locator('section[aria-label^="いまの状態"]').first();
    await card2.waitFor({ state: "visible", timeout: 15000 });
    const t = (await card2.textContent()) || "";
    const c = (await card2.getAttribute("class")) || "";
    const resume = /学習のこり/.test(t) && /続きから/.test(t) && c.includes("sky");
    const done = /全問正答/.test(t) && c.includes("emerald");
    ok("②EL: リロード後=青「学習のこり・続きから」（全問正答なら緑）", resume || done, t.replace(/\s+/g, " ").slice(0, 40));
    if (resume) {
      ok("③EL: 「続きから」44px以上", await tappable(card2.locator("a")), `${await tappable(card2.locator("a"))}`);
      await card2.locator("a").click();
      await p3.waitForURL(/theme=intro-step1/, { timeout: 15000 });
      ok("②EL: 続きから=最後の未完了テーマへ直行", (await p3.locator("#learning-theme").inputValue()) === "intro-step1");
    }
    // 進捗ボードの色文法: 進行中に黄(amber)を使っていない（青=続きをやる指示）
    const board = p3.locator('section[aria-labelledby="elearning-progress-heading"]');
    if (await board.count()) {
      const html = (await board.innerHTML()) || "";
      ok("②EL: 進捗ボード進行中=青（amber不使用）", !html.includes("amber"), "");
    }
  }

  await browser.close();
  const fail = results.filter((r) => !r.pass);
  console.log(`\n==== ${results.length - fail.length}/${results.length} PASS ====`);
  if (fail.length) {
    console.log("FAILED:");
    fail.forEach((f) => console.log(` - ${f.name} ${f.detail}`));
    process.exit(1);
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
