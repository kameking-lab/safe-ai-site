#!/usr/bin/env node
/**
 * chemicals.jsonl (3,984 行) を UI から直接 import できる軽量 JSON に圧縮する。
 *
 *   $ node scripts/etl/build-chemicals-compact.mjs
 *
 * - ヘッダ / 注記 / 空行を除外
 * - attributes.col1 (GHS分類名称) / col2 (法令名称) を昇格
 * - 最終出力 web/src/data/chemicals-mhlw/compact.json は JSON 配列
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

function pickName(row) {
  const attrs = row.attributes ?? {};
  const candidates = [
    attrs.col1,
    attrs.col2,
    attrs["物質名"],
    attrs["化学物質名"],
    attrs["Name"],
    attrs["name"],
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim() && !c.startsWith("※") && !/^CAS/i.test(c)) {
      return c.trim();
    }
  }
  const s = row.substance ?? "";
  if (s && !CAS_RE.test(s) && !s.startsWith("※") && s !== "CAS RN") return s.trim();
  return null;
}

function pickCas(row) {
  const cas = (row.casRn ?? "").trim();
  if (cas && CAS_RE.test(cas)) return cas;
  const subCas = (row.substance ?? "").trim();
  if (subCas && CAS_RE.test(subCas)) return subCas;
  return null;
}

function pickNotes(row) {
  const attrs = row.attributes ?? {};
  const notes = [];
  for (const key of ["col3", "col4", "col5"]) {
    const v = attrs[key];
    if (typeof v === "string" && v.trim() && !v.startsWith("※") && !/^[A-Z]{1,6}$/.test(v)) {
      notes.push(v.trim());
    }
  }
  return notes;
}

function pickDetails(row) {
  const attrs = row.attributes ?? {};
  const out = {};
  // 濃度基準値（八時間 / 短時間）
  const limit8h = attrs["八時間濃度基準値"];
  const limitShort = attrs["短時間濃度基準値"];
  if (typeof limit8h === "string" && limit8h.trim() && limit8h.trim() !== "－") {
    out.limit8h = limit8h.trim();
  }
  if (typeof limitShort === "string" && limitShort.trim() && limitShort.trim() !== "－") {
    out.limitShort = limitShort.trim();
  }
  // モデルSDSの推奨用途
  for (const k of Object.keys(attrs)) {
    if (k.startsWith("モデルSDSにおける推奨用途")) {
      const v = attrs[k];
      if (typeof v === "string" && v.trim()) out.uses = v.trim();
    }
  }
  // 公式 SDS リンク
  const link = attrs["リンクURL"];
  if (typeof link === "string" && link.startsWith("http")) out.link = link.trim();
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
    const name = pickName(row);
    const cas = pickCas(row);
    if (!name || (!cas && !row.category)) {
      dropped += 1;
      continue;
    }
    const key = `${cas ?? "no-cas"}|${name}|${row.category}`;
    if (seen.has(key)) continue;
    const entry = {
      name,
      cas,
      category: row.category,
      categoryLabel: CATEGORY_LABELS[row.category] ?? row.category,
      appliedDate: row.appliedDate ?? null,
      notes: pickNotes(row),
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
