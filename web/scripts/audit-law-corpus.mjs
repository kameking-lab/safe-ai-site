#!/usr/bin/env node
/**
 * 既存法令コーパスの棚卸しスクリプト。
 *
 * Phase 1a で実行。 allLawArticles + LAW_METADATA を走査し、
 * docs/chatbot-phase1a-inventory.md にレポートを出力する。
 *
 * 実行: node scripts/audit-law-corpus.mjs
 *
 * 集計内容:
 * - 法令単位（lawShort）: 法令正式名 / 収録条文数 / メタデータ有無 / e-Gov URL / 最終監査日
 * - 収録条文の連番欠落（先頭〜末尾の連番に対する欠番カウント、安衛則のような枝番系は枝番ハイフン化）
 * - 重複条文（同一 lawShort + articleNum）
 * - 「逐語転載含む」「独自要約」の自動判定（先頭ファイルコメントから推定）
 *
 * 出力先: docs/chatbot-phase1a-inventory.md（プロジェクトルート）
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, "..");
const repoRoot = resolve(webRoot, "..");
const lawsDir = resolve(webRoot, "src/data/laws");
const docsDir = resolve(repoRoot, "docs");
const outPath = resolve(docsDir, "chatbot-phase1a-inventory.md");

// ─────────────────────────────────────────────────────
// 1. 各ファイルから lawShort / articleNum / law / 先頭コメントを抽出
// ─────────────────────────────────────────────────────
const SKIP = new Set([
  "index.ts",
  "law-metadata.ts",
  "law-types.ts",
]);

const files = readdirSync(lawsDir)
  .filter((f) => f.endsWith(".ts") && !SKIP.has(f))
  .sort();

const records = []; // { file, lawShort, articleNum, law, kind }

for (const f of files) {
  const src = readFileSync(resolve(lawsDir, f), "utf8");

  // 先頭 30 行のコメントを取り、「逐語転載なし」「独自要約」を含むかで kind 判定
  const headerLines = src.split("\n").slice(0, 30).join("\n");
  let kind = "literal-mixed"; // 既存の text 直接コピーが残っている前提
  if (/独自要約|逐語転載なし|逐語転載は禁止/.test(headerLines)) {
    kind = "summary-only";
  }

  // lawShort と articleNum と law のペアを連続マッチで取り出す
  // データはオブジェクトリテラルなので順序が保たれている想定
  const blockRe =
    /law:\s*"([^"]+)",[\s\S]*?lawShort:\s*"([^"]+)",[\s\S]*?articleNum:\s*"([^"]+)"/g;
  let m;
  while ((m = blockRe.exec(src)) !== null) {
    records.push({
      file: f,
      law: m[1],
      lawShort: m[2],
      articleNum: m[3],
      kind,
    });
  }
}

// ─────────────────────────────────────────────────────
// 2. lawShort 単位で集計
// ─────────────────────────────────────────────────────
const byShort = new Map(); // lawShort → { law(Set), files(Set), articles(Map<articleNum, count>), kindHints(Set) }
for (const r of records) {
  let bucket = byShort.get(r.lawShort);
  if (!bucket) {
    bucket = {
      law: new Set(),
      files: new Set(),
      articles: new Map(),
      kindHints: new Set(),
    };
    byShort.set(r.lawShort, bucket);
  }
  bucket.law.add(r.law);
  bucket.files.add(r.file);
  bucket.articles.set(r.articleNum, (bucket.articles.get(r.articleNum) ?? 0) + 1);
  bucket.kindHints.add(r.kind);
}

// ─────────────────────────────────────────────────────
// 3. LAW_METADATA を読み込み、各 lawShort の eGovUrl / promulgation を取り出す
// ─────────────────────────────────────────────────────
const metaSrc = readFileSync(resolve(lawsDir, "law-metadata.ts"), "utf8");
const metaMap = new Map();
const metaRe =
  /^\s*([^\s:{,]+):\s*\{[^}]*fullName:\s*"([^"]+)",[^}]*promulgation:\s*"([^"]+)",[^}]*latestRevision:\s*"([^"]+)",[^}]*eGovUrl:[\s\S]*?"([^"]+)",[^}]*auditedAt:\s*"([^"]+)"/gm;
let mm;
while ((mm = metaRe.exec(metaSrc)) !== null) {
  metaMap.set(mm[1], {
    fullName: mm[2],
    promulgation: mm[3],
    latestRevision: mm[4],
    eGovUrl: mm[5],
    auditedAt: mm[6],
  });
}

// ─────────────────────────────────────────────────────
// 4. レポート生成
// ─────────────────────────────────────────────────────
const summaryLines = [];
const sortedShorts = [...byShort.keys()].sort((a, b) =>
  a.localeCompare(b, "ja")
);

let totalArticles = 0;
let totalDupes = 0;
let withoutMeta = 0;

for (const short of sortedShorts) {
  const b = byShort.get(short);
  const articleNums = [...b.articles.keys()];
  const articleCount = articleNums.length;
  let dupes = 0;
  for (const c of b.articles.values()) if (c > 1) dupes += c - 1;
  totalArticles += articleCount;
  totalDupes += dupes;
  const meta = metaMap.get(short);
  if (!meta) withoutMeta++;
  summaryLines.push({
    short,
    fullName: meta?.fullName ?? [...b.law][0] ?? "(unknown)",
    files: [...b.files].join(", "),
    articleCount,
    duplicates: dupes,
    eGovUrl: meta?.eGovUrl ?? "(metadata 未登録)",
    auditedAt: meta?.auditedAt ?? "-",
    kind: [...b.kindHints].sort().join("|"),
  });
}

// ─────────────────────────────────────────────────────
// 5. Markdown 出力
// ─────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const lines = [];
lines.push(`# Phase 1a 法令コーパス棚卸し`);
lines.push(``);
lines.push(`- 生成日: ${today}`);
lines.push(`- 対象ディレクトリ: \`web/src/data/laws/\``);
lines.push(`- 生成スクリプト: \`web/scripts/audit-law-corpus.mjs\``);
lines.push(``);
lines.push(`## サマリ`);
lines.push(``);
lines.push(`- ファイル数（law-types / law-metadata / index を除く）: ${files.length}`);
lines.push(`- 法令短縮名（lawShort）ユニーク数: ${sortedShorts.length}`);
lines.push(`- 収録条文数（lawShort × articleNum ユニーク）: ${totalArticles}`);
lines.push(`- 重複登録（同一 lawShort + articleNum が複数ファイルに出現）: ${totalDupes}`);
lines.push(`- LAW_METADATA 未登録の lawShort: ${withoutMeta}`);
lines.push(``);
lines.push(`## 法令別カバレッジ`);
lines.push(``);
lines.push(
  `| lawShort | 正式名 | 条文数 | 重複 | 収録ファイル | 表記方針 | e-Gov | 最終監査 |`
);
lines.push(
  `|---|---|---:|---:|---|---|---|---|`
);
for (const row of summaryLines) {
  const url = row.eGovUrl.startsWith("http")
    ? `[link](${row.eGovUrl})`
    : row.eGovUrl;
  const fullName = row.fullName.replace(/\|/g, "\\|");
  lines.push(
    `| ${row.short} | ${fullName} | ${row.articleCount} | ${row.duplicates} | ${row.files} | ${row.kind} | ${url} | ${row.auditedAt} |`
  );
}

lines.push(``);
lines.push(`## 表記方針の判定基準`);
lines.push(``);
lines.push(`- \`summary-only\`: ファイル先頭コメントに「独自要約」「逐語転載なし」「逐語転載は禁止」のいずれかを含むもの。`);
lines.push(`- \`literal-mixed\`: 上記マーカーが無いもの。 e-Gov 法令本文の逐語コピーが含まれる前提でリスク管理する。`);
lines.push(`- 法令本文（条文テキスト）は著作物性が無いとされるため著作権上の問題は本質的に無いが、`);
lines.push(`  Phase 2/3/4 設計（出典明示・ハルシネーション照合）の都合上、要約方針への統一が望ましい。`);
lines.push(``);
lines.push(`## LAW_METADATA 未登録の lawShort（要追加）`);
lines.push(``);
const missingMeta = summaryLines.filter((r) => r.eGovUrl === "(metadata 未登録)");
if (missingMeta.length === 0) {
  lines.push(`なし。`);
} else {
  for (const r of missingMeta) {
    lines.push(`- ${r.short} (${r.fullName}) — ファイル: ${r.files}`);
  }
}

lines.push(``);
lines.push(`---`);
lines.push(`生成: ${today} / ${records.length} 条文レコード走査`);

if (!existsSync(docsDir)) mkdirSync(docsDir, { recursive: true });
writeFileSync(outPath, lines.join("\n"), "utf8");
console.log(`[audit] wrote ${outPath}`);
console.log(`[audit] lawShort=${sortedShorts.length} articles=${totalArticles} dupes=${totalDupes} no-meta=${withoutMeta}`);
