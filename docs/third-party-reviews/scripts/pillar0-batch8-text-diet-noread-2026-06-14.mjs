/**
 * 無読テスト: 柱0バッチ8 ハブ/ナビ系 文字ダイエット＋44pxタップ標的（2026-06-14）
 *
 * 対象: /industries（ヘッダー文字ダイエット）, /glossary（五十音インデックス44px化）,
 *       /diversity（導入文ダイエット＋目次44px化）。
 *
 * ペルソナ: 段落を読まず、色とデカい要素しか見ない初訪の一人親方（スマホ390×844）。
 * 判定基準（無読テスト）: 3秒で「どこに何があるか」「次にやること（業種を選ぶ等）」が分かるか。
 *
 * 検証項目:
 *  /industries
 *   A) 見出し直下が1文に圧縮され、クローラ向けキーワード段落（"ロングテール"）が画面に無い
 *   B) 業種カード（/industries/* リンク）が並び、タイルは min 44px で押せる
 *  /glossary
 *   C) 五十音インデックスの「あ行」等ボタンが 44×44px 以上のタップ標的
 *   D) 見出し「安全用語辞書」が見える
 *  /diversity
 *   E) 目次のジャンプリンクが min 44px の高さ
 *   F) 導入文が短縮されつつ「一次資料・専門家に確認」の注意書きは残っている
 *
 * 実行: dev server (localhost:3000) を起動した上で web/ から実行
 *   cp ../docs/third-party-reviews/scripts/pillar0-batch8-text-diet-noread-2026-06-14.mjs noread-tmp.mjs
 *   node noread-tmp.mjs && rm noread-tmp.mjs
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const MOBILE = { width: 390, height: 844 };
const MIN_TAP = 44;

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

// ---------- /industries ----------
console.log("\n[/industries] ヘッダー文字ダイエット（スマホ390×844）");
await page.goto(`${BASE}/industries`, { waitUntil: "networkidle" });
check(
  "クローラ向けキーワード段落（ロングテール）が画面に無い",
  (await page.getByText(/ロングテール/).count()) === 0,
);
check("見出し直下の1文ガイドが見える", await page.getByText(/あなたの業種を選ぶと/).isVisible());
const indCards = page.locator('a.border-2[href^="/industries/"]');
const indCount = await indCards.count();
check("業種カードが並ぶ（10業種）", indCount >= 10, `count=${indCount}`);
{
  await indCards.first().scrollIntoViewIfNeeded();
  const box = await indCards.first().boundingBox();
  check("業種カードのタップ標的が44px以上", !!box && box.height >= MIN_TAP, `h=${box?.height}`);
}

// ---------- /glossary ----------
console.log("\n[/glossary] 五十音インデックス44px化");
await page.goto(`${BASE}/glossary`, { waitUntil: "networkidle" });
check(
  "見出し「安全用語辞書」が見える",
  await page.getByRole("heading", { name: "安全用語辞書" }).isVisible(),
);
{
  const kana = page.getByRole("button", { name: "あ行" });
  const box = await kana.boundingBox();
  check(
    "五十音ボタンが44×44px以上のタップ標的",
    !!box && box.height >= MIN_TAP && box.width >= MIN_TAP,
    `${box?.width}×${box?.height}`,
  );
}

// ---------- /diversity ----------
console.log("\n[/diversity] 導入文ダイエット＋目次44px化");
await page.goto(`${BASE}/diversity`, { waitUntil: "networkidle" });
{
  const tocLink = page.locator('nav[aria-label="目次"] a').first();
  const box = await tocLink.boundingBox();
  check("目次ジャンプリンクが44px以上の高さ", !!box && box.height >= MIN_TAP, `h=${box?.height}`);
}
check(
  "短縮後も一次資料確認の注意書きが残る",
  (await page.getByText(/一次資料・専門家にご確認ください/).count()) > 0,
);

await browser.close();

console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
