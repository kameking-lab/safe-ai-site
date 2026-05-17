#!/usr/bin/env node
// Phase A: extract all law citations from the codebase.
// Output: web/scripts/audit-2026-05-17/citations.json
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");

// Scan roots — keep small and targeted.
const SCAN_ROOTS = [
  "web/src/data",
  "web/src/lib",
  "web/src/components",
  "web/src/app",
  "docs",
];

// Extensions to scan.
const EXTS = new Set([".ts", ".tsx", ".js", ".mjs", ".md", ".mdx", ".json", ".yaml", ".yml"]);

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "coverage",
  // Heavy generated datasets that we audited indirectly via their schemas:
  "jma",
  "deaths-mhlw",
  "aggregates-mhlw",
  // Translations and easy-japanese dictionaries don't carry article numbers
  "translations",
]);

// Compact list of law-short tokens. Keep in sync with LAW_METADATA keys.
const LAW_TOKENS = [
  "安衛法",
  "安衛令",
  "安衛則",
  "クレーン則",
  "有機則",
  "特化則",
  "酸欠則",
  "電離則",
  "石綿則",
  "粉じん則",
  "じん肺法",
  "作業環境測定法",
  "労基法",
  "労基則",
  "労契法",
  "労災保険法",
  "最賃法",
  "育介法",
  "職安法",
  "能開法",
  "ゴンドラ則",
  "ボイラー則",
  "高圧則",
  "建設業法",
  "女性労基則",
  "年少者労働基準規則",
  "短時間労働者管理法",
  "均等法",
  "メンタル指針",
  "VDTガイドライン",
  // Longer aliases:
  "労働安全衛生法施行令",
  "労働安全衛生法施行規則",
  "労働安全衛生規則",
  "労働安全衛生法",
  "労働基準法施行規則",
  "労働基準法",
  "労働契約法",
  "労働者災害補償保険法",
  "クレーン等安全規則",
  "有機溶剤中毒予防規則",
  "特定化学物質障害予防規則",
  "酸素欠乏症等防止規則",
  "電離放射線障害防止規則",
  "石綿障害予防規則",
  "粉じん障害防止規則",
  "事務所衛生基準規則",
  "ゴンドラ安全規則",
  "ボイラー及び圧力容器安全規則",
  "高気圧作業安全衛生規則",
  "じん肺法",
  "作業環境測定法",
  "建設業法",
  "最低賃金法",
  "職業安定法",
  "職業能力開発促進法",
  "男女雇用機会均等法",
  "育児・介護休業法",
  "育児介護休業法",
  "鉛中毒予防規則",
  "四アルキル鉛中毒予防規則",
  "事務所則",
  "鉛則",
  "四鉛則",
  // Common false-positive-safe alias
  "派遣安衛則",
  "派遣法",
];

// Match article-style citations following a law token.
// Examples handled:
//   安衛則第612条の2
//   労働安全衛生法第28条第1項
//   安衛法22条
//   安衛令別表第3
//   安衛則第36条第1号
//   安衛則第14条第1項第3号
//   有機則第29条の2
//
// We do a two-pass scan: first locate the law token, then walk forward up to ~80 chars
// collecting numeric/clause descriptors. That gives us a single canonical citation string.

const ARTICLE_PATTERN = /(?:第?(\d+)条(?:の(\d+))?(?:第?(\d+)項)?(?:第?(\d+)号)?|別表第?(\d+))/g;

function shouldScan(name) {
  if (SKIP_DIRS.has(name)) return false;
  return true;
}

function* walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!shouldScan(e.name)) continue;
      yield* walk(full);
    } else {
      const ext = path.extname(e.name);
      if (EXTS.has(ext)) yield full;
    }
  }
}

function extractFromText(text) {
  const hits = [];
  // Pass: for each law token, find all occurrences, then scan up to 80 chars for article descriptors.
  for (const tok of LAW_TOKENS) {
    let from = 0;
    while (true) {
      const idx = text.indexOf(tok, from);
      if (idx < 0) break;
      from = idx + tok.length;
      // Read up to 80 chars to capture article+clause.
      const tail = text.slice(idx + tok.length, idx + tok.length + 80);
      ARTICLE_PATTERN.lastIndex = 0;
      // Only accept if the article descriptor starts within 2 chars (allow leading '第' or whitespace)
      const m = ARTICLE_PATTERN.exec(tail);
      if (!m) continue;
      // Reject if matched far away — must start at offset 0, 1, or 2.
      if (m.index > 2) continue;
      const [whole, art, sub, paragraph, item, betsuhyo] = m;
      hits.push({
        law: tok,
        article: art ? Number(art) : null,
        sub: sub ? Number(sub) : null,
        paragraph: paragraph ? Number(paragraph) : null,
        item: item ? Number(item) : null,
        betsuhyo: betsuhyo ? Number(betsuhyo) : null,
        raw: (tok + tail.slice(0, m.index + whole.length)).trim(),
      });
    }
  }
  return hits;
}

const out = {};
let totalFiles = 0;
let totalHits = 0;
for (const root of SCAN_ROOTS) {
  const abs = path.join(repoRoot, root);
  if (!fs.existsSync(abs)) continue;
  for (const fp of walk(abs)) {
    totalFiles++;
    let text;
    try { text = fs.readFileSync(fp, "utf8"); } catch { continue; }
    const hits = extractFromText(text);
    if (hits.length === 0) continue;
    const rel = path.relative(repoRoot, fp).replaceAll("\\", "/");
    out[rel] = hits;
    totalHits += hits.length;
  }
}

const outFile = path.join(here, "citations.json");
fs.writeFileSync(outFile, JSON.stringify(out, null, 2), "utf8");
console.log(`Scanned ${totalFiles} files, ${totalHits} citations across ${Object.keys(out).length} files`);
console.log(`Wrote ${path.relative(repoRoot, outFile)}`);
