#!/usr/bin/env node
/**
 * 化学物質の濃度基準値・許容濃度・発がん性分類を複数ソースからマージし、
 * UI から直接 import できる JSON を生成する。
 *
 *   $ node scripts/etl/fetch-concentration-limits.mjs
 *
 * 出力: web/src/data/concentration-limits.json
 *
 * ── データソース ────────────────────────────────────────────
 *  1. 厚生労働省告示第177号（令和5年4月公示・以降改正分含む）
 *     → 八時間濃度基準値 / 短時間濃度基準値 / 天井値
 *     → 一次データは web/src/data/chemicals-mhlw/compact.json から抽出
 *  2. 日本産業衛生学会「許容濃度等の勧告」（最新年度）
 *     → 許容濃度（TWA） / 短時間ばく露限界（STEL）
 *  3. ACGIH TLV-TWA / TLV-STEL（最新年度、参考値）
 *  4. IARC Monographs（List of Classifications）
 *
 * ── スキーマ拡張 v2.0.0 ──────────────────────────────────
 *  各エントリに以下のフィールドを追加:
 *  - source: "mhlw" | "jsoh" | "acgih" | "reference"
 *      → 物質の主要出典（最も信頼度の高い出典を1つ選択）
 *  - iarcGroup: "1" | "2A" | "2B" | "3" | null
 *  - jsohOel: { value, unit } | null  （JSOH TWA を素早くアクセス可能に）
 *  - acgihTlv: { value, unit } | null （ACGIH TLV-TWA を素早くアクセス可能に）
 *
 * ── ライセンス・出典の注意 ────────────────────────────────
 *  - 厚労省告示・IARC は公的機関の公表値で、出典明記のうえ自由利用可。
 *  - JSOH 値は学会勧告。出典「日本産業衛生学会 許容濃度等の勧告（年度）」を必ず併記。
 *  - ACGIH TLV は原文のフルコピーは不可。要点抜粋に留め出典を併記する。
 */

import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { EXPANDED_CHEMICALS } from "./data/expanded-chemicals.mjs";
import { EXPANDED_CHEMICALS_2 } from "./data/expanded-chemicals-2.mjs";
import { EXPANDED_CHEMICALS_3 } from "./data/expanded-chemicals-3.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const COMPACT_SRC = join(
  REPO_ROOT,
  "web",
  "src",
  "data",
  "chemicals-mhlw",
  "compact.json"
);
const DST = join(REPO_ROOT, "web", "src", "data", "concentration-limits.json");

const SOURCES = {
  MHLW_177: "厚生労働省告示第177号（令和5年4月公示・以降改正分含む）",
  JSOH: "日本産業衛生学会 許容濃度等の勧告（2024年度）",
  ACGIH: "ACGIH TLVs and BEIs (2024)",
  IARC: "IARC Monographs (List of Classifications, 2024)",
  GHS_MHLW: "厚生労働省 国によるGHS分類",
};

/** "20 ppm" / "５ ㎎/㎥" / "0.1 ppm" などを {value, unit} に正規化 */
function parseLimit(text) {
  if (!text || typeof text !== "string") return null;
  let s = text.trim();
  if (!s) return null;
  s = s.replace(/[０-９．]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  s = s.replace(/㎎/g, "mg").replace(/㎥/g, "m³").replace(/㎍/g, "μg");
  s = s.replace(/[\s\u3000]+/g, " ");
  const m = s.match(/^([\d.]+)\s*(ppm|mg\/m³|μg\/m³|mg\/m3)/i);
  if (!m) return null;
  return { value: m[1], unit: m[2].replace("mg/m3", "mg/m³") };
}

/** 拡張データセットの { value, unit } から limit value オブジェクトを作成 */
function fromExpanded(obj, kind, source) {
  if (!obj || obj[kind] == null) return null;
  const unit = obj.unit === "mg/m3" ? "mg/m³" : obj.unit;
  return { value: String(obj[kind]), unit, source };
}

async function loadCompact() {
  const raw = await readFile(COMPACT_SRC, "utf-8");
  return JSON.parse(raw);
}

/** primary source の決定: mhlw > jsoh > acgih > reference > none */
function determinePrimarySource(entry) {
  const hasMhlw =
    entry.twa?.source === "MHLW_177" ||
    entry.stel?.source === "MHLW_177" ||
    entry.ceiling?.source === "MHLW_177";
  if (hasMhlw) return "mhlw";
  if (entry.jsoh) return "jsoh";
  if (entry.acgih) return "acgih";
  if (entry.carcinogenicity?.iarc) return "reference";
  return "reference";
}

function buildSubstances(compact) {
  const byCas = {};

  // ① compact.json の concentration カテゴリエントリから濃度値を取り込む
  for (const e of compact.entries) {
    if (e.category !== "concentration") continue;
    if (!e.cas || !/^\d{2,7}-\d{2,3}-\d{1,2}$/.test(e.cas)) continue;
    const parsed = parseLimit(e.details?.limit8h);
    const stelParsed = parseLimit(e.details?.limitShort);
    if (!parsed && !stelParsed) continue;
    const cur = byCas[e.cas] ?? { name: e.name };
    if (parsed && !cur.twa) cur.twa = { ...parsed, source: "MHLW_177" };
    if (stelParsed && !cur.stel) cur.stel = { ...stelParsed, source: "MHLW_177" };
    if (e.details?.link) cur.mhlwSdsUrl = e.details.link;
    byCas[e.cas] = cur;
  }

  // ② 拡張データセットをマージ（既存の値は壊さない、なければ追加）
  const expanded = [...EXPANDED_CHEMICALS, ...EXPANDED_CHEMICALS_2, ...EXPANDED_CHEMICALS_3];
  for (const c of expanded) {
    if (!c.cas || !/^\d{2,7}-\d{2,3}-\d{1,2}$/.test(c.cas)) continue;
    const cur = byCas[c.cas] ?? {};
    if (c.name && !cur.name) cur.name = c.name;
    if (c.nameEn && !cur.nameEn) cur.nameEn = c.nameEn;
    if (c.note) {
      const notes = cur.notes ?? [];
      if (!notes.includes(c.note)) notes.push(c.note);
      cur.notes = notes;
    }

    // MHLW 告示第177号
    if (c.mhlw177) {
      const twa = fromExpanded(c.mhlw177, "twa", "MHLW_177");
      const stel = fromExpanded(c.mhlw177, "stel", "MHLW_177");
      const ceiling = fromExpanded(c.mhlw177, "ceiling", "MHLW_177");
      if (twa && !cur.twa) cur.twa = twa;
      if (stel && !cur.stel) cur.stel = stel;
      if (ceiling && !cur.ceiling) cur.ceiling = ceiling;
    }

    // JSOH 許容濃度
    if (c.jsoh) {
      const j = {};
      if (c.jsoh.twa != null) j.twa = { value: String(c.jsoh.twa), unit: c.jsoh.unit };
      if (c.jsoh.stel != null) j.stel = { value: String(c.jsoh.stel), unit: c.jsoh.unit };
      if (c.jsoh.ceiling != null) j.ceiling = { value: String(c.jsoh.ceiling), unit: c.jsoh.unit };
      if (Object.keys(j).length > 0) cur.jsoh = j;
    }

    // ACGIH TLV
    if (c.acgih) {
      const a = {};
      if (c.acgih.twa != null) a.twa = { value: String(c.acgih.twa), unit: c.acgih.unit };
      if (c.acgih.stel != null) a.stel = { value: String(c.acgih.stel), unit: c.acgih.unit };
      if (c.acgih.ceiling != null) a.ceiling = { value: String(c.acgih.ceiling), unit: c.acgih.unit };
      if (Object.keys(a).length > 0) cur.acgih = a;
    }

    // IARC 発がん性
    if (c.iarc) {
      cur.carcinogenicity = {
        iarc: c.iarc,
        ...(c.iarcMonograph ? { monograph: c.iarcMonograph } : {}),
        source: "IARC",
      };
    }

    // TWA がまだなく ACGIH TWA があれば、参考値として使う
    if (!cur.twa && c.acgih?.twa != null) {
      cur.twa = { value: String(c.acgih.twa), unit: c.acgih.unit, source: "ACGIH" };
    }
    // TWA がまだなく JSOH TWA があれば、それを使う
    if (!cur.twa && c.jsoh?.twa != null) {
      cur.twa = { value: String(c.jsoh.twa), unit: c.jsoh.unit, source: "JSOH" };
    }

    byCas[c.cas] = cur;
  }

  // ③ v2 フラットフィールド（source / iarcGroup / jsohOel / acgihTlv）を付与
  for (const cas of Object.keys(byCas)) {
    const e = byCas[cas];
    e.source = determinePrimarySource(e);
    e.iarcGroup = e.carcinogenicity?.iarc ?? null;
    e.jsohOel = e.jsoh?.twa
      ? { value: Number(e.jsoh.twa.value), unit: e.jsoh.twa.unit }
      : null;
    e.acgihTlv = e.acgih?.twa
      ? { value: Number(e.acgih.twa.value), unit: e.acgih.twa.unit }
      : null;
    if (e.notes && e.notes.length === 0) delete e.notes;
  }

  return byCas;
}

function summarize(byCas) {
  const entries = Object.values(byCas);
  return {
    total: entries.length,
    withMhlw: entries.filter((v) => v.source === "mhlw").length,
    withJsoh: entries.filter((v) => v.jsoh).length,
    withAcgih: entries.filter((v) => v.acgih).length,
    withIarc: entries.filter((v) => v.iarcGroup).length,
    bySource: {
      mhlw: entries.filter((v) => v.source === "mhlw").length,
      jsoh: entries.filter((v) => v.source === "jsoh").length,
      acgih: entries.filter((v) => v.source === "acgih").length,
      reference: entries.filter((v) => v.source === "reference").length,
    },
    byIarc: {
      group1: entries.filter((v) => v.iarcGroup === "1").length,
      group2A: entries.filter((v) => v.iarcGroup === "2A").length,
      group2B: entries.filter((v) => v.iarcGroup === "2B").length,
      group3: entries.filter((v) => v.iarcGroup === "3").length,
    },
  };
}

async function main() {
  const compact = await loadCompact();
  const byCas = buildSubstances(compact);
  const summary = summarize(byCas);

  const output = {
    generatedAt: new Date().toISOString(),
    version: "2.0.0",
    sources: SOURCES,
    summary,
    substances: byCas,
  };

  await writeFile(DST, JSON.stringify(output, null, 2) + "\n", "utf-8");

  console.log("[fetch-concentration-limits]");
  console.log("  total substances :", summary.total);
  console.log("  by source        :", JSON.stringify(summary.bySource));
  console.log("  by IARC          :", JSON.stringify(summary.byIarc));
  console.log("  with JSOH        :", summary.withJsoh);
  console.log("  with ACGIH       :", summary.withAcgih);
  console.log("  written         →", DST);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
