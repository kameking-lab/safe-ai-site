#!/usr/bin/env node
/**
 * Phase 4: 通達・リーフレットの URL ヘルスチェック（月次バッチ想定）
 *
 * 設計参照: docs/chatbot-quality-research-2026-05-23/06-notice-attachment-design.md §6
 *
 * 全 mhlw-notices.ts の detailUrl と mhlw-leaflets.ts の sourceUrl/pdfUrl に
 * HEAD リクエストを投げ、404/410/5xx を検出。結果を Markdown で出力する。
 *
 * 実行:
 *   node scripts/etl/notice-url-health-check.mjs [--out docs/notice-url-failures-YYYY-MM-DD.md]
 *   node scripts/etl/notice-url-health-check.mjs --sample 50  # サンプル50件のみ（開発時）
 *
 * Vercel Cron 統合（vercel.json）想定:
 *   { "path": "/api/cron/notice-url-health", "schedule": "0 18 1 * *" }
 *   （月初1日 03:00 JST = UTC 18:00 前日）
 *
 * 著作権/レート制限の配慮:
 *   - HEAD のみ、本文ダウンロードしない
 *   - 50 件ごとに 500ms 待機（厚労省サイトへの負荷配慮）
 *   - User-Agent に「+url=本サイト」を明示
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..", "..");

// CLI 引数
const argv = process.argv.slice(2);
const sampleArgIdx = argv.indexOf("--sample");
const sampleSize = sampleArgIdx >= 0 ? Number(argv[sampleArgIdx + 1]) : null;
const outArgIdx = argv.indexOf("--out");
const outPathArg = outArgIdx >= 0 ? argv[outArgIdx + 1] : null;

const today = new Date().toISOString().slice(0, 10);
const outPath = outPathArg
  ? resolve(repoRoot, outPathArg)
  : resolve(repoRoot, "docs", `notice-url-health-${today}.md`);

const USER_AGENT =
  "safe-ai-portal-url-health (+https://www.anzen-ai-portal.jp/about)";
const TIMEOUT_MS = 8000;
const BATCH_PAUSE_MS = 500;
const BATCH_SIZE = 50;

/**
 * jsonl 風の TS データから (id, url-fields) を抽出する。
 * 正規表現で必要フィールドだけ拾う（tsx パース無しで軽量に）。
 */
function extractRecords(tsFilePath, fields) {
  const txt = readFileSync(tsFilePath, "utf8");
  const out = [];
  // 各 { ... } ブロックを乱暴に抽出（mhlw-notices/leaflets は1レコード1ブロック）
  const objRe = /\{\s*"id":\s*"([^"]+)"[\s\S]*?\}/g;
  let m;
  while ((m = objRe.exec(txt))) {
    const block = m[0];
    const id = m[1];
    const rec = { id };
    for (const f of fields) {
      const fr = new RegExp(`"${f}":\\s*("[^"]+"|null)`);
      const mm = block.match(fr);
      rec[f] = mm && mm[1] !== "null" ? mm[1].replace(/^"|"$/g, "") : null;
    }
    out.push(rec);
  }
  return out;
}

async function checkUrl(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": USER_AGENT },
    });
    return { ok: res.ok || (res.status >= 200 && res.status < 400), status: res.status };
  } catch (err) {
    return { ok: false, status: -1, err: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const notices = extractRecords(
    resolve(repoRoot, "web/src/data/mhlw-notices.ts"),
    ["title", "detailUrl", "pdfUrl"]
  );
  const leaflets = extractRecords(
    resolve(repoRoot, "web/src/data/mhlw-leaflets.ts"),
    ["title", "sourceUrl", "pdfUrl"]
  );

  let targets = [];
  for (const n of notices) {
    if (n.detailUrl) targets.push({ kind: "notice", id: n.id, title: n.title, url: n.detailUrl, field: "detailUrl" });
    if (n.pdfUrl) targets.push({ kind: "notice", id: n.id, title: n.title, url: n.pdfUrl, field: "pdfUrl" });
  }
  for (const l of leaflets) {
    if (l.sourceUrl) targets.push({ kind: "leaflet", id: l.id, title: l.title, url: l.sourceUrl, field: "sourceUrl" });
    if (l.pdfUrl) targets.push({ kind: "leaflet", id: l.id, title: l.title, url: l.pdfUrl, field: "pdfUrl" });
  }

  if (sampleSize !== null && Number.isFinite(sampleSize) && sampleSize > 0) {
    targets = targets.slice(0, sampleSize);
    console.log(`[notice-url-health] サンプル ${sampleSize} 件のみチェック`);
  }

  console.log(`[notice-url-health] 対象 ${targets.length} URLs（通達 ${notices.length}件 + リーフレット ${leaflets.length}件）`);

  const failures = [];
  let okCount = 0;
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const r = await checkUrl(t.url);
    if (r.ok) {
      okCount++;
    } else {
      failures.push({ ...t, status: r.status, err: r.err });
    }
    if ((i + 1) % 25 === 0) {
      process.stdout.write(`  [${i + 1}/${targets.length}] OK ${okCount} / NG ${failures.length}\r`);
    }
    if ((i + 1) % BATCH_SIZE === 0) await sleep(BATCH_PAUSE_MS);
  }
  console.log(`\n[notice-url-health] 完了: OK ${okCount} / NG ${failures.length}`);

  // 結果を Markdown で出力
  mkdirSync(dirname(outPath), { recursive: true });
  const lines = [];
  lines.push(`# 通達・リーフレット URL ヘルスチェック結果 (${today})`);
  lines.push("");
  lines.push(`- 対象 URL: ${targets.length} 件`);
  lines.push(`- OK: ${okCount} 件`);
  lines.push(`- NG: ${failures.length} 件`);
  lines.push(`- 成功率: ${((okCount / targets.length) * 100).toFixed(2)}%`);
  lines.push("");
  if (failures.length === 0) {
    lines.push("✅ 失敗 URL なし。");
  } else {
    lines.push("## 失敗 URL 一覧");
    lines.push("");
    lines.push("| kind | id | field | status | title | url |");
    lines.push("|---|---|---|---|---|---|");
    for (const f of failures) {
      const safeTitle = (f.title ?? "").replace(/\|/g, "\\|").slice(0, 60);
      const safeUrl = f.url.replace(/\|/g, "%7C");
      const status = f.err ? `ERR(${f.status})` : String(f.status);
      lines.push(`| ${f.kind} | ${f.id} | ${f.field} | ${status} | ${safeTitle} | ${safeUrl} |`);
    }
  }
  writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
  console.log(`[notice-url-health] レポート: ${outPath}`);

  // 失敗があれば exit code 2（CI で監視可能）
  if (failures.length > 0) process.exit(2);
}

main().catch((err) => {
  console.error("[notice-url-health] 致命的エラー:", err);
  process.exit(1);
});
