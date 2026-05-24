#!/usr/bin/env node
/**
 * NITE-CHRIP (政府版 GHS 分類) 統合スクリプト
 *
 *   $ node scripts/chemical-data-import/nite-chrip-importer.mjs
 *
 * 入力 : web/src/data/chemicals-nite/classifications.jsonl
 *        (parse-nite-chrip.py で生成。元 xlsx は NITE 公式)
 * 出力 : web/src/data/concentration-limits.json (マージ書き戻し)
 *
 * Phase 1b (2026-05-24): 取得経路は GitHub ミラー経由 (Ameyanagi/risk_assessment_list)。
 * 元 URL https://www.chem-info.nite.go.jp/chem/ghs/files/list_nite_all.xlsx は
 * 本セッション環境のネットワーク制約で直接到達不可のため。
 *
 * マージ仕様:
 *   - 既存 CAS あり: regulationTags に "nite" を追加、niteChripUrl / 発がん性 GHS / 主要GHS区分を補完
 *   - 既存 CAS なし: 新規 entry を source="reference" + regulationTags=["nite"] で追加
 *   - 数値 (TWA/STEL/Ceiling) はMHLW優先のため NITE で上書きしない
 *
 * 検証手順:
 *   1. node scripts/chemical-data-import/nite-chrip-importer.mjs
 *   2. node scripts/etl/strip-society-values.mjs (学会数値の混入が無いことを再担保)
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
const NITE_JSONL = join(REPO_ROOT, "web", "src", "data", "chemicals-nite", "classifications.jsonl");
const NITE_MANIFEST = join(REPO_ROOT, "web", "src", "data", "chemicals-nite", "manifest.json");

const NITE_SOURCE_LABEL = "GHS_NITE";

// 短縮コード → 「区分N」形式 (UI 表示用)
const GHS_VERBOSE = {
  "1A": "区分1A",
  "1B": "区分1B",
  "1C": "区分1C",
  "1": "区分1",
  "2": "区分2",
  "2A": "区分2A",
  "2B": "区分2B",
  "3": "区分3",
  "4": "区分4",
  "5": "区分5",
};

/** 短縮コードが「区分N (実害指摘あり)」かどうか */
function isHazardClass(short) {
  if (!short || typeof short !== "string") return false;
  if (short.startsWith("区分")) return true;
  return /^[12345]([ABC])?$/.test(short);
}

/** GHS 区分の表示用文字列 (UI ラベル) */
function verboseGhs(short) {
  if (!short) return undefined;
  if (short.startsWith("区分")) return short; // 既に展開済
  return GHS_VERBOSE[short] ?? short;
}

/** NITE エントリから濃度マスタ用の主要GHSフィールドへ変換 */
function buildGhsSummary(entry) {
  const g = entry.ghs ?? {};
  const summary = {};
  if (isHazardClass(g.carcinogen)) summary.carcinogen = verboseGhs(g.carcinogen);
  if (isHazardClass(g.mutagen)) summary.mutagen = verboseGhs(g.mutagen);
  if (isHazardClass(g.reproTox)) summary.reproTox = verboseGhs(g.reproTox);
  if (isHazardClass(g.skinSens)) summary.skinSens = verboseGhs(g.skinSens);
  if (isHazardClass(g.respSens)) summary.respSens = verboseGhs(g.respSens);
  if (isHazardClass(g.skinCorrIrr)) summary.skinCorrIrr = verboseGhs(g.skinCorrIrr);
  if (isHazardClass(g.eyeDamageIrr)) summary.eyeDamageIrr = verboseGhs(g.eyeDamageIrr);
  if (isHazardClass(g.stotSingle)) summary.stotSingle = verboseGhs(g.stotSingle);
  if (isHazardClass(g.stotRepeat)) summary.stotRepeat = verboseGhs(g.stotRepeat);
  if (isHazardClass(g.aspiration)) summary.aspiration = verboseGhs(g.aspiration);
  return Object.keys(summary).length > 0 ? summary : undefined;
}

/** CAS 番号の最小バリデーション (NITE 入力は基本クリーンだがガード) */
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
  if (!existsSync(NITE_JSONL)) {
    console.error(
      `[nite-chrip-importer] 入力 JSONL 不在: ${NITE_JSONL}\n` +
        `  先に python3 scripts/chemical-data-import/parse-nite-chrip.py を実行してください。`
    );
    process.exit(1);
  }
  if (!existsSync(TARGET_JSON)) {
    console.error(`[nite-chrip-importer] 既存マスタ不在: ${TARGET_JSON}`);
    process.exit(1);
  }

  const niteEntries = await loadJsonl(NITE_JSONL);
  console.log(`[nite-chrip-importer] NITE エントリ: ${niteEntries.length} 件`);

  let manifestSha = null;
  try {
    const m = JSON.parse(await readFile(NITE_MANIFEST, "utf-8"));
    manifestSha = m.source?.sha256 ?? null;
  } catch {
    // manifest が無くてもマージ自体は継続
  }

  const doc = JSON.parse(await readFile(TARGET_JSON, "utf-8"));
  const beforeTotal = Object.keys(doc.substances).length;

  // sources マップに NITE を登録 (重複追加しない)
  if (!doc.sources[NITE_SOURCE_LABEL]) {
    doc.sources[NITE_SOURCE_LABEL] =
      "独立行政法人 製品評価技術基盤機構 (NITE) 統合版GHS分類結果: " +
      "https://www.chem-info.nite.go.jp/chem/ghs/ghs_nite_download.html";
  }

  let merged = 0;
  let added = 0;
  let skippedInvalidCas = 0;
  let chripUrlAdded = 0;

  for (const n of niteEntries) {
    const cas = (n.cas ?? "").trim();
    if (!CAS_PATTERN.test(cas)) {
      skippedInvalidCas++;
      continue;
    }

    const ghsSummary = buildGhsSummary(n);

    if (doc.substances[cas]) {
      // 既存エントリ: regulationTags / chripUrl / 発がん性GHS を補完。数値は触らない。
      const ex = doc.substances[cas];
      const tags = new Set(ex.regulationTags ?? []);
      tags.add("nite");
      ex.regulationTags = Array.from(tags).sort();
      if (n.chripUrl && !ex.niteChripUrl) {
        ex.niteChripUrl = n.chripUrl;
        chripUrlAdded++;
      }
      // 発がん性GHS: 既存に ghs が無い場合のみ補完 (MHLW > NITE > 既存)
      if (ghsSummary?.carcinogen) {
        ex.carcinogenicity = ex.carcinogenicity ?? {};
        if (!ex.carcinogenicity.ghsClass) {
          ex.carcinogenicity.ghsClass = ghsSummary.carcinogen;
          if (!ex.carcinogenicity.source) ex.carcinogenicity.source = NITE_SOURCE_LABEL;
        }
      }
      // NITE 由来の主要 GHS 区分まとめ (新フィールド: niteGhsClassifications)
      if (ghsSummary && !ex.niteGhsClassifications) {
        ex.niteGhsClassifications = ghsSummary;
      }
      merged++;
    } else {
      // 新規エントリ: source=reference + regulationTags=["nite"] で追加
      const entry = {
        name: n.nameJa || `CAS ${cas}`,
        source: "reference",
        regulationTags: ["nite"],
      };
      if (n.chripUrl) {
        entry.niteChripUrl = n.chripUrl;
        chripUrlAdded++;
      }
      if (ghsSummary?.carcinogen) {
        entry.carcinogenicity = {
          ghsClass: ghsSummary.carcinogen,
          source: NITE_SOURCE_LABEL,
        };
      }
      if (ghsSummary) entry.niteGhsClassifications = ghsSummary;
      doc.substances[cas] = entry;
      added++;
    }
  }

  // summary 更新
  const afterTotal = Object.keys(doc.substances).length;
  const withNite = Object.values(doc.substances).filter((e) =>
    (e.regulationTags ?? []).includes("nite")
  ).length;
  const ghsByNite = Object.values(doc.substances).filter(
    (e) => e.niteGhsClassifications
  ).length;

  doc.summary = {
    ...doc.summary,
    total: afterTotal,
    withNiteGhs: ghsByNite,
    withRegulationNite: withNite,
  };

  doc.generatedAt = new Date().toISOString();
  // version は v3.x のままにし、niteImported フラグを追加
  doc.niteImport = {
    importedAt: new Date().toISOString(),
    sourceCount: niteEntries.length,
    merged,
    added,
    sourceSha256: manifestSha,
    sourceUrl: "https://www.chem-info.nite.go.jp/chem/ghs/files/list_nite_all.xlsx",
  };

  await writeFile(TARGET_JSON, JSON.stringify(doc, null, 2) + "\n", "utf-8");

  console.log(
    `[nite-chrip-importer] before=${beforeTotal} after=${afterTotal} ` +
      `(merged=${merged} added=${added} chripUrlAdded=${chripUrlAdded} skippedInvalidCas=${skippedInvalidCas})`
  );
  console.log(`[nite-chrip-importer] withRegulationNite=${withNite} withNiteGhs=${ghsByNite}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
