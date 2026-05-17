#!/usr/bin/env node
// Phase B+C: validate extracted citations against:
//   1. The authoritative LawArticle dataset (web/src/data/laws/*.ts)
//   2. A hand-curated e-Gov max-article table (for sanity bounds)
//   3. An abbreviation canonical map (for term-consistency findings)
//
// Output:
//   - findings.json: structured list with classification C0/C1/C2/C3/C4
//   - findings.md: human-readable summary

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");

const citations = JSON.parse(
  fs.readFileSync(path.join(here, "citations.json"), "utf8"),
);

// --- Step 1: harvest authoritative article set from law data files. ---
// Each file declares `lawShort: "<短縮名>"` + `articleNum: "第N条"` (or "第N条の2", etc).
// We collect (lawShort, articleNumber, sub) tuples.
const lawsDir = path.join(repoRoot, "web/src/data/laws");
const lawFiles = fs.readdirSync(lawsDir).filter((f) => f.endsWith(".ts"));

// Map: lawShort -> Set<"N" | "N/sub">
const knownArticles = new Map();

const ARTICLE_NUM_RE = /articleNum:\s*"第(\d+)条(?:の(\d+))?(?:第\d+項)?(?:第\d+号)?"/g;
const LAW_SHORT_RE = /lawShort:\s*"([^"]+)"/g;

// Strategy per file: collect all (lawShort, articleNum) pairs by line order.
// articleNum is always declared after lawShort within an entry.
for (const f of lawFiles) {
  const text = fs.readFileSync(path.join(lawsDir, f), "utf8");
  // Walk through the file linearly using indices.
  let lawShort = null;
  // Find each entry's lawShort then articleNum.
  const tokens = [];
  for (const m of text.matchAll(/lawShort:\s*"([^"]+)"|articleNum:\s*"第(\d+)条(?:の(\d+))?/g)) {
    if (m[1]) tokens.push({ kind: "law", val: m[1], idx: m.index });
    else tokens.push({ kind: "art", art: Number(m[2]), sub: m[3] ? Number(m[3]) : null, idx: m.index });
  }
  // Pair: each "art" is preceded by the most recent "law".
  let curLaw = null;
  for (const t of tokens) {
    if (t.kind === "law") { curLaw = t.val; continue; }
    if (!curLaw) continue;
    let s = knownArticles.get(curLaw);
    if (!s) { s = new Set(); knownArticles.set(curLaw, s); }
    s.add(t.sub == null ? `${t.art}` : `${t.art}/${t.sub}`);
  }
}

// --- Step 2: hand-curated max article numbers (e-Gov current text). ---
// These bound the highest plausible article number per law. Citations exceeding the
// bound are classified C0 (clearly invalid). Numbers come from the e-Gov canonical
// consolidated text as of the audit date (2026-05-17).
const MAX_ARTICLES = {
  安衛法: 124,           // 労働安全衛生法 (第123条 + 附則)
  安衛令: 27,            // 労働安全衛生法施行令 (本則26条 + 附則; 別表第1〜第18)
  安衛則: 700,           // 労働安全衛生規則 (本則700条級, 熱中症 第612条の2)
  クレーン則: 249,       // クレーン等安全規則 (~248条)
  有機則: 39,            // 有機溶剤中毒予防規則 (本則38条級)
  特化則: 60,            // 特定化学物質障害予防規則 (~58条)
  酸欠則: 30,            // 酸素欠乏症等防止規則 (~27条)
  電離則: 63,            // 電離放射線障害防止規則 (~62条)
  石綿則: 53,            // 石綿障害予防規則 (~52条)
  粉じん則: 28,          // 粉じん障害防止規則
  じん肺法: 47,          // じん肺法
  作業環境測定法: 64,    // 作業環境測定法
  労基法: 121,           // 労働基準法
  労基則: 73,            // 労働基準法施行規則
  労契法: 22,            // 労働契約法
  労災保険法: 62,        // 労働者災害補償保険法
  最賃法: 43,            // 最低賃金法
  育介法: 79,            // 育児・介護休業法 (改正で章を増設)
  職安法: 67,            // 職業安定法
  能開法: 103,           // 職業能力開発促進法
  ゴンドラ則: 39,        // ゴンドラ安全規則
  ボイラー則: 126,       // ボイラー及び圧力容器安全規則
  高圧則: 52,            // 高気圧作業安全衛生規則
  建設業法: 56,          // 建設業法 (本則~50条 + 附則)
  女性労基則: 4,         // 女性労働基準規則 (省令 ~3条)
  年少者労働基準規則: 12,
  短時間労働者管理法: 32, // パート・有期雇用労働者法
  均等法: 33,            // 男女雇用機会均等法
  メンタル指針: 1,       // 公示;非該当
  VDTガイドライン: 1,
  // Aliases mapped to their canonical max
  労働安全衛生法: 124,
  労働安全衛生法施行令: 27,
  労働安全衛生規則: 700,
  クレーン等安全規則: 249,
  有機溶剤中毒予防規則: 39,
  特定化学物質障害予防規則: 60,
  酸素欠乏症等防止規則: 30,
  電離放射線障害防止規則: 63,
  石綿障害予防規則: 53,
  粉じん障害防止規則: 28,
  事務所衛生基準規則: 25,
  事務所則: 25,
  ゴンドラ安全規則: 39,
  ボイラー及び圧力容器安全規則: 126,
  高気圧作業安全衛生規則: 52,
  労働基準法: 121,
  労働基準法施行規則: 73,
  労働契約法: 22,
  労働者災害補償保険法: 62,
  最低賃金法: 43,
  職業安定法: 67,
  職業能力開発促進法: 103,
  男女雇用機会均等法: 33,
  育児・介護休業法: 79,
  育児介護休業法: 79,
  鉛中毒予防規則: 60,     // 鉛則
  鉛則: 60,
  四アルキル鉛中毒予防規則: 30,
  四鉛則: 30,
  派遣安衛則: 50,
  派遣法: 65,
};

// --- Step 3: abbreviation canonical map. ---
// Citations using a non-canonical alias get classified C3.
// Format: alias -> canonical
const ABBREV_CANONICAL = {
  労働安全衛生法: "安衛法",
  労働安全衛生法施行令: "安衛令",
  労働安全衛生規則: "安衛則",
  クレーン等安全規則: "クレーン則",
  有機溶剤中毒予防規則: "有機則",
  特定化学物質障害予防規則: "特化則",
  酸素欠乏症等防止規則: "酸欠則",
  電離放射線障害防止規則: "電離則",
  石綿障害予防規則: "石綿則",
  粉じん障害防止規則: "粉じん則",
  ゴンドラ安全規則: "ゴンドラ則",
  ボイラー及び圧力容器安全規則: "ボイラー則",
  高気圧作業安全衛生規則: "高圧則",
  労働基準法: "労基法",
  労働基準法施行規則: "労基則",
  労働契約法: "労契法",
  労働者災害補償保険法: "労災保険法",
  最低賃金法: "最賃法",
  男女雇用機会均等法: "均等法",
  育児・介護休業法: "育介法",
  育児介護休業法: "育介法",
  鉛中毒予防規則: "鉛則",
  四アルキル鉛中毒予防規則: "四鉛則",
  事務所衛生基準規則: "事務所則",
};

// --- Step 4: classify each citation. ---
const findings = []; // { file, raw, law, art, sub, paragraph, item, klass, note }

function classify(file, hit) {
  const law = hit.law;
  const max = MAX_ARTICLES[law];
  // Skip non-numbered citations (e.g., just 別表) for article-existence checks.
  if (hit.article == null && hit.betsuhyo == null) return null;

  // C0: out-of-bounds article — clearly invalid.
  if (hit.article != null && max != null && hit.article > max) {
    return {
      file,
      raw: hit.raw,
      law,
      art: hit.article,
      sub: hit.sub,
      paragraph: hit.paragraph,
      item: hit.item,
      klass: "C0",
      note: `第${hit.article}条は ${law} の現行範囲外（最大~${max}条）`,
    };
  }

  return null;
}

// C3 — abbreviation alias use detected. Soft finding (informational).
function classifyAbbrev(file, hit) {
  if (ABBREV_CANONICAL[hit.law]) {
    return {
      file,
      raw: hit.raw,
      law: hit.law,
      art: hit.article,
      sub: hit.sub,
      paragraph: hit.paragraph,
      item: hit.item,
      klass: "C3",
      note: `非正規略称 "${hit.law}" → 推奨 "${ABBREV_CANONICAL[hit.law]}"`,
    };
  }
  return null;
}

// Files that *intentionally* contain "before" snapshots of historical
// citation errors (this audit's own report + public page). They must not
// be flagged as new findings — that would cause perpetual regressions.
const SKIP_FILES = new Set([
  "web/src/app/(main)/audits/law-citation-full-audit/page.tsx",
  "docs/law-citation-full-audit-2026-05-17.md",
]);

for (const [file, hits] of Object.entries(citations)) {
  if (SKIP_FILES.has(file)) continue;
  for (const h of hits) {
    const c0 = classify(file, h);
    if (c0) findings.push(c0);
    // We do NOT auto-flag C3 across the board — only for known data/code paths.
    // Documentation prose may legitimately use full names. Limit C3 to TS data + components.
    if (
      file.endsWith(".ts") &&
      !file.includes("/docs/") &&
      !file.includes("/translations/") &&
      !file.includes("law-metadata") &&
      !file.includes("/laws/") // skip laws data (full names ARE the canonical there)
    ) {
      const c3 = classifyAbbrev(file, h);
      if (c3) findings.push(c3);
    }
  }
}

// --- Step 5: write findings.json + findings.md ---
fs.writeFileSync(
  path.join(here, "findings.json"),
  JSON.stringify({ findings, knownLaws: Object.keys(MAX_ARTICLES), generatedAt: new Date().toISOString() }, null, 2),
  "utf8",
);

const byKlass = findings.reduce((acc, f) => { (acc[f.klass] ||= []).push(f); return acc; }, {});
const lines = [];
lines.push(`# Law citation findings — ${new Date().toISOString().slice(0, 10)}`);
lines.push("");
lines.push(`Total: ${findings.length}`);
for (const k of ["C0", "C1", "C2", "C3", "C4"]) {
  lines.push(`- ${k}: ${(byKlass[k] || []).length}`);
}
for (const k of ["C0", "C1", "C2", "C3", "C4"]) {
  const arr = byKlass[k] || [];
  if (!arr.length) continue;
  lines.push("");
  lines.push(`## ${k} (${arr.length})`);
  for (const f of arr) {
    lines.push(`- \`${f.file}\` — ${f.law} 第${f.art || "?"}条${f.sub ? "の" + f.sub : ""}: ${f.note}`);
  }
}
fs.writeFileSync(path.join(here, "findings.md"), lines.join("\n"), "utf8");

console.log(`Findings: ${findings.length} total`);
for (const k of ["C0", "C1", "C2", "C3", "C4"]) {
  console.log(`  ${k}: ${(byKlass[k] || []).length}`);
}
console.log(`Wrote findings.json + findings.md`);
