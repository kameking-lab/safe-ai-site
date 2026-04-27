#!/usr/bin/env node
/**
 * URL生存確認Linter
 * 使い方: node scripts/lint-urls.mjs --target "web/src/data/seo-articles/*.json"
 *
 * 第2層チェック:
 *  - 全外部URL (https://) をHEADリクエストで検証
 *  - 404/500/タイムアウトを検出してログ出力
 *  - 並列実行 (concurrency 10)
 *  - 結果を logs/url-check-results.json に保存
 *  - URLエラーは warning 扱い (exit 0)
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync, readdirSync } from "fs";
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

const CONCURRENCY = 10;
const TIMEOUT_MS = 10_000;
const URL_REGEX = /https:\/\/[^\s"'<>\])\}]+/g;

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

  return src;
}

// ────────────────────────────────────────────────────────────
// URL抽出
// ────────────────────────────────────────────────────────────
function extractUrls(text) {
  const raw = [...text.matchAll(URL_REGEX)].map((m) =>
    // 末尾のカンマ/ピリオド/引用符 を除去
    m[0].replace(/[,.);"']+$/, "")
  );
  return [...new Set(raw)];
}

// ────────────────────────────────────────────────────────────
// HEADリクエスト（タイムアウト付き）
// ────────────────────────────────────────────────────────────
async function checkUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 lint-urls-checker/1.0" },
      redirect: "follow",
    });
    clearTimeout(timer);
    return { url, status: res.status, ok: res.status < 400 };
  } catch (err) {
    clearTimeout(timer);
    const isTimeout = err.name === "AbortError";
    return {
      url,
      status: isTimeout ? "timeout" : "error",
      ok: false,
      error: isTimeout ? "タイムアウト" : String(err.message),
    };
  }
}

// ────────────────────────────────────────────────────────────
// 並列実行ヘルパー
// ────────────────────────────────────────────────────────────
async function runWithConcurrency(tasks, concurrency) {
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ────────────────────────────────────────────────────────────
// メイン
// ────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const targetIdx = args.indexOf("--target");
  if (targetIdx === -1 || !args[targetIdx + 1]) {
    console.error("使い方: node scripts/lint-urls.mjs --target \"web/src/data/seo-articles/*.json\"");
    process.exit(1);
  }

  const targetPattern = args[targetIdx + 1];
  const files = globFiles(targetPattern, ROOT);

  if (files.length === 0) {
    console.log(`[lint-urls] 対象ファイルなし: ${targetPattern}`);
    process.exit(0);
  }

  // URL収集
  const urlToFiles = new Map();
  for (const relPath of files) {
    const absPath = path.join(ROOT, relPath);
    let text;
    try {
      text = extractText(absPath);
    } catch (e) {
      console.warn(`[lint-urls][WARN] ${relPath}: 読み込みエラー - ${e.message}`);
      continue;
    }

    for (const url of extractUrls(text)) {
      if (!urlToFiles.has(url)) urlToFiles.set(url, []);
      urlToFiles.get(url).push(relPath);
    }
  }

  const allUrls = [...urlToFiles.keys()];
  console.log(`[lint-urls] 対象ファイル: ${files.length}件, ユニークURL: ${allUrls.length}件`);

  if (allUrls.length === 0) {
    console.log("[lint-urls] ✓ チェック対象URLなし");
    process.exit(0);
  }

  // 並列チェック
  const tasks = allUrls.map((url) => () => checkUrl(url));
  const results = await runWithConcurrency(tasks, CONCURRENCY);

  const checkedAt = new Date().toISOString();
  const output = {
    checkedAt,
    totalUrls: allUrls.length,
    brokenCount: 0,
    results: [],
  };

  let brokenCount = 0;
  for (const result of results) {
    const files = urlToFiles.get(result.url) ?? [];
    const entry = { ...result, foundIn: files };
    output.results.push(entry);

    if (!result.ok) {
      brokenCount++;
      console.warn(`[lint-urls][WARN] ${result.status} ${result.url}`);
      if (result.error) console.warn(`         → ${result.error}`);
      for (const f of files) console.warn(`         参照元: ${f}`);
    }
  }

  output.brokenCount = brokenCount;

  // 結果保存
  const logsDir = path.join(ROOT, "logs");
  if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });
  const outPath = path.join(logsDir, "url-check-results.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`[lint-urls] 結果を保存: logs/url-check-results.json`);

  const okCount = allUrls.length - brokenCount;
  console.log(`[lint-urls] OK: ${okCount}件, 警告: ${brokenCount}件`);

  // URL404はwarning扱い → exit 0
  process.exit(0);
}

main().catch((e) => {
  console.error("[lint-urls] 予期しないエラー:", e);
  process.exit(1);
});
