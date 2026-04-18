#!/usr/bin/env node
/**
 * deaths JSONL (5 年 × 800 件 ≒ 4,043 行) を UI から直接 import できる
 * 軽量 JSON に圧縮する。
 *
 *   $ node scripts/etl/build-deaths-compact.mjs
 *
 * 出力: web/src/data/deaths-mhlw/compact.json
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const SRC_DIR = join(REPO_ROOT, "web", "src", "data", "deaths-mhlw");
const DST = join(SRC_DIR, "compact.json");

async function main() {
  const files = (await readdir(SRC_DIR))
    .filter((f) => /^records-\d{4}\.jsonl$/.test(f))
    .sort();
  const entries = [];
  for (const f of files) {
    const raw = await readFile(join(SRC_DIR, f), "utf8");
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      let row;
      try {
        row = JSON.parse(line);
      } catch {
        continue;
      }
      entries.push({
        id: row.id,
        year: row.year,
        month: row.month,
        description: row.description,
        industry: row.industry?.majorName ?? null,
        industryMedium: row.industry?.mediumName ?? null,
        cause: row.cause?.majorName ?? null,
        type: row.accidentType?.name ?? null,
        workplaceSize: row.workplaceSize ?? null,
        occurrenceTime: row.occurrenceTime ?? null,
      });
    }
  }
  entries.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return (b.month ?? 0) - (a.month ?? 0);
  });
  const byYear = {};
  const byType = {};
  const byIndustry = {};
  for (const e of entries) {
    byYear[e.year] = (byYear[e.year] ?? 0) + 1;
    if (e.type) byType[e.type] = (byType[e.type] ?? 0) + 1;
    if (e.industry) byIndustry[e.industry] = (byIndustry[e.industry] ?? 0) + 1;
  }
  const output = {
    generatedAt: new Date().toISOString(),
    total: entries.length,
    years: Object.keys(byYear).map(Number).sort(),
    byYear,
    byType,
    byIndustry,
    entries,
  };
  await writeFile(DST, JSON.stringify(output) + "\n");
  console.error(`[build-deaths-compact] files=${files.length} total=${entries.length}`);
  console.error(`  years: ${JSON.stringify(byYear)}`);
  console.error(`  wrote: ${DST}`);
}

main().catch((err) => {
  console.error("[build-deaths-compact] error:", err);
  process.exitCode = 1;
});
