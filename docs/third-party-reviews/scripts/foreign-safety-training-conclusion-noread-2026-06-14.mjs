/**
 * 無読テスト: 柱0 /foreign-workers/safety-training（多言語安全教育教材ビルダー）結論カード（2026-06-14）
 *
 * 対象: 雇入れ時教育・TBM 用の多言語教材ビルダー入口。
 *   従来は h1 直下に2文の説明段落があり「規模」「次にやること」を読まないと分からなかった。
 *   柱0 ConclusionCard（デカ数字＝収録教材数／漢字短ラベル「多言語対応」／主アクション「教材を選ぶ」）を最上部へ追加し、
 *   旧説明段落の内容（業種×トピックを対訳で表示・印刷／雇入れ時教育・TBM）はカード description へ集約（消さず格納）。
 *
 * ペルソナ: 外国人作業員に雇入れ時の安全教育をさせたい安全担当（スマホ390×844）。段落は読まない。
 * 判定基準（無読テスト）: 3秒で「いまの状態（N教材・多言語対応）」と「次にやること（教材を選ぶ）」が言えるか。
 *
 * 検証項目:
 *  A) 結論カード（role=status「いまの状態: 多言語対応」）が最上部に見える
 *  B) デカ数字＋単位「教材」が読める（収録規模が一目で分かる）
 *  C) 主アクション「教材を選ぶ →」リンクが44px以上のタップ標的
 *  D) 「教材を選ぶ」を押すとビルダー(#material-builder)へスクロール誘導される
 *  E) 言語数チップ「5言語対訳」と「無料」チップが読める
 *  F) industry クエリ付き(?industry=manufacturing)でも結論カードが常に出る（SSR・選択非依存）
 *
 * 実行: dev server (localhost:3000) を起動した上で web/ から実行
 *   cp ../docs/third-party-reviews/scripts/foreign-safety-training-conclusion-noread-2026-06-14.mjs noread-tmp.mjs
 *   node noread-tmp.mjs && rm noread-tmp.mjs
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const MOBILE = { width: 390, height: 844 };
const MIN_TAP = 44;
const PATH = "/foreign-workers/safety-training";

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

const tapOk = async (locator) => {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  return { ok: !!box && box.height >= MIN_TAP, h: box?.height };
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: MOBILE });

console.log("\n[/foreign-workers/safety-training] 柱0 結論カード（スマホ390×844）");
await page.goto(`${BASE}${PATH}`, { waitUntil: "networkidle" });

// A) 結論カード（role=status）
const card = page.getByRole("status", { name: /いまの状態: 多言語対応/ });
check("結論カード role=status「いまの状態: 多言語対応」が見える", await card.isVisible());

// B) デカ数字＋単位「教材」
check("デカ数字の単位「教材」がカード内に見える", await card.getByText("教材").first().isVisible());

// C) 主アクション「教材を選ぶ」44px
{
  const r = await tapOk(page.getByRole("link", { name: /教材を選ぶ/ }));
  check("主アクション「教材を選ぶ →」が44px以上", r.ok, `h=${r.h}`);
}

// D) アンカー誘導
{
  const action = page.getByRole("link", { name: /教材を選ぶ/ });
  const href = await action.getAttribute("href");
  check("「教材を選ぶ」がビルダー #material-builder へ誘導", href === "#material-builder", `href=${href}`);
  const anchorExists = (await page.locator("#material-builder").count()) > 0;
  check("誘導先 #material-builder がページ内に存在する", anchorExists);
}

// E) 言語数チップ・無料チップ
check("「5言語対訳」チップが読める", await card.getByText("5言語対訳").isVisible());
check("「無料」チップが読める", await card.getByText("無料").isVisible());

// F) クエリ付き（選択状態に依らずSSRで常に結論カードが出る）
console.log("\n[?industry=manufacturing] 選択非依存で結論カードが出る");
await page.goto(`${BASE}${PATH}?industry=manufacturing`, { waitUntil: "networkidle" });
check(
  "industry指定でも結論カード role=status が出る",
  await page.getByRole("status", { name: /いまの状態: 多言語対応/ }).isVisible(),
);

await page.screenshot({ path: "foreign-safety-training-conclusion-2026-06-14.png", fullPage: false });
await browser.close();

console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
