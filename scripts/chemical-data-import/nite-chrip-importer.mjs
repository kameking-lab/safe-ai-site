#!/usr/bin/env node
/**
 * NITE-CHRIP (政府版 GHS 分類) 統合スクリプト [スケルトン]
 *
 *   $ node scripts/chemical-data-import/nite-chrip-importer.mjs
 *
 * 入力 : NITE-CHRIP データ (Phase 1b で取得方法を確定)
 * 出力 : web/src/data/concentration-limits.json (マージ書き戻し)
 *
 * Phase 1a (2026-05-24) ではスケルトンのみ実装。実データ統合は Phase 1b で対応。
 * 取得手順は README.md を参照。
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const TARGET_JSON = join(REPO_ROOT, "web", "src", "data", "concentration-limits.json");
const TMP_DIR = join(__dirname, "tmp");

const NITE_CHRIP_BASE_URL = "https://www.nite.go.jp/chem/chrip/chrip_search/systemTop";

// TODO(phase-1b): NITE 公開エンドポイントの最終確定と取得形式の決定
async function downloadNiteChripData() {
  await mkdir(TMP_DIR, { recursive: true });
  // TODO(phase-1b): 政府版GHS分類の一括CSV/XML取得
  //   候補1: NITE 化学物質総合情報提供システムからの CSV ダウンロード
  //   候補2: 個別物質ページのHTML スクレイピング (約3,300 リクエスト、要間隔制御)
  throw new Error("[skeleton] NITE-CHRIP データ取得は Phase 1b で実装");
}

// TODO(phase-1b): パース仕様の確定 (CSVヘッダー or XML スキーマ)
function parseNiteChrip(/* raw */) {
  // 期待する出力形式:
  // [
  //   {
  //     cas: "108-88-3",
  //     nameJa: "トルエン",
  //     nameEn: "Toluene",
  //     ghsClassifications: { health: [...], env: [...], physChem: [...] },
  //     hazardPictograms: ["GHS02", "GHS07", ...],
  //     hCodes: ["H225", "H304", ...],
  //     pCodes: ["P210", ...],
  //     oshActApplicable: true,
  //   }, ...
  // ]
  return [];
}

// TODO(phase-1b): マージロジック実装
//   - 既存エントリがあれば: regulationTags に "nite" を追加、GHS情報を補完
//   - 既存エントリがなければ: 新規エントリを reference として追加
async function mergeIntoConcentrationLimits(/* niteEntries */) {
  const raw = await readFile(TARGET_JSON, "utf-8");
  const doc = JSON.parse(raw);
  // TODO: merge logic
  await writeFile(TARGET_JSON, JSON.stringify(doc, null, 2) + "\n", "utf-8");
}

async function main() {
  console.log(`[nite-chrip-importer] base URL: ${NITE_CHRIP_BASE_URL}`);
  console.log("[nite-chrip-importer] **スケルトン実装** — Phase 1b で実装予定");
  const raw = await downloadNiteChripData();
  const parsed = parseNiteChrip(raw);
  await mergeIntoConcentrationLimits(parsed);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
