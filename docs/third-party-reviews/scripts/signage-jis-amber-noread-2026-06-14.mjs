/**
 * サイネージ JIS安全色「注意黄＝黒系文字」無読テスト 2026-06-14（柱0 ビジュアルファースト）
 *
 * ペルソナ: 数メートル先のTV(1920x1080)を3秒見て、色と数字だけで状態が言える現場監督。
 *
 * 検証対象（このサイクルの変更）: 明るい注意黄(amber-500 #f59e0b)の上に白文字を
 * 乗せると遠目で潰れる(約2.1:1, WCAG不適合)。結論ストリップが既に amber→text-amber-950
 * で統一しているのに、リスク予測の「中」バッジと現場安全状態の「要対応」バッジだけ
 * 白文字のままだった。これを黒系文字(amber-950)へ揃えたことを、実画面の computed color で確認する。
 *
 * 「要対応」バッジは未是正の重大ヒヤリ1件を localStorage に仕込むと確定で描画される
 * （buildDailyActions: 未resolved×potential=high → severity "alert"）。
 *
 * 実行方法（dev はハングするため build+start の本番サーバーで実行する）:
 *   cd web && npm run build && npm run start   # 別ターミナル
 *   cp docs/third-party-reviews/scripts/signage-jis-amber-noread-2026-06-14.mjs web/tmp-noread.mjs
 *   cd web && node tmp-noread.mjs && rm tmp-noread.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
let pass = 0;
let fail = 0;
const failures = [];

function check(name, cond, detail = "") {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${name}`);
  } else {
    fail += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/**
 * 任意の CSS 色文字列(lab()/oklch()/rgb() いずれでも)を [r,g,b] 0-255 に正規化する。
 * このスタック(Tailwind v4 / Next 16)の getComputedStyle は色を lab() で返すため、
 * 文字列を数値で直接判定すると誤判定する。ブラウザに canvas で塗らせて実ピクセルを読む。
 */
const COLOR_TO_RGB = (color) => {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const c = cv.getContext("2d");
  c.fillStyle = "#000";
  c.fillStyle = color;
  c.fillRect(0, 0, 1, 1);
  const [r, g, b] = c.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
};

function luminance([r, g, b]) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** 1件の未是正・重大ヒヤリ。これで「要対応」amber バッジが確定描画される。 */
const NEARMISS_SEED = JSON.stringify([
  {
    id: "noread-seed-1",
    date: "2026-06-14",
    site: "テスト現場",
    reporter: "無読テスト",
    type: "墜落・転落",
    location: "2F開口部",
    situation: "養生不足の開口部に接近した",
    cause: "表示・養生の不足",
    countermeasure: "開口部養生と表示の徹底",
    potential: "high",
    resolved: false,
    savedAt: "2026-06-14T06:00:00.000Z",
  },
]);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();

// 記録キットに未是正の重大ヒヤリを1件仕込む（現場安全状態パネルを確定描画）
await page.addInitScript((seed) => {
  window.localStorage.setItem("safe-ai:nearmiss-list:v1", seed);
}, NEARMISS_SEED);

await page.goto(`${BASE}/signage`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-signage-conclusion]", { timeout: 20000 });

// ---------------------------------------------------------------------------
console.log("\n■ 現場安全状態パネル: 注意黄バッジが黒系文字（遠目で潰れない）");
{
  // 「要対応 N件」チップが出るまで待つ（localStorage 反映後の再描画）
  const alertChip = page.locator("text=/要対応\\s*\\d+件/").first();
  await alertChip.waitFor({ timeout: 20000 });
  check("「要対応 N件」チップが描画される", await alertChip.isVisible());

  const chip = await alertChip.evaluate((el, toRgbSrc) => {
    const toRgb = new Function("color", `return (${toRgbSrc})(color)`);
    const s = getComputedStyle(el);
    return { fg: toRgb(s.color), bg: toRgb(s.backgroundColor) };
  }, COLOR_TO_RGB.toString());
  check(
    `要対応チップの文字色が黒系(輝度<0.4) 実測 rgb=${chip.fg}`,
    luminance(chip.fg) < 0.4,
    "白文字は遠目で潰れる(amber-500×白≈2.1:1)",
  );
  // amber-500(#f59e0b)=rgb(245,158,11): 赤≈緑高め・青低い、明るい注意黄
  check(
    `要対応チップ背景が注意黄系(R高・B低) 実測 rgb=${chip.bg}`,
    chip.bg[0] >= 220 && chip.bg[1] >= 130 && chip.bg[1] <= 200 && chip.bg[2] <= 90,
  );
  // 黒文字×注意黄の明暗差が遠目でも効く(輝度差>=0.4)ことを確認
  check(
    `文字と背景の輝度差>=0.4 実測${(luminance(chip.bg) - luminance(chip.fg)).toFixed(2)}`,
    luminance(chip.bg) - luminance(chip.fg) >= 0.4,
  );
}

// ---------------------------------------------------------------------------
console.log("\n■ 不変条件: 画面上のどこにも『明るい注意黄 × 白文字』が無い");
{
  // amber-300/400/500 系（赤緑が高く青が低い、いわゆる注意黄）の背景を持つ要素を全走査し、
  // その文字色が白(輝度>0.85)でないことを確認する。色文法が崩れていれば必ずここで落ちる。
  const offenders = await page.evaluate((toRgbSrc) => {
    const toRgb = new Function("color", `return (${toRgbSrc})(color)`);
    const lum = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const out = [];
    for (const el of Array.from(document.querySelectorAll("*"))) {
      const s = getComputedStyle(el);
      // 透明背景(alpha 0)は塗っても下地が出るので除外: rgba の alpha を見る
      if (/rgba?\([^)]*,\s*0\s*\)/.test(s.backgroundColor)) continue;
      const [r, g, b] = toRgb(s.backgroundColor);
      const isCautionYellow = r >= 220 && g >= 130 && g <= 200 && b <= 90;
      if (!isCautionYellow) continue;
      // 文字を持つ要素だけ（空コンテナは対象外）
      const hasText = (el.textContent ?? "").trim().length > 0;
      if (hasText && lum(toRgb(s.color)) > 0.85) {
        out.push(`${el.tagName}.${el.className}`.slice(0, 120));
      }
    }
    return out;
  }, COLOR_TO_RGB.toString());
  check(
    `明るい注意黄に白文字の要素が0件 実測${offenders.length}件`,
    offenders.length === 0,
    offenders.join(" | "),
  );
}

// ---------------------------------------------------------------------------
console.log("\n■ 不可侵: サイネージ1画面フィット維持");
{
  const fit = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
  }));
  check(
    `1画面フィット維持 scrollHeight=${fit.scrollHeight} <= viewport=${fit.innerHeight}`,
    fit.scrollHeight <= fit.innerHeight + 1,
  );
}

// ---------------------------------------------------------------------------
console.log("\n■ 結論ストリップ: デカ主文＋tone が成立（柱0の基本不変条件）");
{
  const strip = page.locator("[data-signage-conclusion]");
  const tone = await strip.getAttribute("data-tone");
  check(
    `結論ストリップ tone が定義4色のいずれか 実測${tone}`,
    ["red", "amber", "green", "slate"].includes(tone ?? ""),
  );
  const label = page.locator("[data-signage-conclusion-label]");
  const fontSize = await label.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  check(`主文がデカ文字(>=40px) 実測${fontSize}px`, fontSize >= 40);
}

await ctx.close();
await browser.close();

console.log(`\n==== 無読テスト結果: ${pass} PASS / ${fail} FAIL ====`);
if (failures.length) {
  console.log("失敗項目:");
  for (const f of failures) console.log(` - ${f}`);
  process.exit(1);
}
