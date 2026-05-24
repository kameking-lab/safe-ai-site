#!/usr/bin/env node
/**
 * 化審法 (CSCL) + 毒劇法 + 化学兵器禁止法 (CWC) + 廃棄物処理法 分類統合スクリプト
 *
 *   $ node scripts/chemical-data-import/chashin-importer.mjs
 *
 * 入力 : web/src/data/chemicals-chashin/regulatory.jsonl
 *        (parse-regulatory-laws.py が GitHub ミラー Ameyanagi/ra-law-db 経由で生成)
 * 出力 : web/src/data/concentration-limits.json (マージ書き戻し)
 *
 * Phase 1d (2026-05-24): スケルトン → 実装完了。
 * 元データは e-Gov 法令 API 経由の政府公開法令 (経産省/環境省/厚労省 所管)。
 *
 * 取り込み対象 (regulationType / regulationTags):
 *   - cscl (化審法) → "cscl1" (第一種特定) / "cscl2" (第二種特定) / "cscl-other"
 *   - poison_control (毒劇法) → "poison-control"
 *   - cwc (化学兵器禁止法) → "cwc"
 *   - waste (廃掃法 特定有害産業廃棄物) → "waste"
 *
 * 注意: 化審法の「優先評価化学物質」(約1,100物質) は経産省の別ファイル配布で、
 *       本ミラーには含まれない。Phase 1e 以降で別データソースから取り込み予定。
 *
 * マージ仕様:
 *   - 既存 CAS あり: regulationTags に該当タグ追加 (数値は触らない)
 *   - 既存 CAS なし: 新規 entry を source="reference" で追加
 *   - chashinLawReferences: 該当する法令別表参照を配列で記録
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { createReadStream } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const TARGET_JSON = join(REPO_ROOT, "web", "src", "data", "concentration-limits.json");
const CHASHIN_JSONL = join(REPO_ROOT, "web", "src", "data", "chemicals-chashin", "regulatory.jsonl");
const CHASHIN_MANIFEST = join(REPO_ROOT, "web", "src", "data", "chemicals-chashin", "manifest.json");

const SOURCE_LABEL = "CHASHIN_DOKUGEKI_CWC_WASTE";
const CAS_PATTERN = /^\d{2,7}-\d{2,3}-\d{1,2}$/;

// cscl の category サブ分類
function cscClassTag(category) {
  if (category === "class_i_specified") return "cscl1";
  if (category === "class_ii_specified") return "cscl2";
  return "cscl-other";
}

function regulationToTag(reg) {
  const t = reg.type;
  if (t === "cscl") return cscClassTag(reg.category);
  if (t === "poison_control") return "poison-control";
  if (t === "cwc") return "cwc";
  if (t === "waste") return "waste";
  return null;
}

async function loadJsonl(path) {
  const items = [];
  const rl = createInterface({ input: createReadStream(path, { encoding: "utf-8" }) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    items.push(JSON.parse(line));
  }
  return items;
}

async function main() {
  if (!existsSync(CHASHIN_JSONL)) {
    console.error(
      `[chashin-importer] 入力 JSONL 不在: ${CHASHIN_JSONL}\n` +
        `  先に python3 scripts/chemical-data-import/parse-regulatory-laws.py を実行してください。`
    );
    process.exit(1);
  }
  if (!existsSync(TARGET_JSON)) {
    console.error(`[chashin-importer] 既存マスタ不在: ${TARGET_JSON}`);
    process.exit(1);
  }

  const entries = await loadJsonl(CHASHIN_JSONL);
  console.log(`[chashin-importer] 入力エントリ (ユニーク CAS): ${entries.length}`);

  let manifestSha = null;
  try {
    const m = JSON.parse(await readFile(CHASHIN_MANIFEST, "utf-8"));
    manifestSha = m.sources?.[0]?.sha256 ?? null;
  } catch {
    // manifest なくても処理継続
  }

  const doc = JSON.parse(await readFile(TARGET_JSON, "utf-8"));
  const beforeTotal = Object.keys(doc.substances).length;

  if (!doc.sources[SOURCE_LABEL]) {
    doc.sources[SOURCE_LABEL] =
      "化審法 (CSCL) / 毒劇法 / 化学兵器禁止法 (CWC) / 廃棄物処理法 政府公開法令データ";
  }

  let merged = 0;
  let added = 0;
  let skippedInvalidCas = 0;
  const tagCounter = {};

  for (const e of entries) {
    const cas = (e.cas ?? "").trim();
    if (!CAS_PATTERN.test(cas)) {
      skippedInvalidCas++;
      continue;
    }
    const regs = e.regulations ?? [];
    const tagSet = new Set();
    const lawRefs = [];
    const officialUrls = new Set();
    for (const r of regs) {
      const tag = regulationToTag(r);
      if (tag) {
        tagSet.add(tag);
        tagCounter[tag] = (tagCounter[tag] ?? 0) + 1;
      }
      if (r.lawReference) lawRefs.push(r.lawReference);
      if (r.officialUrl) officialUrls.add(r.officialUrl);
    }
    if (tagSet.size === 0) continue;

    if (doc.substances[cas]) {
      const ex = doc.substances[cas];
      const tags = new Set(ex.regulationTags ?? []);
      for (const t of tagSet) tags.add(t);
      ex.regulationTags = Array.from(tags).sort();
      if (lawRefs.length > 0) {
        const existing = new Set(ex.chashinLawReferences ?? []);
        for (const r of lawRefs) existing.add(r);
        ex.chashinLawReferences = Array.from(existing).sort();
      }
      merged++;
    } else {
      const entry = {
        name: e.nameJa || `CAS ${cas}`,
        source: "reference",
        regulationTags: Array.from(tagSet).sort(),
      };
      if (lawRefs.length > 0) entry.chashinLawReferences = Array.from(new Set(lawRefs)).sort();
      doc.substances[cas] = entry;
      added++;
    }
  }

  const afterTotal = Object.keys(doc.substances).length;
  const withChashin = Object.values(doc.substances).filter((e) => {
    const tags = e.regulationTags ?? [];
    return tags.some((t) => t.startsWith("cscl") || t === "poison-control" || t === "cwc" || t === "waste");
  }).length;

  doc.summary = {
    ...doc.summary,
    total: afterTotal,
    withChashin,
  };
  doc.generatedAt = new Date().toISOString();
  doc.chashinImport = {
    importedAt: new Date().toISOString(),
    sourceCount: entries.length,
    merged,
    added,
    tagCounts: tagCounter,
    sourceSha256: manifestSha,
    upstreamReference: "e-Gov 法令API 経由 (化審法施行令 / 毒劇法施行令 / 化学兵器禁止法施行令 / 廃掃法施行令)",
    mirror: "github.com/Ameyanagi/ra-law-db",
    knownLimitation:
      "化審法 優先評価化学物質 (約1,100物質) は本ミラーに含まれず別途取り込み必要 (Phase 1e 以降)",
  };

  await writeFile(TARGET_JSON, JSON.stringify(doc, null, 2) + "\n", "utf-8");

  console.log(
    `[chashin-importer] before=${beforeTotal} after=${afterTotal} ` +
      `(merged=${merged} added=${added} skippedInvalidCas=${skippedInvalidCas})`
  );
  console.log(`[chashin-importer] withChashin=${withChashin} tags=`, tagCounter);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
