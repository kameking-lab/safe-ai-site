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
 *       （build-chemicals-compact.mjs で前処理済み）
 *  2. 日本産業衛生学会「許容濃度等の勧告」（最新年度）
 *     → 許容濃度（TWA） / 短時間ばく露限界（STEL）
 *     → 公開 PDF を手作業で正規化したデータを EXTENSIONS に保持
 *  3. ACGIH TLV-TWA / TLV-STEL（最新年度）
 *     → 参考値として保持。ライセンス上、抜粋のみ。
 *  4. IARC Monographs（List of Classifications）
 *     → 発がん性分類（Group 1 / 2A / 2B / 3 / 4）
 *     → 公開 PDF を手作業で正規化したデータを CARCINOGENS_IARC に保持
 *
 * ── ライセンス・出典の注意 ────────────────────────────────
 *  - 厚労省告示・IARC は公的機関の公表値で、出典明記のうえ自由利用可。
 *  - JSOH 値は学会勧告。出典「日本産業衛生学会 許容濃度等の勧告（年度）」を必ず併記。
 *  - ACGIH TLV は原文のフルコピーは不可。要点抜粋に留め出典を併記する。
 *
 * ── 拡張方法 ──────────────────────────────────────────────
 *  EXTENSIONS / CARCINOGENS_IARC のマップに CAS → 値を追加するだけで
 *  自動的にマージされ JSON に反映される。CI で再ビルドできる。
 */

import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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
  ACGIH: "ACGIH TLV (2024)",
  IARC: "IARC Monographs (List of Classifications, 2024)",
  GHS_MHLW: "厚生労働省 国によるGHS分類",
};

/* ──────────────────────────────────────────────────────────
 * MHLW 告示第177号の追加・補正データ（compact.json で欠落するもの）
 * ────────────────────────────────────────────────────────── */
const MHLW_177_OVERRIDES = {
  // 7物質: compact.json では skin/label_sds としてのみ登録され、
  // concentration カテゴリに含まれていないため明示的に追加する。
  "71-43-2": {
    name: "ベンゼン",
    twa: { value: "1", unit: "ppm", source: "MHLW_177" },
    stel: { value: "0.5", unit: "ppm", source: "MHLW_177" },
  },
  "108-88-3": {
    name: "トルエン",
    twa: { value: "20", unit: "ppm", source: "MHLW_177" },
  },
  "7664-93-9": {
    name: "硫酸",
    twa: { value: "0.1", unit: "mg/m³", source: "MHLW_177" },
  },
  "67-64-1": {
    name: "アセトン",
    twa: { value: "200", unit: "ppm", source: "MHLW_177" },
    stel: { value: "500", unit: "ppm", source: "MHLW_177" },
  },
  "50-00-0": {
    name: "ホルムアルデヒド",
    twa: { value: "0.1", unit: "ppm", source: "MHLW_177" },
    stel: { value: "0.3", unit: "ppm", source: "MHLW_177" },
  },
  "7664-41-7": {
    name: "アンモニア",
    twa: { value: "25", unit: "ppm", source: "MHLW_177" },
    stel: { value: "35", unit: "ppm", source: "MHLW_177" },
  },
  "7647-01-0": {
    name: "塩化水素",
    ceiling: { value: "2", unit: "ppm", source: "MHLW_177" },
  },
  // 以下、告示第177号 主要追加物質（短時間値・天井値）
  "75-09-2": {
    // ジクロロメタン
    name: "ジクロロメタン",
    twa: { value: "50", unit: "ppm", source: "MHLW_177" },
  },
  "127-18-4": {
    // テトラクロロエチレン
    name: "テトラクロロエチレン",
    twa: { value: "25", unit: "ppm", source: "MHLW_177" },
  },
  "79-01-6": {
    // トリクロロエチレン
    name: "トリクロロエチレン",
    twa: { value: "10", unit: "ppm", source: "MHLW_177" },
  },
  "100-41-4": {
    // エチルベンゼン
    name: "エチルベンゼン",
    twa: { value: "20", unit: "ppm", source: "MHLW_177" },
  },
  "1330-20-7": {
    // キシレン
    name: "キシレン",
    twa: { value: "50", unit: "ppm", source: "MHLW_177" },
  },
  "108-95-2": {
    // フェノール
    name: "フェノール",
    twa: { value: "5", unit: "ppm", source: "MHLW_177" },
  },
  "75-05-8": {
    // アセトニトリル
    name: "アセトニトリル",
    twa: { value: "10", unit: "ppm", source: "MHLW_177" },
  },
  "67-56-1": {
    // メタノール
    name: "メタノール",
    twa: { value: "200", unit: "ppm", source: "MHLW_177" },
    stel: { value: "250", unit: "ppm", source: "MHLW_177" },
  },
  "78-93-3": {
    // メチルエチルケトン
    name: "メチルエチルケトン",
    twa: { value: "200", unit: "ppm", source: "MHLW_177" },
  },
  "7782-50-5": {
    // 塩素
    name: "塩素",
    ceiling: { value: "0.5", unit: "ppm", source: "MHLW_177" },
  },
  "7783-06-4": {
    // 硫化水素
    name: "硫化水素",
    twa: { value: "5", unit: "ppm", source: "MHLW_177" },
    stel: { value: "10", unit: "ppm", source: "MHLW_177" },
  },
};

/* ──────────────────────────────────────────────────────────
 * IARC 発がん性分類（主要物質）
 *   Group 1   : 人に対する発がん性が確認されている
 *   Group 2A : おそらく発がん性がある
 *   Group 2B : 発がん性の可能性がある
 *   Group 3   : 分類できない
 * 出典: IARC Monographs (List of Classifications)
 * ────────────────────────────────────────────────────────── */
const CARCINOGENS_IARC = {
  // Group 1
  "71-43-2": { group: "1", name: "ベンゼン", monograph: "Vol.100F" },
  "50-00-0": { group: "1", name: "ホルムアルデヒド", monograph: "Vol.100F" },
  "75-01-4": { group: "1", name: "塩化ビニル", monograph: "Vol.100F" },
  "1332-21-4": { group: "1", name: "アスベスト", monograph: "Vol.100C" },
  "75-21-8": { group: "1", name: "エチレンオキシド", monograph: "Vol.100F" },
  "106-99-0": { group: "1", name: "1,3-ブタジエン", monograph: "Vol.100F" },
  "7440-41-7": { group: "1", name: "ベリリウム", monograph: "Vol.100C" },
  "7440-43-9": { group: "1", name: "カドミウム", monograph: "Vol.100C" },
  "7440-47-3": { group: "1", name: "六価クロム化合物", monograph: "Vol.100C" },
  "7440-02-0": { group: "1", name: "ニッケル化合物", monograph: "Vol.100C" },
  "62-53-3": { group: "1", name: "アニリン（職業ばく露として）", monograph: "Vol.127" },
  "92-87-5": { group: "1", name: "ベンジジン", monograph: "Vol.100F" },
  "1336-36-3": { group: "1", name: "ポリ塩化ビフェニル類", monograph: "Vol.107" },
  "7440-38-2": { group: "1", name: "無機ヒ素化合物", monograph: "Vol.100C" },
  "75-07-0": { group: "1", name: "アセトアルデヒド", monograph: "Vol.71" },
  "8001-58-9": { group: "1", name: "コールタール", monograph: "Vol.100F" },
  "100-44-7": { group: "2A", name: "塩化ベンジル", monograph: "Vol.71" },
  "111-44-4": { group: "2A", name: "ビス(2-クロロエチル)エーテル", monograph: "Vol.71" },
  // Group 2A
  "75-09-2": { group: "2A", name: "ジクロロメタン", monograph: "Vol.110" },
  "79-01-6": { group: "2A", name: "トリクロロエチレン", monograph: "Vol.106" },
  "127-18-4": { group: "2A", name: "テトラクロロエチレン", monograph: "Vol.106" },
  "100-42-5": { group: "2A", name: "スチレン", monograph: "Vol.121" },
  "98-95-3": { group: "2B", name: "ニトロベンゼン", monograph: "Vol.65" },
  "108-95-2": { group: "3", name: "フェノール", monograph: "Vol.71" },
  // Group 2B
  "100-41-4": { group: "2B", name: "エチルベンゼン", monograph: "Vol.77" },
  "108-90-7": { group: "2B", name: "クロロベンゼン", monograph: "Vol.73" },
  "75-25-2": { group: "2B", name: "ブロモホルム", monograph: "Vol.71" },
  "302-01-2": { group: "2B", name: "ヒドラジン", monograph: "Vol.115" },
  "151-56-4": { group: "2B", name: "エチレンイミン", monograph: "Vol.71" },
  "7440-50-8": { group: "3", name: "銅", monograph: "Vol.118" },
  "7782-49-2": { group: "3", name: "セレン化合物", monograph: "Vol.9" },
  // Group 3 (not classifiable) — 主要物質のみ
  "67-64-1": { group: "3", name: "アセトン", monograph: "Suppl.7" },
  "108-88-3": { group: "3", name: "トルエン", monograph: "Vol.71" },
  "1330-20-7": { group: "3", name: "キシレン", monograph: "Vol.71" },
};

/* ──────────────────────────────────────────────────────────
 * JSOH（産業衛生学会）許容濃度の主要物質
 * 出典: 日本産業衛生学会 許容濃度等の勧告（2024年度）
 * ────────────────────────────────────────────────────────── */
const JSOH_LIMITS = {
  "71-43-2": { twa: { value: "1", unit: "ppm" } },
  "108-88-3": { twa: { value: "20", unit: "ppm" } },
  "67-64-1": { twa: { value: "200", unit: "ppm" } },
  "50-00-0": { twa: { value: "0.1", unit: "ppm" } },
  "7664-41-7": { twa: { value: "25", unit: "ppm" } },
  "7647-01-0": { ceiling: { value: "2", unit: "ppm" } },
  "7664-93-9": { twa: { value: "0.1", unit: "mg/m³" } },
  "75-09-2": { twa: { value: "50", unit: "ppm" } },
  "75-05-8": { twa: { value: "10", unit: "ppm" } },
  "67-56-1": { twa: { value: "200", unit: "ppm" } },
  "100-41-4": { twa: { value: "50", unit: "ppm" } },
  "1330-20-7": { twa: { value: "50", unit: "ppm" } },
  "78-93-3": { twa: { value: "200", unit: "ppm" } },
  "7782-50-5": { ceiling: { value: "0.5", unit: "ppm" } },
  "7783-06-4": { twa: { value: "5", unit: "ppm" } },
};

/* ──────────────────────────────────────────────────────────
 * ACGIH TLV（参考値・抜粋）
 * 出典: ACGIH TLV (2024)
 * ────────────────────────────────────────────────────────── */
const ACGIH_LIMITS = {
  "71-43-2": { twa: { value: "0.5", unit: "ppm" }, stel: { value: "2.5", unit: "ppm" } },
  "108-88-3": { twa: { value: "20", unit: "ppm" } },
  "67-64-1": { twa: { value: "250", unit: "ppm" }, stel: { value: "500", unit: "ppm" } },
  "50-00-0": { ceiling: { value: "0.3", unit: "ppm" } },
  "7664-41-7": { twa: { value: "25", unit: "ppm" }, stel: { value: "35", unit: "ppm" } },
  "7647-01-0": { ceiling: { value: "2", unit: "ppm" } },
  "7664-93-9": { twa: { value: "0.2", unit: "mg/m³" } },
  "75-09-2": { twa: { value: "50", unit: "ppm" } },
  "67-56-1": { twa: { value: "200", unit: "ppm" }, stel: { value: "250", unit: "ppm" } },
};

/* ────────────────────────────────────────────────────────── */

/** "20 ppm" / "５ ㎎/㎥" / "0.1 ppm" などを {value, unit} に正規化 */
function parseLimit(text) {
  if (!text || typeof text !== "string") return null;
  let s = text.trim();
  if (!s) return null;
  // 全角→半角
  s = s.replace(/[０-９．]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0)
  );
  s = s.replace(/㎎/g, "mg").replace(/㎥/g, "m³").replace(/㎍/g, "μg");
  // 全角スペース類を半角に
  s = s.replace(/[\s\u3000]+/g, " ");
  // "５ mg/m³" → "5 mg/m³"
  // 漢数字 "１ ppm" 等は半角化済み
  const m = s.match(/^([\d.]+)\s*(ppm|mg\/m³|μg\/m³|mg\/m3)/i);
  if (!m) return null;
  return {
    value: m[1],
    unit: m[2].replace("mg/m3", "mg/m³"),
  };
}

async function loadCompact() {
  const raw = await readFile(COMPACT_SRC, "utf-8");
  return JSON.parse(raw);
}

function buildSubstances(compact) {
  const byCas = {};

  // ① compact.json の concentration カテゴリエントリから limit8h を取り込む
  for (const e of compact.entries) {
    if (e.category !== "concentration") continue;
    if (!e.cas || !/^\d{2,7}-\d{2,3}-\d{1,2}$/.test(e.cas)) continue;
    const parsed = parseLimit(e.details?.limit8h);
    const stelParsed = parseLimit(e.details?.limitShort);
    if (!parsed && !stelParsed) continue;
    const cur = byCas[e.cas] ?? { name: e.name };
    if (parsed && !cur.twa) {
      cur.twa = { ...parsed, source: "MHLW_177" };
    }
    if (stelParsed && !cur.stel) {
      cur.stel = { ...stelParsed, source: "MHLW_177" };
    }
    if (e.details?.link) cur.mhlwSdsUrl = e.details.link;
    byCas[e.cas] = cur;
  }

  // ② 告示第177号 補正データを上書き
  for (const [cas, data] of Object.entries(MHLW_177_OVERRIDES)) {
    const cur = byCas[cas] ?? {};
    if (data.name && !cur.name) cur.name = data.name;
    if (data.twa) cur.twa = data.twa;
    if (data.stel) cur.stel = data.stel;
    if (data.ceiling) cur.ceiling = data.ceiling;
    byCas[cas] = cur;
  }

  // ③ IARC 発がん性分類をマージ
  for (const [cas, data] of Object.entries(CARCINOGENS_IARC)) {
    const cur = byCas[cas] ?? {};
    if (!cur.name) cur.name = data.name;
    cur.carcinogenicity = {
      iarc: data.group,
      monograph: data.monograph,
      source: "IARC",
    };
    byCas[cas] = cur;
  }

  // ④ JSOH 許容濃度をマージ
  for (const [cas, data] of Object.entries(JSOH_LIMITS)) {
    const cur = byCas[cas] ?? {};
    cur.jsoh = data;
    byCas[cas] = cur;
  }

  // ⑤ ACGIH TLV をマージ
  for (const [cas, data] of Object.entries(ACGIH_LIMITS)) {
    const cur = byCas[cas] ?? {};
    cur.acgih = data;
    byCas[cas] = cur;
  }

  return byCas;
}

function summarize(byCas) {
  const total = Object.keys(byCas).length;
  const withMhlw = Object.values(byCas).filter(
    (v) => v.twa?.source === "MHLW_177" || v.stel?.source === "MHLW_177" || v.ceiling?.source === "MHLW_177"
  ).length;
  const withIarc = Object.values(byCas).filter((v) => v.carcinogenicity).length;
  const withJsoh = Object.values(byCas).filter((v) => v.jsoh).length;
  const withAcgih = Object.values(byCas).filter((v) => v.acgih).length;
  return { total, withMhlw, withIarc, withJsoh, withAcgih };
}

async function main() {
  const compact = await loadCompact();
  const byCas = buildSubstances(compact);
  const summary = summarize(byCas);

  const output = {
    generatedAt: new Date().toISOString(),
    version: "1.0.0",
    sources: SOURCES,
    summary,
    substances: byCas,
  };

  await writeFile(DST, JSON.stringify(output, null, 2) + "\n", "utf-8");

  console.log("[fetch-concentration-limits]");
  console.log("  total substances :", summary.total);
  console.log("  MHLW 告示177号  :", summary.withMhlw);
  console.log("  IARC 分類       :", summary.withIarc);
  console.log("  JSOH 許容濃度   :", summary.withJsoh);
  console.log("  ACGIH TLV       :", summary.withAcgih);
  console.log("  written        →", DST);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
