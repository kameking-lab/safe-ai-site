#!/usr/bin/env node
/**
 * Phase 4: 通達・リーフレット・MLIT 資源の URL 健全性チェック
 *
 *   $ node scripts/etl/notice-url-health-check.mjs [--limit 50] [--write-report]
 *
 * - mhlw-notices.ts / mhlw-leaflets.ts / mlit-resources.ts 全 URL に HEAD リクエスト
 * - 200 / 3xx 以外を「失敗 URL」として記録
 * - 失敗 URL は docs/notice-url-failures-YYYY-MM-DD.md に書き出し
 * - Vercel Cron から月次実行を想定 (vercel.json 参照)
 *
 * 注意: 大量 URL があるため、デフォルトでは --limit 100 で打ち切り。
 *       本格運用時はサンプリング or バッチ分割を推奨。
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");

const args = process.argv.slice(2);
const limitArg = args.indexOf("--limit");
const LIMIT = limitArg >= 0 ? Number(args[limitArg + 1]) || 100 : 100;
const WRITE_REPORT = args.includes("--write-report");

const TIMEOUT_MS = 8000;

/** 簡易 import の代わりに TS ファイルを正規表現で URL 抽出 (Node のみで完結) */
async function extractUrls(filePath, fields) {
  const text = await readFile(filePath, "utf-8");
  const urls = [];
  for (const f of fields) {
    const re = new RegExp(`"${f}"\\s*:\\s*"(https?://[^"]+)"`, "g");
    let m;
    while ((m = re.exec(text)) !== null) {
      urls.push({ field: f, url: m[1] });
    }
  }
  return urls;
}

async function checkUrl(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(t);
    return { ok: res.ok || (res.status >= 300 && res.status < 400), status: res.status };
  } catch (err) {
    clearTimeout(t);
    return { ok: false, status: 0, error: String(err?.message ?? err) };
  }
}

async function main() {
  console.log(`[notice-url-health-check] limit=${LIMIT}, writeReport=${WRITE_REPORT}`);

  const sources = [
    {
      label: "mhlw-notices",
      file: join(REPO_ROOT, "web", "src", "data", "mhlw-notices.ts"),
      fields: ["detailUrl", "pdfUrl", "sourceUrl"],
    },
    {
      label: "mhlw-leaflets",
      file: join(REPO_ROOT, "web", "src", "data", "mhlw-leaflets.ts"),
      fields: ["detailUrl", "pdfUrl", "sourceUrl"],
    },
    {
      label: "mlit-resources",
      file: join(REPO_ROOT, "web", "src", "data", "mlit-resources.ts"),
      fields: ["sourceUrl", "pdfUrl"],
    },
  ];

  const failures = [];
  let totalChecked = 0;

  for (const s of sources) {
    const all = await extractUrls(s.file, s.fields);
    // 重複 URL は 1 度だけチェック
    const seen = new Set();
    const unique = all.filter((u) => {
      if (seen.has(u.url)) return false;
      seen.add(u.url);
      return true;
    });
    const sampled = unique.slice(0, LIMIT);
    console.log(`[${s.label}] total URLs: ${all.length} / unique: ${unique.length} / sampled: ${sampled.length}`);
    for (const u of sampled) {
      const res = await checkUrl(u.url);
      totalChecked++;
      if (!res.ok) {
        failures.push({
          source: s.label,
          field: u.field,
          url: u.url,
          status: res.status,
          error: res.error,
        });
        process.stdout.write("x");
      } else {
        process.stdout.write(".");
      }
    }
    process.stdout.write("\n");
  }

  console.log(
    `[notice-url-health-check] checked=${totalChecked} failures=${failures.length} (${((failures.length / Math.max(totalChecked, 1)) * 100).toFixed(1)}%)`,
  );

  if (WRITE_REPORT && failures.length > 0) {
    const today = new Date().toISOString().slice(0, 10);
    const reportPath = join(REPO_ROOT, "docs", `notice-url-failures-${today}.md`);
    const lines = [
      `# 通達・リーフレット URL ヘルスチェック失敗ログ`,
      ``,
      `- 実行日: ${today}`,
      `- 検査対象URL数: ${totalChecked} (limit=${LIMIT} per source)`,
      `- 失敗URL数: ${failures.length}`,
      ``,
      `## 失敗内訳`,
      ``,
      `| source | field | status | url |`,
      `|---|---|---|---|`,
      ...failures.map(
        (f) => `| ${f.source} | ${f.field} | ${f.status} | ${f.url} |`,
      ),
    ];
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, lines.join("\n") + "\n", "utf-8");
    console.log(`[notice-url-health-check] report → ${reportPath}`);
  }

  // 失敗率が 30% を超える場合は exit 1 (CI 失敗扱い)
  const failureRate = failures.length / Math.max(totalChecked, 1);
  if (failureRate > 0.3) {
    console.error(`[notice-url-health-check] 失敗率 ${(failureRate * 100).toFixed(1)}% > 30%、要調査`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
