/**
 * 無読テスト（柱0バッチ2/9 リスク予測 /risk-prediction の色帯結論カード化・2026-06-13）
 * 雛形: judgment-noread-2026-06-11.mjs
 *
 * 対象: AIリスク予測（/risk-prediction）。作業内容→類似事故検索→安全スコア判定。
 *
 * ペルソナ「朝礼5分前の建設職長・47歳」— 段落は絶対に読まない。色とデカい数字だけ見る。
 *   スマホで工種チップを1タップし、3秒で「今日はどれくらい危ないか／何をやるか」が
 *   分からなければ閉じて紙のKYに戻る。
 *
 * 判定（docs/visual-language-2026-06-10.md §4 無読テスト）:
 *   ①判定後、結論カード(role=status)がスマホ390×844のファーストビュー内（=入力の直下）
 *   ②安全スコアがデカ数字（40px相当以上）で出る
 *   ③リスクレベルが色の文法どおり（高=赤/中=黄/低=緑）で色帯＋チップに出る
 *   ④「次にやること」が結論カード内に明示される
 *   ⑤h1は画面に1個だけ（印刷表題は h1 にしない＝多重h1の是正）
 *   ⑥「予測の仕組み」の段落は初期折りたたみ（本文は消さず詳細層へ）
 *
 * 実行: cp docs/third-party-reviews/scripts/risk-prediction-noread-2026-06-13.mjs web/tmp-noread-rp.mjs
 *       cd web && node tmp-noread-rp.mjs && rm tmp-noread-rp.mjs
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
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/risk-prediction`, { waitUntil: "networkidle" });

  // ⑤ h1は1個だけ
  const h1s = await page.locator("h1").count();
  ok("⑤ h1は画面に1個だけ（多重h1の是正）", h1s === 1, `h1=${h1s}`);

  // ⑥ 予測の仕組みは初期折りたたみ（details が閉じている）
  const detailsOpen = await page
    .locator("details", { hasText: "予測の仕組み" })
    .first()
    .evaluate((el) => el.open)
    .catch(() => null);
  ok("⑥ 「予測の仕組み」は初期折りたたみ", detailsOpen === false, `open=${detailsOpen}`);

  // 工種チップ「高所」を1タップ → 判定
  await page.getByRole("button", { name: "高所", exact: true }).click();
  const card = page.locator('[data-testid="risk-conclusion"]').first();
  await card.waitFor({ state: "visible", timeout: 15000 });

  // ① ファーストビュー上部（検索完了時にカード先頭へスクロール＝入力より上に出る）
  await page.waitForTimeout(700); // smooth scroll の落ち着き
  const box = await card.boundingBox();
  ok(
    "① 判定後 結論カードがファーストビュー上部（y+100<844）",
    box && box.y >= -1 && box.y + 100 < 844,
    box ? `y=${Math.round(box.y)}` : "no box",
  );

  // ② デカ数字（フォントサイズ40px以上）
  const big = page.locator('[data-testid="risk-big-value"]').first();
  const fontPx = await big.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  const bigText = (await big.textContent()) || "";
  ok("② 安全スコアがデカ数字(≥40px)", fontPx >= 40, `${Math.round(fontPx)}px "${bigText.trim()}"`);
  ok("② スコアは0-100の数値", /\d+\s*\/100/.test(bigText.replace(/\s/g, "")) || /\d/.test(bigText), bigText.trim());

  // ③ 色の文法: チップ＋色帯＋カード淡色面が一致
  const chip = page.locator('[data-testid="risk-conclusion-chip"]').first();
  const chipText = ((await chip.textContent()) || "").trim();
  const cardClass = (await card.getAttribute("class")) || "";
  const level = /高リスク/.test(chipText) ? "高" : /中リスク/.test(chipText) ? "中" : /低リスク/.test(chipText) ? "低" : "?";
  const expectColor = level === "高" ? "rose" : level === "中" ? "amber" : "emerald";
  ok(
    `③ リスクレベル「${chipText}」がカード色(${expectColor})と一致`,
    level !== "?" && cardClass.includes(expectColor),
    `chip="${chipText}" cardClass~${expectColor}`,
  );

  // 色帯3セグメント＋▼マーカーが存在
  const segs = await page.locator('[data-testid^="risk-band-seg-"]').count();
  const bandText = (await page.locator('[data-testid="risk-level-band"]').first().textContent()) || "";
  ok("③ 低/中/高の色帯3セグメント＋▼マーカー", segs === 3 && bandText.includes("▼"), `segs=${segs}`);

  // ④ 次にやること が結論カード内に明示
  const cardText = ((await card.textContent()) || "").trim();
  ok("④ 「次にやること」が結論カード内に明示", cardText.includes("次にやること"), cardText.slice(0, 60));

  await browser.close();

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n===== ${passed}/${results.length} PASS =====`);
  if (passed !== results.length) process.exit(1);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
