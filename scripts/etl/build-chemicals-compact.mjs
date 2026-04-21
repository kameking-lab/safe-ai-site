#!/usr/bin/env node
/**
 * chemicals.jsonl (3,984 行) を UI から直接 import できる軽量 JSON に圧縮する。
 *
 *   $ node scripts/etl/build-chemicals-compact.mjs
 *
 * - ヘッダ / 注記 / 空行を除外
 * - ファイル別スキーマごとに正しい列から 名称 / CAS / 濃度基準値 / 用途 / リンク を抽出
 * - 最終出力 web/src/data/chemicals-mhlw/compact.json は JSON オブジェクト
 */

import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const SRC = join(REPO_ROOT, "web", "src", "data", "chemicals-mhlw", "chemicals.jsonl");
const DST = join(REPO_ROOT, "web", "src", "data", "chemicals-mhlw", "compact.json");

const CATEGORY_LABELS = {
  carcinogenic: "がん原性物質",
  concentration: "濃度基準値",
  skin: "皮膚等障害化学物質",
  label_sds: "ラベル表示・SDS交付",
  other: "その他",
};

const CAS_RE = /^\d{2,7}-\d{2,3}-\d{1,2}$/;
const PLACEHOLDER_NAMES = new Set(["", "－", "-", "—", "―", "null"]);

function isPlaceholder(value) {
  if (value == null) return true;
  const s = String(value).trim();
  if (!s) return true;
  if (PLACEHOLDER_NAMES.has(s)) return true;
  if (/^\d+(\.\d+)?$/.test(s)) return true; // "1314" のような行番号
  if (s.startsWith("※")) return true;
  if (/^CAS/i.test(s)) return true;
  return false;
}

function pickStr(value) {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t ? t : null;
}

/** 備考は長すぎる注記列を除外 */
function trimNote(v) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  if (s.startsWith("※")) return null;
  if (s.length > 200) return null;
  if (/^[A-Z]{1,6}$/.test(s)) return null;
  return s;
}

function pickNameAndCas(row) {
  const attrs = row.attributes ?? {};
  const cat = row.category;

  // --- 濃度基準値 (1113_noudokijyun_all.xlsx) ---
  if (cat === "concentration") {
    const name = pickStr(attrs["物質名"]);
    const cas = pickStr(attrs["CAS RN"]) ?? pickStr(row.casRn);
    if (name && !isPlaceholder(name)) return { name, cas: CAS_RE.test(cas ?? "") ? cas : null };
    return { name: null, cas: null };
  }

  // --- 皮膚等障害 (hifu_20251010.xlsx) ---
  if (cat === "skin") {
    const lawName = pickStr(attrs["労働安全衛生法令の名称※２"]);
    const ghsName = pickStr(attrs["国によるＧＨＳ分類の名称"]);
    let name = null;
    if (lawName && !isPlaceholder(lawName)) name = lawName;
    else if (ghsName && !isPlaceholder(ghsName)) name = ghsName;
    const cas = pickStr(attrs["CAS RN"]) ?? pickStr(row.casRn);
    if (!name) return { name: null, cas: null };
    return { name, cas: CAS_RE.test(cas ?? "") ? cas : null };
  }

  // --- ラベル表示・SDS交付 (label_sds_list_20250401.xlsx) ---
  // 物質名: col2 (日本語) / col3 (英語) / col4 (CAS)
  if (cat === "label_sds") {
    const name = pickStr(attrs.col2);
    const enName = pickStr(attrs.col3);
    const rawCas = pickStr(attrs.col4) ?? pickStr(row.casRn);
    const cas = rawCas && CAS_RE.test(rawCas) ? rawCas : null;
    if (!name || isPlaceholder(name)) return { name: null, cas: null };
    return { name, cas, enName };
  }

  // --- がん原性 (001064830.xlsx) ---
  if (cat === "carcinogenic") {
    // col2 (法令名称) 優先, なければ col1 (GHS分類名称)
    const lawName = pickStr(attrs.col2);
    const ghsName = pickStr(attrs.col1);
    let name = null;
    if (lawName && !isPlaceholder(lawName)) name = lawName;
    else if (ghsName && !isPlaceholder(ghsName)) name = ghsName;
    const rawCas = pickStr(row.casRn) ?? pickStr(row.substance);
    const cas = rawCas && CAS_RE.test(rawCas) ? rawCas : null;
    if (!name) return { name: null, cas: null };
    return { name, cas };
  }

  // fallback
  const generic = [
    attrs.col2,
    attrs.col1,
    attrs["物質名"],
    attrs["化学物質名"],
    attrs["Name"],
    attrs["name"],
  ];
  for (const c of generic) {
    const s = pickStr(c);
    if (s && !isPlaceholder(s)) {
      const cas = pickStr(row.casRn);
      return { name: s, cas: cas && CAS_RE.test(cas) ? cas : null };
    }
  }
  return { name: null, cas: null };
}

function pickNotes(row, enName) {
  const attrs = row.attributes ?? {};
  const cat = row.category;
  const out = [];
  if (enName) out.push(enName);

  if (cat === "carcinogenic") {
    // col3 = 発がん性区分, col4 = 備考
    const cls = trimNote(attrs.col3);
    if (cls) out.push(cls);
    const remark = trimNote(attrs.col4);
    if (remark) out.push(remark);
  } else if (cat === "skin") {
    const skin = trimNote(attrs["皮膚吸収性有害物質※５，６"]);
    if (skin === "●") out.push("皮膚吸収性有害物質");
  } else if (cat === "label_sds") {
    const label = attrs.col5;
    const sds = attrs.col6;
    if (label != null && label !== "") out.push(`ラベル表示裾切値: ${label}%`);
    if (sds != null && sds !== "") out.push(`SDS交付裾切値: ${sds}%`);
  } else if (cat === "concentration") {
    const sampling = trimNote(attrs["試料採取方法"]);
    const analysis = trimNote(attrs["分析方法"]);
    if (sampling) out.push(`試料採取: ${sampling}`);
    if (analysis) out.push(`分析: ${analysis}`);
  }
  return out;
}

function pickDetails(row) {
  const attrs = row.attributes ?? {};
  const out = {};
  // 濃度基準値（八時間 / 短時間）
  const limit8h = pickStr(attrs["八時間濃度基準値"]);
  const limitShort = pickStr(attrs["短時間濃度基準値"]);
  if (limit8h && !PLACEHOLDER_NAMES.has(limit8h)) out.limit8h = limit8h;
  if (limitShort && !PLACEHOLDER_NAMES.has(limitShort)) out.limitShort = limitShort;
  // モデル SDS の推奨用途
  for (const k of Object.keys(attrs)) {
    if (k.startsWith("モデルSDSにおける推奨用途")) {
      const v = pickStr(attrs[k]);
      if (v) out.uses = v;
    }
  }
  // 公式 SDS リンク
  const link = pickStr(attrs["リンクURL"]);
  if (link && link.startsWith("http")) out.link = link;
  return Object.keys(out).length ? out : undefined;
}

async function main() {
  const raw = await readFile(SRC, "utf8");
  const lines = raw.split("\n").filter((l) => l.trim());
  const seen = new Map();
  let dropped = 0;
  for (const line of lines) {
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      dropped += 1;
      continue;
    }
    const { name, cas, enName } = pickNameAndCas(row);
    if (!name || !row.category) {
      dropped += 1;
      continue;
    }
    const key = `${cas ?? "no-cas"}|${name}|${row.category}|${row.sheet ?? ""}`;
    if (seen.has(key)) continue;
    const entry = {
      name,
      cas: cas ?? null,
      category: row.category,
      categoryLabel: CATEGORY_LABELS[row.category] ?? row.category,
      appliedDate: row.appliedDate ?? null,
      notes: pickNotes(row, enName),
    };
    const details = pickDetails(row);
    if (details) entry.details = details;
    seen.set(key, entry);
  }
  const entries = Array.from(seen.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "ja")
  );
  const categoryCounts = entries.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + 1;
    return acc;
  }, {});
  const output = {
    generatedAt: new Date().toISOString(),
    sourceFile: "chemicals.jsonl",
    totalIn: lines.length,
    kept: entries.length,
    dropped,
    categoryCounts,
    categoryLabels: CATEGORY_LABELS,
    entries,
  };
  await writeFile(DST, JSON.stringify(output) + "\n");
  console.error(
    `[build-chemicals-compact] in=${lines.length} kept=${entries.length} dropped=${dropped}`
  );
  console.error(`  categories: ${JSON.stringify(categoryCounts)}`);
  console.error(`  wrote: ${DST}`);
}

main().catch((err) => {
  console.error("[build-chemicals-compact] error:", err);
  process.exitCode = 1;
});
