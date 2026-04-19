#!/usr/bin/env node
/**
 * MHLW 事故データ JSONL を Vercel Blob へ年別シャードとしてアップロードする。
 *
 *   $ cd web && npm install
 *   $ BLOB_READ_WRITE_TOKEN=... node ../scripts/etl/upload-to-blob.mjs
 *
 * 入力:  web/src/data/accidents-mhlw/{YYYY}-{MM}.jsonl  (192 本, 合計 ~403MB)
 * 出力:  Vercel Blob 上の mhlw-accidents/{YYYY}.jsonl    (16 本, 各 ~25MB)
 *
 * 冪等: 既存キーは allowOverwrite=true で上書きする。
 *       `--only 2021` で特定年だけアップロード可。
 *       `--dry-run` で件数と推定サイズだけ表示。
 */

import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// web/scripts/etl/ → 3 levels up = repo root
const REPO_ROOT = join(__dirname, "..", "..", "..");
const SOURCE_DIR = join(REPO_ROOT, "web", "src", "data", "accidents-mhlw");
const BLOB_PREFIX = "mhlw-accidents";
const MANIFEST_PATH = join(REPO_ROOT, "web", "src", "data", "aggregates-mhlw", "blob-manifest.json");

function parseArgs(argv) {
  const args = { only: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--only") args.only = argv[++i];
  }
  return args;
}

function log(...parts) {
  console.error("[upload-to-blob]", ...parts);
}

async function collectYearShards() {
  if (!existsSync(SOURCE_DIR)) {
    throw new Error(
      `SOURCE_DIR not found: ${SOURCE_DIR}\n` +
        `Run scripts/etl/parse-shisho-db.py first to regenerate the raw JSONL files.`
    );
  }
  const files = (await readdir(SOURCE_DIR))
    .filter((f) => /^\d{4}-\d{2}\.jsonl$/.test(f))
    .sort();
  const byYear = new Map();
  for (const f of files) {
    const year = f.slice(0, 4);
    const arr = byYear.get(year) ?? [];
    arr.push(join(SOURCE_DIR, f));
    byYear.set(year, arr);
  }
  return byYear;
}

async function concatJsonl(paths) {
  const chunks = [];
  let totalLines = 0;
  for (const p of paths) {
    const raw = await readFile(p, "utf8");
    const trimmed = raw.endsWith("\n") ? raw : raw + "\n";
    totalLines += trimmed.length === 0 ? 0 : (trimmed.match(/\n/g)?.length ?? 0);
    chunks.push(trimmed);
  }
  return { body: chunks.join(""), lines: totalLines };
}

async function uploadYear(put, year, paths, dryRun) {
  const key = `${BLOB_PREFIX}/${year}.jsonl`;
  const { body, lines } = await concatJsonl(paths);
  const bytes = Buffer.byteLength(body, "utf8");
  log(`  ${year}: ${paths.length} files → ${lines.toLocaleString()} rows, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
  if (dryRun) return { year, key, lines, bytes, url: null };
  const res = await put(key, body, {
    access: "private",
    contentType: "application/x-ndjson",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60 * 60 * 24 * 30,
  });
  return { year, key, lines, bytes, url: res.url };
}

async function main() {
  const args = parseArgs(process.argv);
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!args.dryRun && !token) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN env var is required. " +
        "Enable Vercel Blob on the project and export the token, or run with --dry-run."
    );
  }
  const { put } = args.dryRun
    ? { put: async () => ({ url: "(dry-run)" }) }
    : await import("@vercel/blob");

  const shards = await collectYearShards();
  if (shards.size === 0) {
    log("no year shards to upload. did you run parse-shisho-db.py?");
    return;
  }
  log(`found ${shards.size} years (${[...shards.keys()].join(", ")})`);

  const entries = [];
  for (const [year, paths] of [...shards.entries()].sort()) {
    if (args.only && args.only !== year) continue;
    const entry = await uploadYear(put, year, paths, args.dryRun);
    entries.push(entry);
  }

  if (!args.dryRun) {
    await mkdir(dirname(MANIFEST_PATH), { recursive: true });
    const manifest = {
      generatedAt: new Date().toISOString(),
      prefix: BLOB_PREFIX,
      entries: entries.map(({ year, key, lines, bytes, url }) => ({ year, key, lines, bytes, url })),
    };
    await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
    log(`wrote manifest: ${MANIFEST_PATH}`);
  }

  log(`done. uploaded ${entries.length} shard(s).`);
  const totalBytes = entries.reduce((sum, e) => sum + e.bytes, 0);
  const totalLines = entries.reduce((sum, e) => sum + e.lines, 0);
  log(
    `total: ${totalLines.toLocaleString()} rows, ${(totalBytes / 1024 / 1024).toFixed(1)} MB`
  );
  if (!existsSync(SOURCE_DIR)) {
    // keep TS happy about unused import
    statSync(SOURCE_DIR);
  }
}

main().catch((err) => {
  log("error:", err?.message ?? err);
  process.exitCode = 1;
});
