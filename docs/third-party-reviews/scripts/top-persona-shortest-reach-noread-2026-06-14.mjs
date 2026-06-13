/**
 * 無読テスト: トップページ ペルソナ最短到達（柱3レビュー・2026-06-14）
 *
 * 背景: 「あなたの立場から始める」ペルソナバンドがモバイルで1列だったため、
 *   一人親方カードが先頭(建設業)カードのフル高さ分(約180px)だけ下に隠れ、
 *   初訪の一人親方が「自分の立場」エントリに到達するのに余計なスクロールを要した。
 * 対策: バンドをモバイル2列化。建設業は左上(読み順1番目)に温存しつつ、
 *   一人親方を初手の同一行(右上)へ引き上げ。狭い2列では説明文を畳み、
 *   アイコン+役割名+タグで3秒スキャン可能に。
 *
 * ペルソナ: 段落を読まず色とデカい要素しか見ない初訪の一人親方（スマホ390×844）。
 * 判定基準（無読テスト）: 3秒で「自分の立場(一人親方)がどこにあるか」「次にやること=タップ」が分かるか。
 *
 * 検証項目:
 *  A) トップ最上部に0スクロールで主要機能タイル(現場ですぐ使う)が並ぶ
 *  B) 主要機能タイルは44px以上の押しやすいタップ標的
 *  C) ペルソナバンドが2列(モバイル)で、建設業=左上・一人親方=右上が同一行に並ぶ
 *  D) 一人親方カードが建設業カードと "ほぼ同じ高さ位置"(同一行)に出る＝縦に隠れない
 *  E) 一人親方カードに役割名と /for/solo への動線がある
 *
 * 実行: dev server を起動した上で web/ から実行
 *   cp docs/third-party-reviews/scripts/top-persona-shortest-reach-noread-2026-06-14.mjs web/noread-tmp.mjs
 *   cd web && BASE_URL=http://localhost:3000 node noread-tmp.mjs && rm noread-tmp.mjs
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

console.log("\n[/] トップ ペルソナ最短到達 無読テスト（スマホ390×844）");
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);

// ---------- A) 0スクロールで主要機能タイル ----------
const quick = page.locator('section[aria-label="現場ですぐ使う主要機能"]');
check("「現場ですぐ使う」主要機能セクションがある", (await quick.count()) === 1);
const quickTop = await quick.boundingBox();
check("主要機能がファーストビュー内(上端844px以内)から始まる", quickTop !== null && quickTop.y < 844, `y=${quickTop?.y}`);

// ---------- B) 主要機能タイル44px ----------
const quickTiles = quick.locator("ul > li > a");
const tileH = await quickTiles.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
check("主要機能タイルがすべて44px以上", tileH.length > 0 && tileH.every((h) => h >= 44), `n=${tileH.length} min=${tileH.length ? Math.min(...tileH) : "-"}`);

// ---------- C) ペルソナバンド2列・建設業=左上/一人親方=右上 ----------
// 同一hrefがメニュー/フッタにも存在しうるため、必ずバンド section 内に限定する
const band = page.locator('section[aria-labelledby="home-persona-title"]');
const construction = band.locator('a[href="/for/construction"]').first();
const solo = band.locator('a[href="/for/solo"]').first();
check("建設業の実務エントリリンクがある", (await construction.count()) >= 1);
check("一人親方の実務エントリリンクがある", (await solo.count()) >= 1);

// バンドを画面内へスクロールしてから矩形を測る（オフスクリーン要素対策）
await construction.scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
const rect = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
const cBox = await rect(construction);
const sBox = await rect(solo);
check("建設業=左・一人親方=右の2列配置(横並び)", cBox !== null && sBox !== null && sBox.x > cBox.x, `cx=${cBox?.x} sx=${sBox?.x}`);

// ---------- D) 同一行＝縦に隠れない ----------
// 2列で同一行なら上端のズレは小さい(片方が丸ごと下に隠れていない)
const rowDelta = cBox && sBox ? Math.abs(cBox.y - sBox.y) : Infinity;
check("一人親方が建設業と同一行(上端ズレ<80px)＝縦に隠れない", rowDelta < 80, `Δy=${Number.isFinite(rowDelta) ? Math.round(rowDelta) : "n/a"}px`);

// ---------- E) 一人親方カードの中身 ----------
const soloText = (await solo.innerText().catch(() => "")) ?? "";
check("一人親方カードに役割名「一人親方」がある", /一人親方/.test(soloText), soloText.replace(/\s+/g, " ").slice(0, 40));
check("一人親方カードが /for/solo へ誘導", (await solo.getAttribute("href")) === "/for/solo");

await browser.close();
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
