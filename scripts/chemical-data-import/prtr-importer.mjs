#!/usr/bin/env node
/**
 * PRTR (化管法 / 化学物質排出移動量届出制度) 対象物質統合スクリプト
 *
 *   $ node scripts/chemical-data-import/prtr-importer.mjs
 *
 * 入力 : web/src/data/chemicals-prtr/regulatory.jsonl
 *        (parse-regulatory-laws.py が GitHub ミラー Ameyanagi/ra-law-db 経由で生成)
 * 出力 : web/src/data/concentration-limits.json (マージ書き戻し)
 *
 * Phase 1c (2026-05-24): スケルトン → 実装完了。
 * 元データの一次ソースは e-Gov 法令API 経由の政府公開法令 (環境省 化管法施行令)。
 * 本セッション環境では env.go.jp 直接アクセス不可のため GitHub ミラー経由で取得。
 *
 * マージ仕様:
 *   - 既存 CAS あり: regulationTags に "prtr1" / "prtr2" 追加 (数値は触らない)
 *   - 既存 CAS なし: 新規 entry を source="reference" で追加
 *   - prtrLawReferences: 該当する法令別表参照を配列で記録
 *
 * 検証手順:
 *   1. node scripts/chemical-data-import/prtr-importer.mjs
 *   2. node scripts/etl/strip-society-values.mjs (学会数値の再混入を担保)
 *   3. cd web && npm run lint && npm run test
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
const PRTR_JSONL = join(REPO_ROOT, "web", "src", "data", "chemicals-prtr", "regulatory.jsonl");
const PRTR_MANIFEST = join(REPO_ROOT, "web", "src", "data", "chemicals-prtr", "manifest.json");

const SOURCE_LABEL = "PRTR_KAKAN";
const CAS_PATTERN = /^\d{2,7}-\d{2,3}-\d{1,2}$/;

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
  if (!existsSync(PRTR_JSONL)) {
    console.error(
      `[prtr-importer] 入力 JSONL 不在: ${PRTR_JSONL}\n` +
        `  先に python3 scripts/chemical-data-import/parse-regulatory-laws.py を実行してください。`
    );
    process.exit(1);
  }
  if (!existsSync(TARGET_JSON)) {
    console.error(`[prtr-importer] 既存マスタ不在: ${TARGET_JSON}`);
    process.exit(1);
  }

  const prtrEntries = await loadJsonl(PRTR_JSONL);
  console.log(`[prtr-importer] PRTR エントリ (ユニーク CAS): ${prtrEntries.length}`);

  let manifestSha = null;
  try {
    const m = JSON.parse(await readFile(PRTR_MANIFEST, "utf-8"));
    manifestSha = m.sources?.[0]?.sha256 ?? null;
  } catch {
    // manifest なくても処理継続
  }

  const doc = JSON.parse(await readFile(TARGET_JSON, "utf-8"));
  const beforeTotal = Object.keys(doc.substances).length;

  if (!doc.sources[SOURCE_LABEL]) {
    doc.sources[SOURCE_LABEL] =
      "化管法 PRTR 第一種/第二種指定化学物質 (環境省 化管法施行令 別表): " +
      "https://www.env.go.jp/chemi/prtr/risk0.html";
  }

  let merged = 0;
  let added = 0;
  let skippedInvalidCas = 0;
  let class1 = 0;
  let class2 = 0;

  for (const e of prtrEntries) {
    const cas = (e.cas ?? "").trim();
    if (!CAS_PATTERN.test(cas)) {
      skippedInvalidCas++;
      continue;
    }
    const regs = e.regulations ?? [];
    const tagSet = new Set();
    const lawRefs = [];
    for (const r of regs) {
      if (r.type === "prtr1") {
        tagSet.add("prtr1");
        class1++;
      }
      if (r.type === "prtr2") {
        tagSet.add("prtr2");
        class2++;
      }
      if (r.lawReference) lawRefs.push(r.lawReference);
    }
    if (tagSet.size === 0) continue;

    const officialUrl =
      regs.find((r) => r.officialUrl)?.officialUrl ??
      "https://www.env.go.jp/chemi/prtr/risk0.html";

    if (doc.substances[cas]) {
      const ex = doc.substances[cas];
      const tags = new Set(ex.regulationTags ?? []);
      for (const t of tagSet) tags.add(t);
      ex.regulationTags = Array.from(tags).sort();
      if (!ex.prtrUrl) ex.prtrUrl = officialUrl;
      if (lawRefs.length > 0) {
        const existing = new Set(ex.prtrLawReferences ?? []);
        for (const r of lawRefs) existing.add(r);
        ex.prtrLawReferences = Array.from(existing).sort();
      }
      merged++;
    } else {
      const entry = {
        name: e.nameJa || `CAS ${cas}`,
        source: "reference",
        regulationTags: Array.from(tagSet).sort(),
        prtrUrl: officialUrl,
      };
      if (lawRefs.length > 0) entry.prtrLawReferences = Array.from(new Set(lawRefs)).sort();
      doc.substances[cas] = entry;
      added++;
    }
  }

  const afterTotal = Object.keys(doc.substances).length;
  const withPrtr = Object.values(doc.substances).filter((e) => {
    const tags = e.regulationTags ?? [];
    return tags.includes("prtr1") || tags.includes("prtr2");
  }).length;

  doc.summary = {
    ...doc.summary,
    total: afterTotal,
    withPrtr,
  };
  doc.generatedAt = new Date().toISOString();
  doc.prtrImport = {
    importedAt: new Date().toISOString(),
    sourceCount: prtrEntries.length,
    merged,
    added,
    class1Tagged: class1,
    class2Tagged: class2,
    sourceSha256: manifestSha,
    upstreamReference: "化管法施行令 別表 (e-Gov api.elaws.e-gov.go.jp 由来)",
    mirror: "github.com/Ameyanagi/ra-law-db",
  };

  await writeFile(TARGET_JSON, JSON.stringify(doc, null, 2) + "\n", "utf-8");

  console.log(
    `[prtr-importer] before=${beforeTotal} after=${afterTotal} ` +
      `(merged=${merged} added=${added} skippedInvalidCas=${skippedInvalidCas})`
  );
  console.log(`[prtr-importer] withPrtr=${withPrtr} class1=${class1} class2=${class2}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
