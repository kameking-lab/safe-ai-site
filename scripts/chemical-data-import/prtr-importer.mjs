#!/usr/bin/env node
/**
 * PRTR (化学物質排出移動量届出制度) 対象物質統合スクリプト [スケルトン]
 *
 *   $ node scripts/chemical-data-import/prtr-importer.mjs
 *
 * 出典: 環境省 PRTR 制度 政令別表
 *   https://www.env.go.jp/chemi/prtr/risk0.html
 *
 * 対象:
 *   - 第一種指定化学物質 (462 物質)
 *   - 第二種指定化学物質 (100 物質)
 *
 * Phase 1a (2026-05-24) ではスケルトンのみ実装。実データ統合は Phase 1b で対応。
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const TARGET_JSON = join(REPO_ROOT, "web", "src", "data", "concentration-limits.json");
const TMP_DIR = join(__dirname, "tmp");

const PRTR_INDEX_URL = "https://www.env.go.jp/chemi/prtr/risk0.html";

// TODO(phase-1b): PRTR政令別表 Excel ファイルの URL を確定
//   候補: 環境省サイト掲載の最新版 xlsx (年度更新)
async function downloadPrtrLists() {
  await mkdir(TMP_DIR, { recursive: true });
  throw new Error("[skeleton] PRTR データ取得は Phase 1b で実装");
}

// TODO(phase-1b): Excel パース (xlsx ライブラリ追加が必要)
function parsePrtrExcel(/* xlsxBuffer */) {
  // 期待する出力形式:
  // [
  //   {
  //     prtrNumber: 1,             // 政令通し番号
  //     classType: "first" | "second",
  //     cas: "108-88-3",
  //     nameJa: "トルエン",
  //     thresholdTonPerYear: 1,    // 取扱量しきい値
  //     specifiedFirstClass: false, // 特定第一種(発がん性等)該当有無
  //   }, ...
  // ]
  return [];
}

// TODO(phase-1b): マージロジック
//   - 既存エントリがあれば: regulationTags に "prtr-first" / "prtr-second" を追加
//   - 新規物質: 新規エントリを追加
async function mergeIntoConcentrationLimits(/* prtrEntries */) {
  const raw = await readFile(TARGET_JSON, "utf-8");
  const doc = JSON.parse(raw);
  // TODO: merge logic
  await writeFile(TARGET_JSON, JSON.stringify(doc, null, 2) + "\n", "utf-8");
}

async function main() {
  console.log(`[prtr-importer] source: ${PRTR_INDEX_URL}`);
  console.log("[prtr-importer] **スケルトン実装** — Phase 1b で実装予定");
  const raw = await downloadPrtrLists();
  const parsed = parsePrtrExcel(raw);
  await mergeIntoConcentrationLimits(parsed);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
