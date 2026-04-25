#!/usr/bin/env node
/**
 * 10年分の労働安全衛生関連法改正を data/law-updates-10years.jsonl に出力する。
 *
 * 入力:
 *   web/src/data/mock/real-law-revisions.ts
 *   web/src/data/mock/real-law-revisions-extra.ts
 *   （e-Gov 法令検索／厚労省通達・告示／官報をベースに編集部が curated）
 *
 * 出力スキーマ（1行=1レコード, JSONL）:
 *   {
 *     id: string,
 *     title: string,
 *     publicationDate: string,        // 公布日 YYYY-MM-DD
 *     enforcementDate: string,        // 施行日 YYYY-MM-DD
 *     law: string,                    // 法令名（category）
 *     kind: "law"|"ordinance"|"notice"|"guideline"|"announcement",
 *     issuer: string,
 *     amendedSection: string,         // 改正箇所（revisionNumber + notice_no）
 *     summary: string,
 *     impactedIndustries: string[],   // 影響業種
 *     impact?: "高"|"中"|"低",
 *     source: { url?: string, label?: string }
 *   }
 *
 * 実行:
 *   node scripts/etl/fetch-law-updates.mjs
 *   node scripts/etl/fetch-law-updates.mjs --dry-run
 *
 * 冪等。出力は上書き。
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const SRC_FILES = [
  join(REPO_ROOT, "web", "src", "data", "mock", "real-law-revisions.ts"),
  join(REPO_ROOT, "web", "src", "data", "mock", "real-law-revisions-extra.ts"),
];
const OUT_PATH = join(REPO_ROOT, "data", "law-updates-10years.jsonl");

const TARGET_YEARS = Array.from({ length: 10 }, (_, i) => 2015 + i); // 2015〜2024

function parseArgs(argv) {
  const args = { dryRun: false, all: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--all") args.all = true; // 10年に絞らず全件
  }
  return args;
}

function log(...parts) {
  console.error("[fetch-law-updates]", ...parts);
}

function parseRevisionsArrayFromTs(src) {
  const re = /export\s+const\s+\w+\s*:\s*LawRevisionCore\[\]\s*=\s*\[/;
  const match = re.exec(src);
  if (!match) return [];
  const arrStart = match.index + match[0].length - 1;
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
    return new Function(`return (${literal});`)();
  } catch (err) {
    log(`parse error: ${err.message}`);
    return [];
  }
}

function inTargetRange(dateStr) {
  if (!dateStr) return false;
  const m = String(dateStr).match(/^(\d{4})/);
  if (!m) return false;
  return TARGET_YEARS.includes(Number(m[1]));
}

/**
 * 業種タグ＋本文から影響業種を推定する。明示の industry_tags / industry_detail を最優先。
 */
const INDUSTRY_KEYWORDS = [
  ["建設業", /建設|工事|足場|墜落|高所|建築|解体/],
  ["製造業", /製造|工場|機械|プレス|溶接|金属/],
  ["林業", /林業|伐木|チェーンソー|造林/],
  ["運輸交通業", /運輸|運送|フォークリフト|荷役|貨物|トラック|交通|タクシー/],
  ["保健衛生業", /医療|介護|看護|病院|福祉|腰痛|ヘルスケア/],
  ["商業", /小売|商業|販売|店舗/],
  ["化学", /化学|有機溶剤|特定化学|SDS|リスクアセスメント|石綿|アスベスト/],
  ["農業", /農業|畜産|農作業/],
  ["食品", /食品|外食|飲食/],
  ["電気業", /電気|感電|高圧/],
  ["IT", /IT|情報|デジタル|オフィス/],
];

function inferIndustries(rev) {
  if (Array.isArray(rev.industry_tags) && rev.industry_tags.length) {
    return Array.from(new Set(rev.industry_tags.map(String)));
  }
  if (rev.industry_detail) {
    const direct = String(rev.industry_detail);
    if (direct.includes("全業種") || direct.includes("全産業")) return ["全業種"];
  }
  const haystack = `${rev.title} ${rev.summary} ${rev.industry_detail ?? ""}`;
  const tags = [];
  for (const [tag, re] of INDUSTRY_KEYWORDS) {
    if (re.test(haystack)) tags.push(tag);
  }
  if (tags.length === 0) return ["全業種"];
  return tags;
}

function toUnified(rev) {
  return {
    id: rev.id,
    title: rev.title,
    publicationDate: rev.publication_date || rev.publishedAt || "",
    enforcementDate: rev.enforcement_date || rev.publishedAt || "",
    law: rev.category ?? "",
    kind: rev.kind ?? "",
    issuer: rev.issuer ?? "",
    amendedSection: [rev.revisionNumber, rev.notice_no, rev.official_notice_number]
      .filter(Boolean)
      .join(" / "),
    summary: rev.summary ?? "",
    impactedIndustries: inferIndustries(rev),
    impact: rev.impact ?? undefined,
    source: rev.source ?? (rev.source_url ? { url: rev.source_url, label: "source" } : {}),
  };
}

async function loadAll() {
  const out = [];
  for (const path of SRC_FILES) {
    if (!existsSync(path)) {
      log(`skip: ${path} not found`);
      continue;
    }
    const src = await readFile(path, "utf8");
    const items = parseRevisionsArrayFromTs(src);
    log(`loaded ${items.length} revisions from ${path.split(/[\\/]/).pop()}`);
    out.push(...items);
  }
  return out;
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

async function main() {
  const args = parseArgs(process.argv);
  log(args.all ? "loading all years" : `target years: ${TARGET_YEARS[0]}〜${TARGET_YEARS[TARGET_YEARS.length - 1]}`);

  const all = dedupeById(await loadAll());
  const filtered = args.all
    ? all
    : all.filter((r) => inTargetRange(r.publishedAt) || inTargetRange(r.publication_date) || inTargetRange(r.enforcement_date));

  filtered.sort((a, b) => String(b.publishedAt ?? "").localeCompare(String(a.publishedAt ?? "")));

  const unified = filtered.map(toUnified);

  const byYear = new Map();
  const byKind = new Map();
  for (const u of unified) {
    const y = (u.publicationDate || u.enforcementDate).slice(0, 4) || "?";
    byYear.set(y, (byYear.get(y) ?? 0) + 1);
    byKind.set(u.kind, (byKind.get(u.kind) ?? 0) + 1);
  }
  log(`total: ${unified.length}`);
  log(`by year: ${[...byYear.entries()].sort().map(([y, c]) => `${y}=${c}`).join(", ")}`);
  log(`by kind: ${[...byKind.entries()].map(([k, c]) => `${k}=${c}`).join(", ")}`);

  if (args.dryRun) {
    log("dry-run: not writing output");
    return;
  }

  await mkdir(dirname(OUT_PATH), { recursive: true });
  const body = unified.map((r) => JSON.stringify(r)).join("\n") + "\n";
  await writeFile(OUT_PATH, body, "utf8");
  log(`wrote ${OUT_PATH} (${unified.length} rows, ${(Buffer.byteLength(body) / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
