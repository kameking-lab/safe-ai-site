/**
 * 無読テスト: /goods・/leaflet・/newsletter の残タップ標的を44px化（2026-07-03）
 *
 * 背景: 柱0スウィープの補充調査で、/goods の商品カード内「Amazonで見る」「楽天で見る」
 * （GoodsCard、掲載品目分だけ繰り返し出現する主要購買導線）と「選び方ガイド」内の
 * 「Amazonで探す」「楽天で探す」、女性向けフィルタートグルが min-h 未指定で高さ約32〜40pxと
 * 44px未満だった。/leaflet の唯一の主要CTA「印刷 / PDF保存」ボタンも同様。
 * /newsletter の本登録フォーム（NewsletterForm・compact未使用）のメール入力欄・業種セレクトも
 * py-2.5 のみで44px未満だった。
 * 対策: 該当箇所に min-h-[44px] を付与（寸法のみ、文言・onClick/href・機能不変）。
 *
 * ペルソナ: 段落を読まず、現場でスマホ(390×844)を親指操作する安全担当。
 * 判定基準（無読テスト）: 保護具の購入導線・リーフレット印刷・メルマガ登録が指で確実に押せるか。
 *
 * 実行: own prod server (localhost:3100) を起動した上で web/ から実行
 *   node ../docs/third-party-reviews/scripts/goods-leaflet-newsletter-44px-noread-2026-07-03.mjs
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
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
const context = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });

{
  const page = await context.newPage();
  console.log("\n[/goods] タップ標的 44px 無読テスト（スマホ390×844）");
  await page.goto(`${BASE}/goods`, { waitUntil: "domcontentloaded" });
  await page.locator("main").first().waitFor({ state: "visible", timeout: 10000 });
  await page.getByRole("heading", { level: 1 }).first().waitFor({ state: "visible", timeout: 10000 });

  {
    const amazonLinks = page.getByRole("link", { name: "Amazonで見る" });
    const rakutenLinks = page.getByRole("link", { name: "楽天で見る" });
    const aCount = await amazonLinks.count();
    const rCount = await rakutenLinks.count();
    const aHeights = await amazonLinks.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    const rHeights = await rakutenLinks.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    check(
      "商品カードの「Amazonで見る」が全て44px以上",
      aCount > 0 && aHeights.every((h) => h >= 44),
      `count=${aCount} heights=${aHeights.join(",")}`
    );
    check(
      "商品カードの「楽天で見る」が全て44px以上",
      rCount > 0 && rHeights.every((h) => h >= 44),
      `count=${rCount} heights=${rHeights.join(",")}`
    );
  }

  {
    const womenToggle = page.getByRole("button", { name: /女性向け/ });
    const h = await womenToggle.evaluate((e) => e.getBoundingClientRect().height);
    check("女性向けフィルタートグルが44px以上", h >= 44, `height=${h}`);
  }

  {
    const guideAmazon = page.getByRole("link", { name: "Amazonで探す" });
    const guideRakuten = page.getByRole("link", { name: "楽天で探す" });
    const gaCount = await guideAmazon.count();
    const grCount = await guideRakuten.count();
    const gaHeights = await guideAmazon.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    const grHeights = await guideRakuten.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    check(
      "選び方ガイドの「Amazonで探す」が全て44px以上",
      gaCount > 0 && gaHeights.every((h) => h >= 44),
      `count=${gaCount} heights=${gaHeights.join(",")}`
    );
    check(
      "選び方ガイドの「楽天で探す」が全て44px以上",
      grCount > 0 && grHeights.every((h) => h >= 44),
      `count=${grCount} heights=${grHeights.join(",")}`
    );
  }

  {
    const h1Count = await page.getByRole("heading", { level: 1 }).count();
    check("h1は1個のみ", h1Count === 1, `count=${h1Count}`);
  }

  await page.close();
}

{
  const page = await context.newPage();
  console.log("\n[/leaflet] タップ標的 44px 無読テスト（スマホ390×844）");
  await page.goto(`${BASE}/leaflet`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { level: 1 }).first().waitFor({ state: "visible", timeout: 10000 });

  {
    const printBtn = page.getByRole("button", { name: /印刷.*PDF保存/ });
    const h = await printBtn.evaluate((e) => e.getBoundingClientRect().height);
    check("「印刷 / PDF保存」ボタンが44px以上", h >= 44, `height=${h}`);
  }

  {
    const h1Count = await page.getByRole("heading", { level: 1 }).count();
    check("h1は1個のみ", h1Count === 1, `count=${h1Count}`);
  }

  await page.close();
}

{
  const page = await context.newPage();
  console.log("\n[/newsletter] タップ標的 44px 無読テスト（スマホ390×844）");
  await page.goto(`${BASE}/newsletter`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { level: 1 }).first().waitFor({ state: "visible", timeout: 10000 });

  {
    const emailInput = page.locator("#nl-email");
    await emailInput.waitFor({ state: "visible", timeout: 5000 });
    const h = await emailInput.evaluate((e) => e.getBoundingClientRect().height);
    check("メールアドレス入力欄が44px以上", h >= 44, `height=${h}`);
  }

  {
    const industrySelect = page.locator("#nl-industry");
    const h = await industrySelect.evaluate((e) => e.getBoundingClientRect().height);
    check("業種セレクトが44px以上", h >= 44, `height=${h}`);
  }

  {
    const submitBtn = page.getByRole("button", { name: /研究プロジェクトの応援者として登録する/ });
    const h = await submitBtn.evaluate((e) => e.getBoundingClientRect().height);
    check("登録ボタンが44px以上（非退行）", h >= 44, `height=${h}`);
  }

  {
    const h1Count = await page.getByRole("heading", { level: 1 }).count();
    check("h1は1個のみ", h1Count === 1, `count=${h1Count}`);
  }

  await page.close();
}

await browser.close();
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
