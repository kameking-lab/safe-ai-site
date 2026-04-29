#!/usr/bin/env node
/**
 * 通達タイトル重複修正スクリプト
 * circularsカテゴリの重複titleを「通達名 - 通達番号 - 施行日」形式に変更して一意化
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEO_DIR = join(__dirname, '../web/src/data/seo-articles');

// summaryから通達番号と施行日を抽出
// パターン1: （基発0318第1号・2026-03-18）
// パターン2: （地発0401第5号 / 基発0401第73号・2016-04-01）  複合番号
// パターン3: （番号未確認・発出日未確認）
function extractCircularInfo(summary) {
  // 複合番号パターン: 最初の番号を使う
  const multiMatch = summary.match(/（([^・）/\s]+)\s*\/\s*[^・）]+・(\d{4}-\d{2}-\d{2})）/);
  if (multiMatch) {
    return { number: multiMatch[1].trim(), date: multiMatch[2] };
  }
  // 通常パターン
  const match = summary.match(/（([^・）\s/]+?)・(\d{4}-\d{2}-\d{2})）/);
  if (match) {
    return { number: match[1], date: match[2] };
  }
  return null;
}

// 全JSONLファイルを読み込んで重複タイトルを検出
const files = readdirSync(SEO_DIR).filter(f => f.endsWith('.jsonl')).sort();

/** @type {Map<string, {file: string, lineIdx: number, obj: object}[]>} */
const titleMap = new Map();

const allRecords = [];

for (const file of files) {
  const filePath = join(SEO_DIR, file);
  const lines = readFileSync(filePath, 'utf8').trim().split('\n');
  const records = [];

  for (let i = 0; i < lines.length; i++) {
    const obj = JSON.parse(lines[i]);
    records.push({ file, filePath, lineIdx: i, obj });

    if (obj.category === 'circulars') {
      if (!titleMap.has(obj.title)) {
        titleMap.set(obj.title, []);
      }
      titleMap.get(obj.title).push({ file, lineIdx: i, obj });
    }
  }

  allRecords.push({ file, filePath, records });
}

// 重複タイトルのみ抽出
const duplicateTitles = new Map();
for (const [title, entries] of titleMap) {
  if (entries.length > 1) {
    duplicateTitles.set(title, entries);
  }
}

console.log(`\n=== 通達タイトル重複修正スクリプト ===`);
console.log(`検出した重複タイトル種類: ${duplicateTitles.size}`);
console.log(`影響レコード数: ${[...duplicateTitles.values()].reduce((s, e) => s + e.length, 0)}`);

// 修正: 重複しているレコードのtitleとsummaryを更新
let fixedCount = 0;
let failedCount = 0;

// ファイルごとの更新マップ
/** @type {Map<string, Map<number, object>>} */
const fileUpdates = new Map();

for (const [title, entries] of duplicateTitles) {
  // まず通達番号+日付で一意化できるか確認
  const infoList = entries.map(e => extractCircularInfo(e.obj.summary));
  const resolvedTitles = new Set();

  for (let i = 0; i < entries.length; i++) {
    const { file, lineIdx, obj } = entries[i];
    const info = infoList[i];

    let newTitle;
    if (info) {
      const candidate = `${title} - ${info.number} - ${info.date}`;
      if (!resolvedTitles.has(candidate)) {
        // 通達番号+日付で一意化できた
        newTitle = candidate;
      } else {
        // 同じ番号+日付が既に使われている → IDサフィックス追加
        newTitle = `${candidate} (${obj.id})`;
      }
    } else {
      // 番号未確認 → IDサフィックスで一意化
      const seqTitle = `${title} (${obj.id})`;
      newTitle = seqTitle;
    }

    resolvedTitles.add(newTitle);

    const newSummary = info && !obj.summary.includes(info.number)
      ? obj.summary.replace('の概要。', `（${info.number}）の概要。`)
      : obj.summary;

    if (!fileUpdates.has(file)) {
      fileUpdates.set(file, new Map());
    }
    fileUpdates.get(file).set(lineIdx, {
      ...obj,
      title: newTitle,
      summary: newSummary,
    });

    fixedCount++;
  }
}

// ファイルを上書き保存
for (const { file, filePath, records } of allRecords) {
  const updates = fileUpdates.get(file);
  if (!updates || updates.size === 0) continue;

  const newLines = records.map(({ lineIdx, obj }) => {
    const updated = updates.get(lineIdx);
    return JSON.stringify(updated ?? obj);
  });

  writeFileSync(filePath, newLines.join('\n') + '\n', 'utf8');
  console.log(`  更新: ${file} (${updates.size}件)`);
}

// 全レコードで最終的なtitle一意性を確認
console.log(`\n=== 結果確認 ===`);
const allTitles = new Set();
let dupAfter = 0;
let totalCirculars = 0;

for (const { filePath } of allRecords) {
  const lines = readFileSync(filePath, 'utf8').trim().split('\n');
  for (const line of lines) {
    const obj = JSON.parse(line);
    if (obj.category === 'circulars') {
      totalCirculars++;
      if (allTitles.has(obj.title)) {
        dupAfter++;
        console.warn(`  [DUP残存] ${obj.title.slice(0, 80)}`);
      }
      allTitles.add(obj.title);
    }
  }
}

console.log(`\n通達記事総数: ${totalCirculars}`);
console.log(`修正件数: ${fixedCount}`);
console.log(`抽出失敗: ${failedCount}`);
console.log(`修正後の重複残存: ${dupAfter}`);
console.log(dupAfter === 0 ? '✓ 全タイトルが一意です' : `⚠ ${dupAfter}件の重複が残っています`);
