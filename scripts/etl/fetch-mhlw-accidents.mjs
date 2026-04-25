#!/usr/bin/env node
/**
 * 10年分の労災事故データを統合し data/accidents-10years.jsonl を出力する。
 *
 * 入力ソース（優先度順）:
 *   1. web/src/data/deaths-mhlw/records-{YYYY}.jsonl
 *      → 厚労省 死亡災害DB（2019〜2023の構造化データ）
 *   2. web/src/data/mock/real-accident-cases*.ts
 *      → ANZEN AI 編集部が curated した詳細事例（公開情報ベース）
 *   3. (任意) Vercel Blob mhlw-accidents/{YYYY}.jsonl
 *      → BLOB_READ_WRITE_TOKEN が設定されていれば 2015〜2021 をマージ
 *
 * 出力スキーマ（1行=1レコード, JSONL）:
 *   {
 *     id: string,
 *     occurredOn: string  (YYYY-MM-DD or YYYY-MM),
 *     industry: string,
 *     industryDetail?: string,
 *     accidentType: string,
 *     ageGroup?: string,
 *     gender?: string,
 *     summary: string,
 *     causes: string[],
 *     preventions: string[],
 *     severity?: "軽傷"|"中等傷"|"重傷"|"死亡",
 *     source: { name: string, url?: string, caseId?: string }
 *   }
 *
 * 実行:
 *   node scripts/etl/fetch-mhlw-accidents.mjs
 *   BLOB_READ_WRITE_TOKEN=xxx node scripts/etl/fetch-mhlw-accidents.mjs --with-blob
 *   node scripts/etl/fetch-mhlw-accidents.mjs --dry-run
 *
 * 冪等。出力は上書き。
 */

import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const DEATHS_DIR = join(REPO_ROOT, "web", "src", "data", "deaths-mhlw");
const CURATED_DIR = join(REPO_ROOT, "web", "src", "data", "mock");
const OUT_PATH = join(REPO_ROOT, "data", "accidents-10years.jsonl");

const TARGET_YEARS = Array.from({ length: 10 }, (_, i) => 2015 + i); // 2015〜2024

const CURATED_FILES = [
  "real-accident-cases.ts",
  "real-accident-cases-extra.ts",
  "real-accident-cases-extra2.ts",
  "real-accident-cases-extra3.ts",
  "real-accident-cases-diverse-industries.ts",
];

function parseArgs(argv) {
  const args = { withBlob: false, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--with-blob") args.withBlob = true;
    else if (a === "--dry-run") args.dryRun = true;
  }
  return args;
}

function log(...parts) {
  console.error("[fetch-mhlw-accidents]", ...parts);
}

function inTargetRange(year) {
  return TARGET_YEARS.includes(year);
}

function extractYear(dateStr) {
  if (!dateStr) return null;
  const m = String(dateStr).match(/(\d{4})/);
  return m ? Number(m[1]) : null;
}

function normalizeDate(occurredOn, year, month) {
  if (occurredOn && /^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) return occurredOn;
  if (occurredOn && /^\d{4}-\d{2}$/.test(occurredOn)) return occurredOn;
  if (year && month) return `${year}-${String(month).padStart(2, "0")}`;
  if (year) return `${year}`;
  return occurredOn ?? "";
}

async function loadDeathRecords() {
  if (!existsSync(DEATHS_DIR)) {
    log(`deaths dir not found: ${DEATHS_DIR}`);
    return [];
  }
  const files = (await readdir(DEATHS_DIR)).filter((f) => /^records-\d{4}\.jsonl$/.test(f));
  const out = [];
  for (const file of files.sort()) {
    const raw = await readFile(join(DEATHS_DIR, file), "utf8");
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      let rec;
      try {
        rec = JSON.parse(line);
      } catch {
        continue;
      }
      if (!inTargetRange(rec.year)) continue;
      out.push(toUnifiedFromDeath(rec));
    }
  }
  log(`deaths: loaded ${out.length} records from ${files.length} files`);
  return out;
}

function toUnifiedFromDeath(rec) {
  return {
    id: rec.id,
    occurredOn: normalizeDate(null, rec.year, rec.month),
    industry: rec.industry?.majorName ?? "",
    industryDetail: rec.industry?.minorName ?? rec.industry?.mediumName ?? undefined,
    accidentType: rec.accidentType?.name ?? "",
    summary: rec.description ?? "",
    causes: rec.cause?.minorName
      ? [rec.cause.minorName]
      : rec.cause?.mediumName
      ? [rec.cause.mediumName]
      : [],
    preventions: [],
    severity: "死亡",
    workplaceSize: rec.workplaceSize ?? undefined,
    source: {
      name: "厚労省 死亡災害データベース",
      url: "https://anzeninfo.mhlw.go.jp/anzen_pg/SHISHO_FND.aspx",
    },
  };
}

/**
 * curated TS ファイルから AccidentCase オブジェクト配列を抽出する簡易パーサ。
 * `export const realAccidentCases: AccidentCase[] = [ ... ];` 形式を想定し、
 * オブジェクトリテラルを抜き出して JSON 風に評価する。
 */
async function loadCuratedCases() {
  const out = [];
  for (const fname of CURATED_FILES) {
    const path = join(CURATED_DIR, fname);
    if (!existsSync(path)) {
      log(`skip: ${fname} not found`);
      continue;
    }
    const src = await readFile(path, "utf8");
    const items = parseAccidentArrayFromTs(src);
    for (const item of items) {
      const year = extractYear(item.occurredOn);
      if (year && !inTargetRange(year)) continue;
      out.push(toUnifiedFromCurated(item));
    }
    log(`curated: ${items.length} cases from ${fname}`);
  }
  return out;
}

/**
 * きわめて緩いパーサ: `export const ...: AccidentCase[] = [` から終端 `];` までを切り出し、
 * JavaScript として eval してオブジェクト配列を取り出す。TS型注釈は除去する。
 */
function parseAccidentArrayFromTs(src) {
  const re = /export\s+const\s+\w+\s*:\s*AccidentCase\[\]\s*=\s*\[/;
  const match = re.exec(src);
  if (!match) return [];
  // 配列開始 `[` は、宣言全体（`AccidentCase[] = [`）の末尾。
  const arrStart = match.index + match[0].length - 1;
  // 対応する閉じ ] までブラケット深さで進む
  let depth = 0;
  let endIdx = -1;
  for (let i = arrStart; i < src.length; i++) {
    const ch = src[i];
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) {
        endIdx = i;
        break;
      }
    } else if (ch === '"' || ch === "'" || ch === "`") {
      // skip string literal
      const quote = ch;
      i++;
      while (i < src.length && src[i] !== quote) {
        if (src[i] === "\\") i++;
        i++;
      }
    }
  }
  if (endIdx === -1) return [];
  const literal = src.slice(arrStart, endIdx + 1);
  try {
    // eslint-disable-next-line no-new-func
    return new Function(`return (${literal});`)();
  } catch (err) {
    log(`parse error in TS literal: ${err.message}`);
    return [];
  }
}

function toUnifiedFromCurated(c) {
  return {
    id: c.id,
    occurredOn: c.occurredOn,
    industry: c.workCategory ?? "",
    industryDetail: c.industry_detail ?? undefined,
    accidentType: c.type ?? "",
    summary: c.summary ?? "",
    causes: Array.isArray(c.mainCauses) ? c.mainCauses : [],
    preventions: Array.isArray(c.preventionPoints) ? c.preventionPoints : [],
    severity: c.severity ?? undefined,
    workerAttribute: c.worker_attribute ?? undefined,
    companySize: c.company_size ?? undefined,
    source: c.source
      ? {
          name: c.source.site,
          url: c.source.url,
          caseId: c.source.caseId,
        }
      : c.id?.startsWith("mhlw-")
      ? {
          name: "厚労省 職場のあんぜんサイト",
          url: `https://anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=${c.id.replace("mhlw-", "")}`,
          caseId: c.id.replace("mhlw-", ""),
        }
      : { name: "ANZEN AI 編集部 curated 事例" },
  };
}

async function fetchFromBlobIfRequested(withBlob) {
  if (!withBlob) return [];
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    log("--with-blob given but BLOB_READ_WRITE_TOKEN not set; skipping");
    return [];
  }
  const manifestPath = join(REPO_ROOT, "web", "src", "data", "aggregates-mhlw", "blob-manifest.json");
  if (!existsSync(manifestPath)) {
    log("blob-manifest.json not found; skipping");
    return [];
  }
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const out = [];
  for (const entry of manifest.entries) {
    const year = Number(entry.year);
    if (!inTargetRange(year)) continue;
    log(`fetching blob ${entry.key} (${entry.lines.toLocaleString()} rows)`);
    try {
      const res = await fetch(entry.url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        log(`  blob ${entry.year} fetch failed: ${res.status}`);
        continue;
      }
      const text = await res.text();
      for (const line of text.split("\n")) {
        if (!line.trim()) continue;
        try {
          const rec = JSON.parse(line);
          out.push(toUnifiedFromBlob(rec, year));
        } catch {
          /* skip */
        }
      }
    } catch (err) {
      log(`  blob ${entry.year} error: ${err.message}`);
    }
  }
  return out;
}

function toUnifiedFromBlob(rec, year) {
  return {
    id: rec.id ?? `mhlw-blob-${year}-${rec.row ?? Math.random().toString(36).slice(2, 8)}`,
    occurredOn: rec.occurredOn ?? normalizeDate(null, year, rec.month),
    industry: rec.industry?.majorName ?? rec.industry ?? "",
    industryDetail: rec.industry?.minorName ?? undefined,
    accidentType: rec.accidentType?.name ?? rec.accidentType ?? "",
    summary: rec.description ?? rec.summary ?? "",
    causes: rec.causes ?? [],
    preventions: rec.preventions ?? [],
    severity: rec.severity ?? undefined,
    source: {
      name: "厚労省 職場のあんぜんサイト（死傷災害DB）",
      url: "https://anzeninfo.mhlw.go.jp/anzen_pg/SAI_FND.aspx",
    },
  };
}

function dedupeById(records) {
  const seen = new Set();
  const out = [];
  for (const r of records) {
    if (!r.id) continue;
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
  }
  return out;
}

function summarize(records) {
  const byYear = new Map();
  const byIndustry = new Map();
  for (const r of records) {
    const y = extractYear(r.occurredOn);
    if (y) byYear.set(y, (byYear.get(y) ?? 0) + 1);
    const ind = r.industry || "(未分類)";
    byIndustry.set(ind, (byIndustry.get(ind) ?? 0) + 1);
  }
  return { byYear, byIndustry };
}

async function main() {
  const args = parseArgs(process.argv);
  log(`target years: ${TARGET_YEARS[0]}〜${TARGET_YEARS[TARGET_YEARS.length - 1]}`);

  const [deaths, curated, blob] = await Promise.all([
    loadDeathRecords(),
    loadCuratedCases(),
    fetchFromBlobIfRequested(args.withBlob),
  ]);

  const merged = dedupeById([...deaths, ...curated, ...blob]);
  merged.sort((a, b) => String(b.occurredOn).localeCompare(String(a.occurredOn)));

  const { byYear, byIndustry } = summarize(merged);
  log(`total records: ${merged.length.toLocaleString()}`);
  log(`by year: ${[...byYear.entries()].sort().map(([y, c]) => `${y}=${c}`).join(", ")}`);
  log(`top industries: ${[...byIndustry.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, c]) => `${n}(${c})`).join(", ")}`);

  if (args.dryRun) {
    log("dry-run: not writing output");
    return;
  }

  await mkdir(dirname(OUT_PATH), { recursive: true });
  const body = merged.map((r) => JSON.stringify(r)).join("\n") + "\n";
  await writeFile(OUT_PATH, body, "utf8");
  log(`wrote ${OUT_PATH} (${merged.length.toLocaleString()} rows, ${(Buffer.byteLength(body) / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
