#!/usr/bin/env node
/**
 * Phase 1a: ACGIH TLV 数値 / JSOH 許容濃度数値を本番DB(concentration-limits.json)から
 * 完全除去し、公式参照リンクと lookupHint のみを残す。
 *
 *   $ node scripts/etl/strip-society-values.mjs
 *
 * 入力 : web/src/data/concentration-limits.json (v2.0.0)
 * 出力 : web/src/data/concentration-limits.json (v3.0.0-government-only)
 *        docs/chemical-ra-phase1a/removed-values.md (監査用ログ)
 *
 * 設計判断 (2026-05-23 D2/D3):
 *   - 国の数値(MHLW_177)は自由利用可能 → 保持
 *   - 学会数値(JSOH/ACGIH)は著作権あり → 数値削除、参照URLのみ
 *   - 削除対象:
 *       (1) entry.jsoh / entry.acgih (ネスト構造) → externalRefs に置換
 *       (2) entry.jsohOel / entry.acgihTlv (フラット数値) → 削除
 *       (3) entry.twa.source === "JSOH" or "ACGIH" → twa を削除
 *           (entry.stel/ceiling 同様)
 *   - 物質エントリ自体は維持(CAS識別子・物質名・IARC・MHLW値・SDSリンクは残す)
 *
 * 冪等性: 既に v3.0.0 以降のファイルに対しても安全に再実行可能
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const JSON_SRC = join(REPO_ROOT, "web", "src", "data", "concentration-limits.json");
const AUDIT_MD = join(REPO_ROOT, "docs", "chemical-ra-phase1a", "removed-values.md");

const ACGIH_PUBLIC_URL = "https://www.acgih.org/tlv-bei-guidelines/";
const JSOH_PUBLIC_URL = "https://www.sanei.or.jp/topics/recommendation.html";

const ACGIH_LOOKUP_HINT =
  "ACGIH TLVs and BEIs 年次版を公式サイトで参照(英文/会員向け)";
const JSOH_LOOKUP_HINT =
  "JSOH 許容濃度等の勧告(年次)を公式サイトで参照";

function stripEntry(cas, entry) {
  const removed = {
    cas,
    name: entry.name ?? "",
    nameEn: entry.nameEn,
    removedFields: [],
  };

  // (1) twa/stel/ceiling のうち、source が JSOH/ACGIH のものを削除
  for (const k of ["twa", "stel", "ceiling"]) {
    const v = entry[k];
    if (v && (v.source === "JSOH" || v.source === "ACGIH")) {
      removed.removedFields.push({
        path: k,
        source: v.source,
        value: v.value,
        unit: v.unit,
      });
      delete entry[k];
    }
  }

  // (2) ネスト構造 jsoh / acgih の数値を削除し、externalRefs に置換
  const externalRefs = entry.externalRefs ?? {};
  if (entry.jsoh) {
    removed.removedFields.push({ path: "jsoh", payload: entry.jsoh });
    externalRefs.jsoh = {
      url: JSOH_PUBLIC_URL,
      lookupHint: JSOH_LOOKUP_HINT,
    };
    delete entry.jsoh;
  }
  if (entry.acgih) {
    removed.removedFields.push({ path: "acgih", payload: entry.acgih });
    externalRefs.acgih = {
      url: ACGIH_PUBLIC_URL,
      lookupHint: ACGIH_LOOKUP_HINT,
    };
    delete entry.acgih;
  }

  // (3) フラット数値 jsohOel / acgihTlv を削除
  if (entry.jsohOel != null) {
    removed.removedFields.push({ path: "jsohOel", payload: entry.jsohOel });
    delete entry.jsohOel;
  }
  if (entry.acgihTlv != null) {
    removed.removedFields.push({ path: "acgihTlv", payload: entry.acgihTlv });
    delete entry.acgihTlv;
  }

  // entry.source が "jsoh"/"acgih" だったら "reference" に再分類
  if (entry.source === "jsoh" || entry.source === "acgih") {
    entry.source = "reference";
  }

  if (Object.keys(externalRefs).length > 0) {
    entry.externalRefs = externalRefs;
  }

  return removed;
}

function summarize(byCas) {
  const entries = Object.values(byCas);
  const withNite = entries.filter((v) => (v.regulationTags ?? []).includes("nite")).length;
  const withNiteGhs = entries.filter((v) => v.niteGhsClassifications).length;
  const withPrtr = entries.filter((v) => {
    const t = v.regulationTags ?? [];
    return t.includes("prtr1") || t.includes("prtr2");
  }).length;
  const withChashin = entries.filter((v) => {
    const t = v.regulationTags ?? [];
    return (
      t.some((x) => x.startsWith("cscl")) ||
      t.includes("poison-control") ||
      t.includes("cwc") ||
      t.includes("waste")
    );
  }).length;
  return {
    total: entries.length,
    withMhlw: entries.filter((v) => v.source === "mhlw").length,
    withIarc: entries.filter((v) => v.iarcGroup).length,
    withExternalAcgihRef: entries.filter((v) => v.externalRefs?.acgih).length,
    withExternalJsohRef: entries.filter((v) => v.externalRefs?.jsoh).length,
    withRegulationNite: withNite,
    withNiteGhs,
    withPrtr,
    withChashin,
    bySource: {
      mhlw: entries.filter((v) => v.source === "mhlw").length,
      reference: entries.filter((v) => v.source === "reference").length,
    },
    byIarc: {
      group1: entries.filter((v) => v.iarcGroup === "1").length,
      group2A: entries.filter((v) => v.iarcGroup === "2A").length,
      group2B: entries.filter((v) => v.iarcGroup === "2B").length,
      group3: entries.filter((v) => v.iarcGroup === "3").length,
    },
  };
}

function renderAuditMd(removedList, summaryBefore, summaryAfter) {
  const lines = [];
  lines.push("# 学会数値除去 監査ログ (Phase 1a)");
  lines.push("");
  lines.push(`- 実行日時: ${new Date().toISOString()}`);
  lines.push("- 対象ファイル: `web/src/data/concentration-limits.json`");
  lines.push(
    "- 設計根拠: `docs/chemical-ra-research-2026-05-23/08-implementation-roadmap.md` D2/D3 (2026-05-23)"
  );
  lines.push("");
  lines.push("## サマリ");
  lines.push("");
  lines.push("### 除去前");
  lines.push("```json");
  lines.push(JSON.stringify(summaryBefore, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("### 除去後");
  lines.push("```json");
  lines.push(JSON.stringify(summaryAfter, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## 除去対象内訳");
  lines.push("");
  const countByPath = {};
  for (const r of removedList) {
    for (const f of r.removedFields) {
      countByPath[f.path] = (countByPath[f.path] ?? 0) + 1;
    }
  }
  for (const [k, n] of Object.entries(countByPath).sort()) {
    lines.push(`- ${k}: ${n} 件`);
  }
  lines.push("");
  lines.push("## 物質別削除レコード");
  lines.push("");
  lines.push(
    "| CAS | 物質名 | 削除フィールド |"
  );
  lines.push("|---|---|---|");
  for (const r of removedList) {
    if (r.removedFields.length === 0) continue;
    const fields = r.removedFields
      .map((f) => {
        if (f.path === "twa" || f.path === "stel" || f.path === "ceiling") {
          return `${f.path}(${f.source}:${f.value}${f.unit})`;
        }
        return f.path;
      })
      .join(" / ");
    const name = (r.name ?? "").replace(/\|/g, "\\|");
    lines.push(`| ${r.cas} | ${name} | ${fields} |`);
  }
  lines.push("");
  lines.push("## 参照リンク (UI/APIから案内)");
  lines.push("");
  lines.push(`- ACGIH 公式: ${ACGIH_PUBLIC_URL}`);
  lines.push(`- JSOH 公式: ${JSOH_PUBLIC_URL}`);
  return lines.join("\n") + "\n";
}

async function main() {
  const raw = await readFile(JSON_SRC, "utf-8");
  const doc = JSON.parse(raw);
  const summaryBefore = doc.summary;

  const removedList = [];
  for (const [cas, entry] of Object.entries(doc.substances)) {
    const removed = stripEntry(cas, entry);
    if (removed.removedFields.length > 0) removedList.push(removed);
  }

  const newSources = {
    MHLW_177: doc.sources?.MHLW_177 ?? "厚生労働省告示第177号",
    IARC: doc.sources?.IARC ?? "IARC Monographs (List of Classifications)",
    GHS_MHLW: doc.sources?.GHS_MHLW ?? "厚生労働省 国によるGHS分類",
    ACGIH_EXTERNAL: `ACGIH TLVs and BEIs (公式参照のみ・数値非収録): ${ACGIH_PUBLIC_URL}`,
    JSOH_EXTERNAL: `JSOH 許容濃度等の勧告 (公式参照のみ・数値非収録): ${JSOH_PUBLIC_URL}`,
  };
  // Phase 1b/1c/1d 以降のソースは既存登録を保持
  if (doc.sources?.GHS_NITE) newSources.GHS_NITE = doc.sources.GHS_NITE;
  if (doc.sources?.PRTR_KAKAN) newSources.PRTR_KAKAN = doc.sources.PRTR_KAKAN;
  if (doc.sources?.CHASHIN_DOKUGEKI_CWC_WASTE)
    newSources.CHASHIN_DOKUGEKI_CWC_WASTE = doc.sources.CHASHIN_DOKUGEKI_CWC_WASTE;

  const newSummary = summarize(doc.substances);
  const hasChashin = newSummary.withChashin > 0;
  const hasPrtr = newSummary.withPrtr > 0;
  const hasNite = newSummary.withRegulationNite > 0;
  let version = "3.0.0-government-only";
  if (hasNite) version = "3.1.0-government-only-nite";
  if (hasNite && hasPrtr) version = "3.2.0-government-only-nite-prtr";
  if (hasNite && hasPrtr && hasChashin) version = "3.3.0-government-only-nite-prtr-chashin";

  const newDoc = {
    generatedAt: new Date().toISOString(),
    version,
    policy: {
      description:
        "学会数値(ACGIH/JSOH)は著作権ありのため数値非収録。公式参照URLのみ提供。",
      removedSources: ["ACGIH", "JSOH"],
      removedAt: new Date().toISOString().slice(0, 10),
      authority:
        "D2/D3 確定 2026-05-23 (docs/chemical-ra-research-2026-05-23/08-implementation-roadmap.md)",
    },
    sources: newSources,
    summary: newSummary,
    // Phase 1b/1c/1d 追加: インポートメタを保持
    ...(doc.niteImport ? { niteImport: doc.niteImport } : {}),
    ...(doc.prtrImport ? { prtrImport: doc.prtrImport } : {}),
    ...(doc.chashinImport ? { chashinImport: doc.chashinImport } : {}),
    substances: doc.substances,
  };

  await writeFile(JSON_SRC, JSON.stringify(newDoc, null, 2) + "\n", "utf-8");

  await mkdir(dirname(AUDIT_MD), { recursive: true });
  await writeFile(AUDIT_MD, renderAuditMd(removedList, summaryBefore, newSummary), "utf-8");

  console.log("[strip-society-values]");
  console.log("  total substances :", newSummary.total);
  console.log("  with MHLW (国の数値):", newSummary.withMhlw);
  console.log("  ACGIH 参照リンク :", newSummary.withExternalAcgihRef);
  console.log("  JSOH  参照リンク :", newSummary.withExternalJsohRef);
  console.log("  removed entries  :", removedList.length);
  console.log("  written          →", JSON_SRC);
  console.log("  audit log        →", AUDIT_MD);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
