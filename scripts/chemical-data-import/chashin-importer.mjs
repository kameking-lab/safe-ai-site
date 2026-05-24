#!/usr/bin/env node
/**
 * 化審法 (化学物質の審査及び製造等の規制に関する法律) 分類統合スクリプト [スケルトン]
 *
 *   $ node scripts/chemical-data-import/chashin-importer.mjs
 *
 * 出典: 経済産業省 化学物質審査規制法 (化審法)
 *   https://www.meti.go.jp/policy/chemical_management/kasinhou/
 *
 * 対象:
 *   - 第一種特定化学物質  (約30 物質)
 *   - 第二種特定化学物質  (約20 物質)
 *   - 優先評価化学物質    (約280 物質)
 *   - 監視化学物質        (約40 物質)
 *   - 一般化学物質中の特定 (約700 物質)
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

const CHASHIN_INDEX_URL = "https://www.meti.go.jp/policy/chemical_management/kasinhou/";

// TODO(phase-1b): METI 公表リスト (xlsx/pdf) の URL を確定
//   各分類ごとに別ファイルで公開されている
async function downloadChashinLists() {
  await mkdir(TMP_DIR, { recursive: true });
  throw new Error("[skeleton] 化審法データ取得は Phase 1b で実装");
}

// TODO(phase-1b): Excel/PDF パース実装
function parseChashinLists(/* downloads */) {
  // 期待する出力形式:
  // [
  //   {
  //     cas: "108-88-3",
  //     nameJa: "トルエン",
  //     chashinClass: "specified-first" | "specified-second" |
  //                   "priority-evaluation" | "monitoring" | "general",
  //     restrictionSummary: "製造輸入禁止" | "監視対象..." | ...,
  //     designatedAt: "2010-04-01",
  //   }, ...
  // ]
  return [];
}

// TODO(phase-1b): マージロジック
//   - 既存エントリ: regulationTags に "chashin-{class}" を追加
//   - 新規物質: 新規エントリを追加
async function mergeIntoConcentrationLimits(/* chashinEntries */) {
  const raw = await readFile(TARGET_JSON, "utf-8");
  const doc = JSON.parse(raw);
  // TODO: merge logic
  await writeFile(TARGET_JSON, JSON.stringify(doc, null, 2) + "\n", "utf-8");
}

async function main() {
  console.log(`[chashin-importer] source: ${CHASHIN_INDEX_URL}`);
  console.log("[chashin-importer] **スケルトン実装** — Phase 1b で実装予定");
  const raw = await downloadChashinLists();
  const parsed = parseChashinLists(raw);
  await mergeIntoConcentrationLimits(parsed);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
