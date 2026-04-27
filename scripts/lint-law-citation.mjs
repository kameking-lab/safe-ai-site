#!/usr/bin/env node
/**
 * 法令引用Linter
 * 使い方: node scripts/lint-law-citation.mjs --target "web/src/data/seo-articles/*.json"
 *
 * 第1層チェック:
 *  - 法律条文番号が既知の範囲内か（労働安全衛生法 第1-123条 等）
 *  - 通達番号が基発/安発 等の正規フォーマットに合致しているか
 *  - モックDBに存在する通達番号と照合（不明なものはwarning）
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Node.js組み込みのみで動作するシンプルなglobSync代替
function globFiles(pattern, cwd) {
  const abs = path.resolve(cwd, pattern);
  const dir = path.dirname(abs);
  const base = path.basename(abs);
  const re = new RegExp("^" + base.replace(/\./g, "\\.").replace(/\*/g, "[^/]*") + "$");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => re.test(f))
    .map((f) => path.relative(cwd, path.join(dir, f)).replace(/\\/g, "/"));
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ────────────────────────────────────────────────────────────
// 法律条文 既知上限 (e-Gov 現行法令より)
// ────────────────────────────────────────────────────────────
const LAW_ARTICLE_LIMITS = [
  { name: "労働安全衛生法", pattern: /労働安全衛生法\s*第(\d+)条/g, max: 123 },
  { name: "労安衛法", pattern: /労安衛法\s*第(\d+)条/g, max: 123 },
  { name: "安衛則", pattern: /安衛則\s*第(\d+)条/g, max: 672 },
  { name: "労働安全衛生規則", pattern: /労働安全衛生規則\s*第(\d+)条/g, max: 672 },
  { name: "有機則", pattern: /有機則\s*第(\d+)条/g, max: 35 },
  { name: "有機溶剤中毒予防規則", pattern: /有機溶剤中毒予防規則\s*第(\d+)条/g, max: 35 },
  { name: "特化則", pattern: /特化則\s*第(\d+)条/g, max: 57 },
  { name: "特定化学物質障害予防規則", pattern: /特定化学物質障害予防規則\s*第(\d+)条/g, max: 57 },
  { name: "酸欠則", pattern: /酸欠則\s*第(\d+)条/g, max: 29 },
  { name: "酸素欠乏症等防止規則", pattern: /酸素欠乏症等防止規則\s*第(\d+)条/g, max: 29 },
  { name: "高圧則", pattern: /高圧則\s*第(\d+)条/g, max: 51 },
  { name: "高気圧作業安全衛生規則", pattern: /高気圧作業安全衛生規則\s*第(\d+)条/g, max: 51 },
  { name: "クレーン等安全規則", pattern: /クレーン等安全規則\s*第(\d+)条/g, max: 223 },
  { name: "ボイラー及び圧力容器安全規則", pattern: /ボイラー及び圧力容器安全規則\s*第(\d+)条/g, max: 127 },
];

// 通達番号の正規フォーマット（基発MMDD第N号 など）
const NOTICE_FORMAT_REGEX = /([基安発発基]{1,2}[発基安]?\d{4}第\d+号|[基安]発\d{4}第\d+号)/g;
const NOTICE_VALID_FORMAT = /^[基安発][発基安]?\d{4}第\d+号$|^基[安発]\d{4}第\d+号$/;

// ────────────────────────────────────────────────────────────
// モックDBから通達番号を読み込む
// ────────────────────────────────────────────────────────────
function loadKnownNoticeNumbers() {
  const mockFile = path.join(ROOT, "web/src/data/mock/notices-and-precedents.ts");
  if (!existsSync(mockFile)) return new Set();

  const src = readFileSync(mockFile, "utf-8");
  const found = new Set();

  // notice_no: "基発0622第2号" のようなパターンを抽出
  const patterns = [
    /notice_no:\s*["']([^"']+)["']/g,
    /revisionNumber:\s*["']([^"']+)["']/g,
    /official_notice_number:\s*["']([^"']+)["']/g,
  ];
  for (const re of patterns) {
    for (const m of src.matchAll(re)) {
      if (m[1] && m[1].includes("第") && m[1].includes("号")) {
        found.add(m[1].trim());
      }
    }
  }
  return found;
}

// ────────────────────────────────────────────────────────────
// テキスト抽出 (JSON / JSONL / MD)
// ────────────────────────────────────────────────────────────
function extractText(filePath) {
  const src = readFileSync(filePath, "utf-8");
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".jsonl") {
    return src
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.stringify(JSON.parse(line));
        } catch {
          return line;
        }
      })
      .join("\n");
  }

  if (ext === ".json") {
    try {
      return JSON.stringify(JSON.parse(src));
    } catch {
      return src;
    }
  }

  // MD or fallback
  return src;
}

// ────────────────────────────────────────────────────────────
// メイン
// ────────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const targetIdx = args.indexOf("--target");
  if (targetIdx === -1 || !args[targetIdx + 1]) {
    console.error("使い方: node scripts/lint-law-citation.mjs --target \"web/src/data/seo-articles/*.json\"");
    process.exit(1);
  }

  const targetPattern = args[targetIdx + 1];
  const files = globFiles(targetPattern, ROOT);

  if (files.length === 0) {
    console.log(`[lint-law-citation] 対象ファイルなし: ${targetPattern}`);
    process.exit(0);
  }

  const knownNotices = loadKnownNoticeNumbers();
  console.log(`[lint-law-citation] 既知通達番号: ${knownNotices.size}件, 対象ファイル: ${files.length}件`);

  const errors = [];
  const warnings = [];

  for (const relPath of files) {
    const absPath = path.join(ROOT, relPath);
    let text;
    try {
      text = extractText(absPath);
    } catch (e) {
      warnings.push(`${relPath}: ファイル読み込みエラー - ${e.message}`);
      continue;
    }

    // 法律条文チェック
    for (const law of LAW_ARTICLE_LIMITS) {
      const re = new RegExp(law.pattern.source, "g");
      for (const m of text.matchAll(re)) {
        const num = parseInt(m[1], 10);
        if (num < 1 || num > law.max) {
          errors.push(
            `${relPath}: ${law.name}第${num}条 は範囲外です (有効: 第1条〜第${law.max}条)`
          );
        }
      }
    }

    // 通達番号チェック
    const noticeRe = /([基安発][発基安]?\d{4}第\d+号)/g;
    for (const m of text.matchAll(noticeRe)) {
      const num = m[1];
      if (!NOTICE_VALID_FORMAT.test(num)) {
        errors.push(`${relPath}: 通達番号フォーマット不正: "${num}"`);
      } else if (knownNotices.size > 0 && !knownNotices.has(num)) {
        warnings.push(`${relPath}: 通達番号がDBに未登録: "${num}" (実在確認を推奨)`);
      }
    }
  }

  // 結果出力
  for (const w of warnings) {
    console.warn(`[WARN] ${w}`);
  }
  for (const e of errors) {
    console.error(`[ERROR] ${e}`);
  }

  const total = errors.length + warnings.length;
  if (total === 0) {
    console.log("[lint-law-citation] ✓ エラーなし");
  } else {
    console.log(`[lint-law-citation] エラー: ${errors.length}件, 警告: ${warnings.length}件`);
  }

  if (errors.length > 0) {
    process.exit(1);
  }
}

main();
