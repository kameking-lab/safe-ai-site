/**
 * 無読テスト: 教育コース詳細12ページの主要CTA3種（PPTXサンプルDL・ご質問送信・教材についての質問）を44px化（柱0磨き・2026-07-03）
 *
 * ペルソナ: スマホで教育コース詳細を開き、指でタップだけでサンプル資料DL・問い合わせを行う安全担当・職長。
 * 背景: 巡回監査(Explore)で全12ページ共通のテンプレートに存在する主要CTA3箇所が
 *   min-h指定なし（実測36〜40px）のまま残っていたと発見（ConclusionCard自体のaction導線は既に44px化済み）。
 *
 * 検証: 各ページで3ボタンの実boundingBox高さが44px以上であること。
 *
 * 実行: cd web && npm run build && PORT=3100 npm run start
 *   BASE_URL=http://localhost:3100 node docs/third-party-reviews/scripts/education-course-cta-44px-2026-07-03.mjs
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const MOBILE = { width: 390, height: 844 };

const COURSES = [
  "/education/tokubetsu/fullharness",
  "/education/tokubetsu/ashiba",
  "/education/tokubetsu/kensaku-toishi",
  "/education/tokubetsu/sankesu",
  "/education/tokubetsu/tamakake",
  "/education/tokubetsu/teiatsu-denki",
  "/education/roudoueisei/necchu",
  "/education/roudoueisei/shindou",
  "/education/roudoueisei/souon",
  "/education/roudoueisei/youtsu-yobou",
  "/education/hoteikyoiku/chemical-ra",
  "/education/hoteikyoiku/shokucho",
];

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

const checkLinkHeight = async (page, label) => {
  const el = page.getByRole("link", { name: label }).first();
  const box = await el.boundingBox();
  check(`「${label}」が44px以上`, !!box && box.height >= 44, `height=${box?.height}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
const page = await ctx.newPage();

for (const path of COURSES) {
  console.log(`\n[${path}]`);
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(200);
  await checkLinkHeight(page, "PPTXサンプルをダウンロード");
  await checkLinkHeight(page, "ご質問・改善提案を送る");
  // 2番目のCTA文言はページごとに「教材についての質問」「資料請求」等と異なるため、
  // お問い合わせセクション内の href="/contact?...&type=document" で識別する。
  const secondCta = page.locator('a[href*="type=document"]').first();
  const secondCtaLabel = (await secondCta.textContent())?.trim() ?? "(2番目のCTA)";
  const secondCtaBox = await secondCta.boundingBox();
  check(`「${secondCtaLabel}」が44px以上`, !!secondCtaBox && secondCtaBox.height >= 44, `height=${secondCtaBox?.height}`);
}

console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);

await browser.close();
process.exit(fail === 0 ? 0 : 1);
