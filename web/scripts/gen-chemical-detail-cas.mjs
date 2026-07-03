#!/usr/bin/env node
// 化学物質 個別詳細ページ /chemical-database/[cas] の「実在する CAS キー集合」を
// 横断検索(client)向けに軽量スナップショットとして書き出すジェネレータ（SEO/横断検索班）。
//
// なぜ必要か:
//   詳細ページ src/app/(main)/chemical-database/[cas]/page.tsx は
//   `CONCENTRATION_LIMITS.substances[normalizeCas(cas)]` が無い CAS を notFound() で弾く。
//   ＝濃度基準DB(concentration-limits.json ≒ 3,515 物質)のキー集合こそ「実在の詳細ページに
//   解決する CAS の全体」。横断検索(search-index.ts)の化学物質ヒットをこの canonical 詳細へ
//   深リンクしたいが、濃度基準DB 本体は約 2.0MB あり client の検索チャンクへ載せられない。
//   そこでキーのみ(数字とハイフンのみ・約40KB)を抽出して client へ載せ、幽霊URL 0 のまま
//   「検索→個別詳細ページ」を成立させる。
//
// 出典/正本: src/data/concentration-limits.json（政府公開: 厚労省 濃度基準値・NITE GHS）。
// 出力: src/lib/cross-search/chemical-detail-cas.json（当班 lib 配下。src/data は data 班所有のため書かない）。
// ドリフト検出: chemical-detail-cas.test.ts が本出力と concentration-limits.json のキー集合の
//   一致を CI で検証する。data 班が濃度基準DBを更新したら本スクリプトを再実行して復元すること。
//
// 使い方: node scripts/gen-chemical-detail-cas.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// mhlw-chemicals.ts の normalizeCas と厳密に同一（全角数字→半角・空白除去）。
// これで search-index 側の membership 判定と URL セグメントが 1:1 一致する。
function normalizeCas(v) {
  return String(v)
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[\s　]/g, "")
    .trim();
}

const srcPath = path.join(root, "src/data/concentration-limits.json");
const outPath = path.join(root, "src/lib/cross-search/chemical-detail-cas.json");

const raw = JSON.parse(fs.readFileSync(srcPath, "utf8"));
const substances = raw.substances ?? {};

// キーは既にノーマライズ済み想定だが、正本更新への保険で normalizeCas を通し、
// 重複排除・辞書順ソートして決定的な出力にする（差分ノイズ抑制）。
const keys = Array.from(
  new Set(Object.keys(substances).map(normalizeCas).filter(Boolean)),
).sort();

fs.writeFileSync(outPath, JSON.stringify(keys) + "\n", "utf8");

console.log(
  `wrote ${keys.length} CAS keys → ${path.relative(root, outPath)} (from ${path.relative(root, srcPath)})`,
);
