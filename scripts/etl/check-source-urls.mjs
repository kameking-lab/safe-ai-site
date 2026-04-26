#!/usr/bin/env node
/**
 * URL liveness checker for MHLW notice/leaflet source URLs.
 *
 * Extracts all URLs from the TypeScript data files, sends HEAD requests
 * (with GET fallback), and reports broken links + writes a JSON result.
 *
 * Usage:
 *   node scripts/etl/check-source-urls.mjs
 *   node scripts/etl/check-source-urls.mjs --concurrency 5 --timeout 15000
 *
 * Output: scripts/etl/data/url-check-YYYY-MM-DD.json
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");

const DATA_FILES = [
  join(REPO_ROOT, "web/src/data/mhlw-notices.ts"),
  join(REPO_ROOT, "web/src/data/mhlw-leaflets.ts"),
];

// ── CLI args ──────────────────────────────────────────────────────
const args = process.argv.slice(2);
const CONCURRENCY = parseInt(args[args.indexOf("--concurrency") + 1] || "10");
const TIMEOUT_MS = parseInt(args[args.indexOf("--timeout") + 1] || "12000");

// ── URL extraction ────────────────────────────────────────────────
/** Extract deduplicated http(s) URLs from a TypeScript source file. */
async function extractUrls(filePath) {
  const text = await readFile(filePath, "utf8");
  // Match quoted URL values assigned to known URL fields
  const pattern = /(?:sourceUrl|detailUrl|pdfUrl|url)\s*:\s*"(https?:\/\/[^"]+)"/g;
  const urls = new Set();
  let m;
  while ((m = pattern.exec(text)) !== null) {
    urls.add(m[1]);
  }
  return [...urls];
}

// ── HTTP check ────────────────────────────────────────────────────
async function checkUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "ANZEN-AI-SourceCheck/1.0 (+https://anzen-ai.jp)" },
    });
    // Some servers block HEAD — retry with GET if 405
    if (res.status === 405) {
      clearTimeout(timer);
      const ctrl2 = new AbortController();
      const t2 = setTimeout(() => ctrl2.abort(), TIMEOUT_MS);
      try {
        const res2 = await fetch(url, {
          method: "GET",
          signal: ctrl2.signal,
          redirect: "follow",
          headers: { "User-Agent": "ANZEN-AI-SourceCheck/1.0" },
        });
        return { url, status: res2.status, ok: res2.ok, method: "GET", error: null };
      } finally {
        clearTimeout(t2);
      }
    }
    return { url, status: res.status, ok: res.ok, method: "HEAD", error: null };
  } catch (err) {
    const isTimeout = err.name === "AbortError";
    return {
      url,
      status: null,
      ok: false,
      method: "HEAD",
      error: isTimeout ? "timeout" : err.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

// ── Batch runner ──────────────────────────────────────────────────
async function runBatched(urls, concurrency) {
  const results = [];
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(checkUrl));
    results.push(...batchResults);
    const done = Math.min(i + concurrency, urls.length);
    const broken = results.filter((r) => !r.ok).length;
    process.stdout.write(`\r  [${done}/${urls.length}]  broken: ${broken}   `);
  }
  process.stdout.write("\n");
  return results;
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  console.log("=== ANZEN AI — Source URL Liveness Check ===\n");
  console.log(`Settings: concurrency=${CONCURRENCY}  timeout=${TIMEOUT_MS}ms\n`);

  // Collect URLs
  const allUrls = new Set();
  for (const f of DATA_FILES) {
    if (!existsSync(f)) {
      console.warn(`  [skip] File not found: ${f}`);
      continue;
    }
    const urls = await extractUrls(f);
    console.log(`  ${basename(f)}: ${urls.length} unique URLs extracted`);
    urls.forEach((u) => allUrls.add(u));
  }

  const urls = [...allUrls];
  console.log(`\nTotal unique URLs to check: ${urls.length}\n`);

  if (urls.length === 0) {
    console.log("Nothing to check.");
    return;
  }

  // Check
  const results = await runBatched(urls, CONCURRENCY);

  // Summary
  const ok = results.filter((r) => r.ok);
  const broken = results.filter((r) => !r.ok);
  const byStatus = {};
  for (const r of broken) {
    const key = r.error ?? String(r.status ?? "unknown");
    byStatus[key] = (byStatus[key] ?? 0) + 1;
  }

  console.log(`\n✅  OK:     ${ok.length}`);
  console.log(`❌  Broken: ${broken.length}`);

  if (broken.length > 0) {
    console.log("\nBroken breakdown:");
    for (const [k, v] of Object.entries(byStatus)) {
      console.log(`  ${k}: ${v}`);
    }
    console.log("\nBroken URLs:");
    for (const r of broken) {
      const tag = r.error ?? r.status;
      console.log(`  [${tag}] ${r.url}`);
    }
  }

  // Write output
  const outDir = join(__dirname, "data");
  if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const outPath = join(outDir, `url-check-${date}.json`);
  await writeFile(
    outPath,
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        total: results.length,
        ok: ok.length,
        broken: broken.length,
        results,
      },
      null,
      2
    )
  );
  console.log(`\nFull results → ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
