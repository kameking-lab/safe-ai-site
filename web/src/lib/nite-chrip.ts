/**
 * NITE-CHRIP (政府版 GHS 分類) 詳細データの遅延ロードアクセサ
 *
 * - 入力: web/src/data/chemicals-nite/classifications.jsonl (約4MB / 3,388 物質)
 * - クライアントバンドルに含めないため動的 import を避け、Node ランタイム
 *   (route handler / server component) からのみ呼び出すこと
 * - 起動時の一括 import を避けるため Map ベースのキャッシュで lazy load
 *
 * 詳細マスタへの取り込み済要約は `concentration-limits.json` の
 * `niteGhsClassifications` フィールドを参照 (UI 利用想定)
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * 実行 cwd によって web/... / repo-root/web/... の両方を試す。
 * - `next build` / `next dev` は cwd = web/
 * - `vitest run` (リポジトリルートから実行する場合) は cwd = repo-root
 */
function resolveJsonlPath(): string {
  const candidates = [
    join(process.cwd(), "src", "data", "chemicals-nite", "classifications.jsonl"),
    join(process.cwd(), "web", "src", "data", "chemicals-nite", "classifications.jsonl"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  // 見つからない場合は最後の候補を返す (エラーメッセージ用)
  return candidates[0];
}

const JSONL_PATH = resolveJsonlPath();

/**
 * GHS 区分値の短縮コード。詳細は scripts/chemical-data-import/parse-nite-chrip.py 参照。
 * 例: "1A" = 区分1A, "N" = 区分に該当しない（分類対象外）, "U" = 分類できない
 */
export type GhsShortCode = string;

/** classifications.jsonl の 1 行に対応 */
export type NiteChripEntry = {
  cas: string;
  nameJa: string;
  ghsId: string;
  ghs: Record<string, GhsShortCode>;
  classifiedCount: number;
  chripUrl?: string;
  modelLabelUrl?: string;
  modelSdsUrl?: string;
};

let _cache: Map<string, NiteChripEntry> | null = null;

async function loadAll(): Promise<Map<string, NiteChripEntry>> {
  if (_cache) return _cache;
  const text = await readFile(JSONL_PATH, "utf-8");
  const map = new Map<string, NiteChripEntry>();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const entry = JSON.parse(line) as NiteChripEntry;
    map.set(entry.cas, entry);
  }
  _cache = map;
  return map;
}

/** CAS 番号から NITE-CHRIP の全 GHS 詳細を取得 (Node only) */
export async function getNiteChripByCas(cas: string): Promise<NiteChripEntry | null> {
  const all = await loadAll();
  return all.get(cas) ?? null;
}

/** NITE-CHRIP 収録物質の総数 */
export async function getNiteChripCount(): Promise<number> {
  const all = await loadAll();
  return all.size;
}

/** 短縮コード → 「区分N」表示文字列 (UI ヘルパ) */
const VERBOSE: Record<string, string> = {
  "1A": "区分1A",
  "1B": "区分1B",
  "1C": "区分1C",
  "1": "区分1",
  "2": "区分2",
  "2A": "区分2A",
  "2B": "区分2B",
  "3": "区分3",
  "4": "区分4",
  "5": "区分5",
  L: "液化ガス",
  P: "圧縮ガス",
  D: "深冷液化ガス",
  S: "溶解ガス",
  N: "区分に該当しない（分類対象外）",
  X: "区分外",
  U: "分類できない",
};

export function verboseGhsCategory(code: GhsShortCode): string {
  if (!code) return "";
  if (code.startsWith("区分")) return code;
  return VERBOSE[code] ?? code;
}

/** 短縮コードが「区分N (実害指摘あり)」かどうか */
export function isHazardClassified(code: GhsShortCode | undefined): boolean {
  if (!code) return false;
  if (code.startsWith("区分")) return true;
  return /^[12345]([ABC])?$/.test(code);
}
