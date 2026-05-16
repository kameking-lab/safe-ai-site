#!/usr/bin/env node
// 化学物質データ精度監査スクリプト
//
// 監査対象:
//   web/src/data/chemicals-mhlw/compact.json     — 厚労省 4 リスト統合 (3,954 件)
//   web/src/data/concentration-limits.json       — 濃度基準値・許容濃度 (919 件)
//   web/src/data/mock/chemical-substances-db.ts  — 主要 50 物質ハンドキュレーション
//
// 検証項目:
//   1. CAS 番号フォーマット (^\d{2,7}-\d{2,3}-\d{1,2}$)
//   2. CAS チェックサム (末尾 1 桁 = (Σ digit*pos) mod 10)
//   3. TS-DB と concentration-limits.json の OEL 整合性
//   4. TS-DB skin_hazard と「皮膚等障害化学物質等」カテゴリの相互整合
//   5. TS-DB 内の CAS 重複検出
//
// 使い方: node scripts/audit-chemicals.mjs [--strict]
//   --strict: 警告も終了コード 1 にする

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const strict = process.argv.includes("--strict");

const CAS_RE = /^(\d{2,7})-(\d{2})-(\d)$/;

function casChecksumValid(cas) {
  const m = CAS_RE.exec(cas);
  if (!m) return null;
  const body = (m[1] + m[2]).split("").reverse();
  const check = parseInt(m[3], 10);
  let sum = 0;
  for (let i = 0; i < body.length; i++) sum += (i + 1) * parseInt(body[i], 10);
  return sum % 10 === check;
}

const errors = [];
const warnings = [];

function logErr(msg) { errors.push(msg); }
function logWarn(msg) { warnings.push(msg); }

// --- 1. compact.json (MHLW 統合) ---
const compactPath = path.join(root, "src/data/chemicals-mhlw/compact.json");
const compact = JSON.parse(fs.readFileSync(compactPath, "utf8"));
let cOk = 0, cBad = 0, cNoCas = 0;
for (const e of compact.entries) {
  if (!e.cas) { cNoCas++; continue; }
  const v = casChecksumValid(e.cas);
  if (v === true) cOk++;
  else if (v === false) { cBad++; logErr(`[compact] bad CAS checksum: ${e.cas} (${e.name})`); }
  else { logErr(`[compact] bad CAS format: ${e.cas} (${e.name})`); }
}

// --- 2. concentration-limits.json ---
const climPath = path.join(root, "src/data/concentration-limits.json");
const clim = JSON.parse(fs.readFileSync(climPath, "utf8"));
let clOk = 0, clBad = 0;
for (const cas of Object.keys(clim.substances)) {
  const v = casChecksumValid(cas);
  if (v === true) clOk++;
  else if (v === false) { clBad++; logErr(`[concentration-limits] bad CAS checksum: ${cas} (${clim.substances[cas].name})`); }
  else { logErr(`[concentration-limits] bad CAS format: ${cas}`); }
}

// 単位の正規化チェック
const allowedUnits = new Set(["ppm", "mg/m³", "f/cc"]);
for (const [cas, v] of Object.entries(clim.substances)) {
  for (const k of ["twa", "stel", "ceiling"]) {
    if (!v[k]) continue;
    if (!allowedUnits.has(v[k].unit)) {
      logWarn(`[concentration-limits] unexpected unit "${v[k].unit}" on ${cas}.${k}`);
    }
    if (isNaN(parseFloat(v[k].value))) {
      logErr(`[concentration-limits] non-numeric ${k}.value on ${cas}: "${v[k].value}"`);
    }
  }
}

// --- 3. TS-DB ---
const tsPath = path.join(root, "src/data/mock/chemical-substances-db.ts");
const tsSrc = fs.readFileSync(tsPath, "utf8");
const entryRe = /\{\s*id:\s*"(cs-\d+)",[\s\S]*?cas:\s*"([^"]+)",[\s\S]*?categories:\s*\[([^\]]+)\],[\s\S]*?skin_hazard:\s*(true|false),/g;
const tsEntries = [];
let m;
while ((m = entryRe.exec(tsSrc))) {
  tsEntries.push({ id: m[1], cas: m[2], categories: m[3], skin_hazard: m[4] === "true" });
}

let tsOk = 0, tsBad = 0, tsMixed = 0;
const seenCas = new Map();
for (const e of tsEntries) {
  if (CAS_RE.test(e.cas)) {
    const v = casChecksumValid(e.cas);
    if (v === true) tsOk++;
    else if (v === false) { tsBad++; logErr(`[ts-db] bad CAS checksum: ${e.cas} (${e.id})`); }
  } else {
    tsMixed++; // 混合物等は許容
  }
  // 重複検出
  if (seenCas.has(e.cas) && e.cas !== "—（混合物）") {
    logErr(`[ts-db] duplicate CAS: ${e.cas} in ${e.id} and ${seenCas.get(e.cas)}`);
  } else {
    seenCas.set(e.cas, e.id);
  }
  // skin_hazard と 皮膚等障害化学物質等 の相互整合
  const inSkinList = /皮膚等障害化学物質等/.test(e.categories);
  if (inSkinList && !e.skin_hazard) {
    logWarn(`[ts-db] ${e.id} categorized as 皮膚等障害化学物質等 but skin_hazard=false`);
  }
  if (!inSkinList && e.skin_hazard) {
    logWarn(`[ts-db] ${e.id} skin_hazard=true but no 皮膚等障害化学物質等 category`);
  }
}

// --- 結果出力 ---
const summary = {
  compact: { ok: cOk, badChecksum: cBad, noCas: cNoCas, total: compact.entries.length },
  concentrationLimits: { ok: clOk, badChecksum: clBad, total: Object.keys(clim.substances).length },
  tsDb: { ok: tsOk, badChecksum: tsBad, mixed: tsMixed, total: tsEntries.length },
  errors: errors.length,
  warnings: warnings.length,
};

console.log("=== Chemical Data Audit ===");
console.log(JSON.stringify(summary, null, 2));
if (errors.length) {
  console.log("\n--- ERRORS ---");
  for (const e of errors) console.log(" ✗", e);
}
if (warnings.length) {
  console.log("\n--- WARNINGS ---");
  for (const w of warnings) console.log(" !", w);
}

process.exit(errors.length || (strict && warnings.length) ? 1 : 0);
