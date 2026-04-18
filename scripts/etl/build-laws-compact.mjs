#!/usr/bin/env node
/**
 * laws-mhlw/articles.jsonl (588 条) を RAG で扱える軽量 JSON に整形する。
 *
 *   $ node scripts/etl/build-laws-compact.mjs
 *
 * - articleNumber が null の行（目次・前文・表組など）は除外
 * - 縦書き PDF 抽出のため 1 字ごとに入る \n を除去し可読な 1 段落に平坦化
 * - 結果を LawArticle 形式 ({law, lawShort, articleNum, articleTitle, text, keywords})
 *   に整え、web/src/data/laws-mhlw/compact.json に書き出す
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const SRC = join(REPO_ROOT, "web", "src", "data", "laws-mhlw", "articles.jsonl");
const DST = join(REPO_ROOT, "web", "src", "data", "laws-mhlw", "compact.json");

// sourceFile に人間可読な法令名を割り当てる（推測、未確定のものは "MHLW省令改正等"）
const LAW_NAME_HINTS = {
  "000946000.pdf": ["労働安全衛生規則等の一部を改正する省令（R4.5.31）", "安衛則改正R4"],
  "000987120.pdf": ["労働安全衛生規則等の一部を改正する省令（R5）", "安衛則改正R5"],
  "001083280.pdf": ["化学物質管理関連通達", "化管通達"],
  "001089952.pdf": ["化学物質管理関連告示", "化管告示"],
  "001089979.pdf": ["化学物質管理関連告示（追補）", "化管告示補"],
  "001139723.pdf": ["石綿障害予防規則等通達", "石綿通達"],
  "001139741.pdf": ["粉じん障害予防規則関連", "粉じん関連"],
  "001139742.pdf": ["化学物質リスクアセスメント指針", "RA指針"],
  "001150522.pdf": ["労働安全衛生法令関係", "安衛令関係"],
  "001415985.pdf": ["職場のメンタルヘルス関連", "メンヘル関連"],
  "001684504.pdf": ["化学物質管理関連最新通達", "化管最新"],
};

function flattenVerticalText(raw) {
  if (!raw) return "";
  // 縦書き抽出で 1 字ごとに挟まる \n を除去。連続 \n (段落) は全角スペースに畳み込む。
  const noPara = raw.replace(/\n+/g, "");
  return noPara.replace(/\s+/g, " ").trim();
}

function extractKeywords(text, articleNum) {
  const tokens = new Set();
  // 2〜8 文字の漢字/カタカナ連続をキーワードとして抽出
  const re = /[一-龥々ー]{2,8}|[ァ-ヴー]{3,10}/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    tokens.add(m[0]);
    if (tokens.size >= 16) break;
  }
  tokens.add(articleNum);
  return [...tokens].slice(0, 12);
}

async function main() {
  const raw = await readFile(SRC, "utf8");
  const rows = raw.split("\n").filter((l) => l.trim());
  const articles = [];
  let skipped = 0;
  for (const line of rows) {
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      skipped += 1;
      continue;
    }
    if (!row.articleNumber) {
      skipped += 1;
      continue;
    }
    const text = flattenVerticalText(row.text);
    if (!text || text.length < 12) {
      skipped += 1;
      continue;
    }
    const hint = LAW_NAME_HINTS[row.sourceFile] ?? ["MHLW省令改正等", "MHLW改正"];
    articles.push({
      law: hint[0],
      lawShort: hint[1],
      articleNum: row.articleNumber,
      articleTitle: row.heading ?? "",
      text,
      keywords: extractKeywords(text, row.articleNumber),
      sourceFile: row.sourceFile,
      page: row.page,
    });
  }
  const output = {
    generatedAt: new Date().toISOString(),
    total: articles.length,
    skipped,
    sources: Object.keys(LAW_NAME_HINTS),
    articles,
  };
  await writeFile(DST, JSON.stringify(output) + "\n");
  console.error(
    `[build-laws-compact] in=${rows.length} kept=${articles.length} skipped=${skipped}`
  );
  console.error(`  wrote: ${DST}`);
}

main().catch((err) => {
  console.error("[build-laws-compact] error:", err);
  process.exitCode = 1;
});
