#!/usr/bin/env node
/**
 * 記事の時限公開スケジューラ
 *
 * 既存の web/src/data/articles/*.json に対して
 * publishedAt を日次10〜15本ペースで未来日付に書き換える。
 *
 * 使い方:
 *   node scripts/schedule-articles.mjs                 # デフォルト 12本/日
 *   node scripts/schedule-articles.mjs --per-day=10    # 10本/日
 *   node scripts/schedule-articles.mjs --start=2026-05-01
 *
 * 設計:
 * - 公開済み（publishedAt <= 今日）の記事はスキップ。
 * - 未スケジュール（publishedAt が将来日でない）の記事だけを対象に
 *   --start 日から1日 perDay 本ずつ割り当てる。
 * - 既存の未来日付スケジュールは尊重して衝突しないよう詰め直し。
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "..", "src", "data", "articles");

function arg(name, def) {
  const m = process.argv.find((a) => a.startsWith(`--${name}=`));
  return m ? m.split("=")[1] : def;
}

const PER_DAY = Number(arg("per-day", "12"));
const START = arg("start", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10));

if (PER_DAY < 10 || PER_DAY > 15) {
  console.warn(`警告: 推奨範囲は 10〜15本/日 です（指定: ${PER_DAY}）`);
}

const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
const now = new Date().toISOString().slice(0, 10);

const articles = files.map((f) => ({
  file: f,
  data: JSON.parse(readFileSync(resolve(DATA_DIR, f), "utf-8")),
}));

const unscheduled = articles.filter((a) => a.data.publishedAt <= now);

if (unscheduled.length === 0) {
  console.log("スケジュール対象なし。すべて公開済みです。");
  process.exit(0);
}

let dateCursor = new Date(START);
let countOnDate = 0;

for (const a of unscheduled) {
  if (countOnDate >= PER_DAY) {
    dateCursor = new Date(dateCursor.getTime() + 24 * 60 * 60 * 1000);
    countOnDate = 0;
  }
  const yyyymmdd = dateCursor.toISOString().slice(0, 10);
  a.data.publishedAt = yyyymmdd;
  writeFileSync(resolve(DATA_DIR, a.file), JSON.stringify(a.data, null, 2), "utf-8");
  countOnDate++;
  console.log(`SCHEDULED ${a.data.slug} → ${yyyymmdd}`);
}

console.log(`\n完了: ${unscheduled.length}本を ${PER_DAY}本/日ペースでスケジュール`);
