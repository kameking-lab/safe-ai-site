// playwright は web/node_modules にあるため、本スクリプト位置から相対解決する。
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("../../../web/node_modules/playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3901";

const LINK_NAMES = [
  "条文検索を開く",
  "法改正一覧",
  "通達一覧をすべて見る",
  "KY用紙作成ツールを開く",
  "化学物質リスクアセスメント",
  "化学物質データベース",
  "特別教育・技能講習ファインダー",
];

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  // construction は keyword href あり・chemicalSubstances 非空で全パターンを網羅できる。
  await page.goto(`${BASE}/industries/construction`, { waitUntil: "networkidle" });

  const results = [];

  for (const name of LINK_NAMES) {
    const link = page.getByRole("link", { name: new RegExp(name) }).first();
    const box = await link.boundingBox();
    results.push({ label: name, height: box?.height });
  }

  const kw = page.getByRole("link", { name: /#フルハーネス特別教育/ }).first();
  const kwBox = await kw.boundingBox();
  results.push({ label: "キーワードピル(#フルハーネス特別教育)", height: kwBox?.height });

  console.log("=== /industries/[industry] 副リンク6箇所＋キーワードピル 44px 実測 ===");
  for (const r of results) {
    console.log(`${r.label}: height=${r.height}px ${(r.height ?? 0) >= 44 ? "PASS" : "FAIL"}`);
  }

  const allPass = results.length > 0 && results.every((r) => (r.height ?? 0) >= 44);
  console.log(allPass ? `\n無読テスト: PASS (${results.length}/${results.length})` : "\n無読テスト: FAIL");

  await browser.close();
  process.exit(allPass ? 0 : 1);
}

main();
