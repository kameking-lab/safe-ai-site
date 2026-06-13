/**
 * 無読テスト: 事故DB(/accidents)＋判例(/court-cases) ビジュアルファースト化（柱0・2026-06-11）
 *
 * ペルソナ: 「段落を絶対に読まず、色とデカい要素しか見ない」現場の職長（スマホ390×844）。
 * 判定基準（社長指示の無読テスト）: 本文を読まずに3秒で
 *   「いまの画面で何が分かるか」「次にやること（タップ先）」が言えるか。
 *
 * 検証項目:
 *  A) /accidents: 事故の型ピクトグラムグリッドがファーストビュー付近にあり、
 *     タイル（絵＋型名＋件数）をタップすると型の正確な絞り込み結果へ直行する
 *  B) 一覧行・詳細ページ: 型ピクトグラム＋重篤度の色文法（死亡=赤solid/軽傷=グレー、緑は使わない）
 *  C) /court-cases: 分野アイコングリッド（9分野・件数）→タップで絞り込み、件数が一致する
 *  D) /court-cases/[id]: 結論（裁判所の判断）が事案の概要より先に来る（結論ファースト）
 *
 * 実行: dev server (localhost:3000) を起動した上で、web/ 配下に一時コピーして実行
 *   （ESM解決のため web/node_modules が見える場所から実行する）
 *   cp docs/third-party-reviews/scripts/accidents-courts-noread-2026-06-11.mjs web/noread-tmp.mjs
 *   cd web && node noread-tmp.mjs && rm noread-tmp.mjs
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const MOBILE = { width: 390, height: 844 };

let pass = 0;
let fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) {
    pass++;
    console.log(`  PASS: ${name}`);
  } else {
    fail++;
    console.log(`  FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: MOBILE });

// ---------- A) /accidents 型グリッド ----------
console.log("\n[A] /accidents 事故の型グリッド（スマホ390×844）");
await page.goto(`${BASE}/accidents`, { waitUntil: "networkidle" });

const grid = page.getByTestId("accident-type-grid");
check("型グリッドが存在する", (await grid.count()) === 1);
const gridBox = await grid.boundingBox();
check(
  "型グリッドがファーストビュー〜1.5画面以内に始まる（スクロールせず気付ける）",
  gridBox !== null && gridBox.y < MOBILE.height * 1.5,
  `y=${gridBox?.y}`,
);
const tiles = grid.locator("a");
const tileCount = await tiles.count();
check("型タイルが6個以上ある（主要な型を網羅）", tileCount >= 6, `count=${tileCount}`);
const pictoCount = await grid.locator("[data-testid^='accident-picto-']").count();
check("全タイルにピクトグラムがある", pictoCount === tileCount, `${pictoCount}/${tileCount}`);

// 先頭タイル（件数最多の型）の件数と型名を控えてタップ
const firstTile = tiles.first();
const firstTileText = await firstTile.innerText();
const firstTileCount = Number((firstTileText.match(/([\d,]+)\s*件/) ?? [])[1]?.replaceAll(",", ""));
const firstType = await firstTile.locator("[data-testid^='accident-picto-']").getAttribute("aria-label");
const firstTypeName = firstType?.replace("事故の型: ", "") ?? "";
check("先頭タイルに件数デカ数字がある", Number.isFinite(firstTileCount) && firstTileCount > 0, firstTileText);

await firstTile.click();
await page.waitForLoadState("networkidle");
check("タップで型絞り込みURLへ遷移（acc_type付き）", page.url().includes("acc_type="));
const resultsAnchor = page.locator("#accident-results");
check("結果セクションが表示されている", (await resultsAnchor.count()) === 1);
// 型フィルタ select に型が反映されている（読み込みに少し猶予）
await page.waitForTimeout(1500);
const selectValue = await page.locator("#accident-type-filter").inputValue().catch(() => null);
check(`型フィルタが「${firstTypeName}」に反映されている`, selectValue === firstTypeName, `select=${selectValue}`);
// 表示行の型チップがすべて選んだ型
const rowTypes = await page
  .locator("#accident-results article span:has([data-testid^='accident-picto-'])")
  .allInnerTexts();
check(
  "結果の行がすべて選んだ型（正確な型絞り込み・キーワではない）",
  rowTypes.length > 0 && rowTypes.every((t) => t.trim() === firstTypeName),
  `rows=${rowTypes.length}`,
);

// ---------- B) 重篤度の色文法＋詳細ページ ----------
console.log("\n[B] 重篤度の色文法と詳細ページ");
// 一覧行の重篤度バッジ: 死亡=赤solid（bg-rose-600）/軽傷=グレー。緑(emerald)は不使用。
const severityBadges = await page
  .locator("#accident-results article")
  .evaluateAll((articles) =>
    articles.slice(0, 40).map((a) => {
      const badge = [...a.querySelectorAll("span")].find((s) =>
        ["死亡", "重傷", "中等傷", "軽傷"].includes((s.textContent ?? "").trim()),
      );
      return badge ? { text: badge.textContent.trim(), cls: badge.className } : null;
    }),
  );
const found = severityBadges.filter(Boolean);
check("一覧行に重篤度バッジがある", found.length > 0, `rows=${found.length}`);
const grammarOk = found.every(({ text, cls }) => {
  if (text === "死亡") return cls.includes("bg-rose-600");
  if (text === "重傷") return cls.includes("rose");
  if (text === "中等傷") return cls.includes("amber");
  if (text === "軽傷") return cls.includes("slate");
  return false;
});
check("重篤度の色文法（死亡=赤solid/重傷=赤/中等傷=黄/軽傷=グレー）", grammarOk);
check(
  "負傷バッジに緑（emerald）を使っていない",
  found.every(({ cls }) => !cls.includes("emerald")),
);

// 詳細ページ: 先頭行から遷移
await page.locator("#accident-results article a[href^='/accidents/']").first().click();
// Next.js のクライアント遷移は networkidle では待てないため、URLと要素の出現を待つ
await page.waitForURL(/\/accidents\/[^?#]+/);
const headerPicto = page.locator("header [data-testid^='accident-picto-']").first();
await headerPicto.waitFor({ timeout: 10_000 });
check("詳細ヘッダーに型ピクトグラムがある", (await headerPicto.count()) === 1);
const pictoBox = await headerPicto.boundingBox();
check("詳細の型ピクトグラムはデカい（40px以上）", pictoBox !== null && pictoBox.height >= 40, `h=${pictoBox?.height}`);
check(
  "詳細ヘッダーがファーストビュー内",
  pictoBox !== null && pictoBox.y + pictoBox.height <= MOBILE.height,
  `y=${pictoBox?.y}`,
);

// ---------- C) /court-cases 分野グリッド ----------
console.log("\n[C] /court-cases 分野アイコングリッド");
await page.goto(`${BASE}/court-cases`, { waitUntil: "networkidle" });
const fieldGrid = page.getByTestId("court-field-grid");
check("分野グリッドが存在する", (await fieldGrid.count()) === 1);
const fieldGridBox = await fieldGrid.boundingBox();
check(
  "分野グリッドがファーストビュー〜1.5画面以内に始まる",
  fieldGridBox !== null && fieldGridBox.y < MOBILE.height * 1.5,
  `y=${fieldGridBox?.y}`,
);
const fieldTiles = fieldGrid.locator("button");
const fieldTileCount = await fieldTiles.count();
check("分野タイルが9個ある（全分野網羅）", fieldTileCount === 9, `count=${fieldTileCount}`);
// 件数の合計 = 総件数（ヘッダーのデカ数字と一致）
const tileTexts = await fieldTiles.allInnerTexts();
const sum = tileTexts
  .map((t) => Number((t.match(/(\d+)\s*件/) ?? [])[1]))
  .reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
const headerCountText = await page.locator("header h1 + *, header h1").first().evaluate(() => {
  const h = document.querySelector("h1");
  return h?.parentElement?.textContent ?? "";
});
const headerCount = Number((headerCountText.match(/(\d+)\s*件/) ?? [])[1]);
check("分野タイル件数の合計＝ヘッダーの総件数", Number.isFinite(headerCount) && sum === headerCount, `sum=${sum} header=${headerCount}`);

// タップで絞り込み→表示件数がタイルの件数と一致
const targetTile = fieldTiles.first();
const targetText = await targetTile.innerText();
const targetCount = Number((targetText.match(/(\d+)\s*件/) ?? [])[1]);
await targetTile.click();
await page.waitForTimeout(600);
check("タップでタイルが選択状態になる（aria-pressed）", (await targetTile.getAttribute("aria-pressed")) === "true");
const shownText = await page.getByText(/件を表示（全/).first().innerText();
// 柱C-6: ページネーション導入後は「{絞込総数} 件中 {表示中} 件を表示（全…）」。
// 表示中は PAGE_SIZE で頭打ちになるため、絞込総数（件中の手前）をタイル件数と照合する。
const filteredCount = Number((shownText.match(/(\d+)\s*件中/) ?? [])[1]);
check("絞り込み総数＝タイルの件数", filteredCount === targetCount, `filtered=${filteredCount} tile=${targetCount}`);

// ---------- D) 判例詳細: 結論ファースト ----------
console.log("\n[D] /court-cases/[id] 結論ファースト");
await page.locator("ul a[href^='/court-cases/']").first().click();
// クライアント遷移後、判例詳細の見出しが描画されるまで待つ
await page.waitForURL(/\/court-cases\/.+/);
await page.locator("h2", { hasText: "事案の概要" }).waitFor({ timeout: 10_000 });
const order = await page.evaluate(() => {
  const headings = [...document.querySelectorAll("h2")].map((h) => h.textContent ?? "");
  const conclusion = headings.findIndex((t) => t.includes("結論"));
  const summary = headings.findIndex((t) => t.includes("事案の概要"));
  return { conclusion, summary };
});
check("「結論｜裁判所の判断」見出しがある", order.conclusion >= 0);
check("結論が事案の概要より先に来る", order.conclusion >= 0 && order.conclusion < order.summary, JSON.stringify(order));

await browser.close();
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
