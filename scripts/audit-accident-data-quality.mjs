#!/usr/bin/env node
/**
 * Comprehensive accident data quality audit.
 *
 * Scope:
 *  - data/accidents-10years.jsonl (5,010 aggregated records)
 *  - web/src/data/mock/real-accident-cases*.ts (curated TS files)
 *
 * Audits run:
 *   A. Source / provenance coverage
 *   B. Industry slug consistency
 *   C. Duplicate IDs and near-duplicate cases
 *   D. Description quality patterns
 *   E. Metadata (provenance) backfill candidates
 *
 * Outputs a single JSON report to scripts/etl/data/accident-audit-YYYY-MM-DD.json.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const JSONL_PATH = join(REPO_ROOT, "data", "accidents-10years.jsonl");
const TS_DIR = join(REPO_ROOT, "web", "src", "data", "mock");

const VALID_WORK_CATEGORIES = new Set([
  "建設業",
  "製造業",
  "運輸交通業",
  "商業",
  "保健衛生業",
  "林業",
  "電気業",
  "化学",
  "その他の事業",
]);

const VALID_ACCIDENT_TYPES = new Set([
  "墜落",
  "転倒",
  "はさまれ・巻き込まれ",
  "切れ・こすれ",
  "飛来・落下",
  "感電",
  "車両",
  "交通事故",
  "崩壊・倒壊",
  "火災",
  "爆発",
  "高温・低温の物との接触",
  "有害物等との接触",
  "酸素欠乏",
  "溺水",
  "熱中症",
  "低体温症",
  "有害光線",
  "有害物質",
  "激突され",
  "振動障害",
  "動作の反動・無理な動作",
]);

const VALID_SEVERITY = new Set(["軽傷", "中等傷", "重傷", "死亡"]);

// ── Loaders ───────────────────────────────────────────────────────────────
function loadJsonl(path) {
  const raw = readFileSync(path, "utf8");
  const out = [];
  let lineNo = 0;
  for (const line of raw.split(/\r?\n/)) {
    lineNo++;
    const t = line.trim();
    if (!t) continue;
    try {
      out.push({ ...JSON.parse(t), __lineNo: lineNo });
    } catch (err) {
      out.push({ __parseError: err.message, __lineNo: lineNo, __raw: t.slice(0, 200) });
    }
  }
  return out;
}

/**
 * Parse a TypeScript array-of-objects accident-case file using regex.
 * Brittle but sufficient for these well-formed author files.
 */
function parseTsCases(path) {
  const raw = readFileSync(path, "utf8");
  const out = [];
  // Match each `{ ... }` top-level object block at indent 2 (one entry per block).
  // Use simple brace-balance over the export array body.
  const arrStart = raw.indexOf("[");
  const arrEnd = raw.lastIndexOf("]");
  if (arrStart < 0 || arrEnd < 0) return out;
  const body = raw.slice(arrStart + 1, arrEnd);
  // Walk and split top-level `{...},` blocks (depth 0 commas only)
  let depth = 0;
  let start = -1;
  let inStr = false;
  let strCh = "";
  let escape = false;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inStr) {
      if (c === "\\") escape = true;
      else if (c === strCh) inStr = false;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      inStr = true;
      strCh = c;
      continue;
    }
    if (c === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        out.push(body.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return out
    .map((block) => parseBlock(block, path))
    .filter((b) => b);
}

function parseBlock(block, path) {
  const get = (key) => {
    const re = new RegExp(`\\b${key}\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"`);
    const m = block.match(re);
    return m ? m[1] : undefined;
  };
  const id = get("id");
  if (!id) return null;
  // provenance literal (without quotes for AccidentProvenance union types)
  const provM = block.match(/\bprovenance\s*:\s*"([^"]+)"/);
  // source object: detect presence of `source:` key
  const hasSource = /\bsource\s*:\s*\{/.test(block);
  // url inside source
  const urlInSource = (() => {
    const sIdx = block.indexOf("source");
    if (sIdx < 0) return undefined;
    const after = block.slice(sIdx);
    const m = after.match(/\burl\s*:\s*"((?:[^"\\]|\\.)*)"/);
    return m ? m[1] : undefined;
  })();
  return {
    __file: path.split(/[\\/]/).pop(),
    id,
    title: get("title"),
    occurredOn: get("occurredOn"),
    type: get("type"),
    workCategory: get("workCategory"),
    severity: get("severity"),
    summary: get("summary"),
    industry_detail: get("industry_detail"),
    provenance: provM ? provM[1] : undefined,
    hasSource,
    sourceUrl: urlInSource,
    rawBlock: block,
  };
}

// ── Audits ────────────────────────────────────────────────────────────────
function auditA(jsonlCases, tsCases) {
  const findings = {
    jsonl: { total: jsonlCases.length, emptySource: 0, mhlwWithUrl: 0, mhlwWithoutUrl: 0, curatedWithSource: 0, otherWithSource: 0, bySourceName: {} },
    ts: { total: tsCases.length, emptySource: 0, mhlwIdWithoutSource: 0, curatedIdWithoutSource: 0, withSource: 0 },
    classifications: { primary: 0, secondary: 0, unknown: 0 },
  };

  for (const c of jsonlCases) {
    if (c.__parseError) continue;
    const src = c.source;
    if (!src || !src.name) {
      findings.jsonl.emptySource++;
      continue;
    }
    const name = src.name;
    findings.jsonl.bySourceName[name] = (findings.jsonl.bySourceName[name] ?? 0) + 1;

    if (c.id?.startsWith("mhlw-")) {
      if (src.url) findings.jsonl.mhlwWithUrl++;
      else findings.jsonl.mhlwWithoutUrl++;
    } else if (c.id?.startsWith("curated-")) {
      findings.jsonl.curatedWithSource++;
    } else {
      findings.jsonl.otherWithSource++;
    }

    // Reliability classification
    if (
      name.includes("厚労省") ||
      name.includes("職場のあんぜん") ||
      name.includes("中央労働災害防止協会") ||
      name.includes("JISHA") ||
      name.includes("MHLW")
    ) {
      findings.classifications.primary++;
    } else if (name) {
      findings.classifications.secondary++;
    } else {
      findings.classifications.unknown++;
    }
  }

  for (const c of tsCases) {
    if (c.hasSource) findings.ts.withSource++;
    else {
      findings.ts.emptySource++;
      if (c.id?.startsWith("mhlw-")) findings.ts.mhlwIdWithoutSource++;
      else findings.ts.curatedIdWithoutSource++;
    }
  }

  return findings;
}

function auditB(jsonlCases, tsCases) {
  const jsonlIndustryCounts = {};
  const tsCategoryCounts = {};
  const invalidJsonl = [];
  const invalidTs = [];
  const invalidAccidentType = [];

  for (const c of jsonlCases) {
    if (c.__parseError) continue;
    if (c.industry) {
      jsonlIndustryCounts[c.industry] = (jsonlIndustryCounts[c.industry] ?? 0) + 1;
      if (!VALID_WORK_CATEGORIES.has(c.industry)) {
        invalidJsonl.push({ id: c.id, industry: c.industry });
      }
    } else {
      invalidJsonl.push({ id: c.id, industry: "(missing)" });
    }
    if (c.accidentType && !VALID_ACCIDENT_TYPES.has(c.accidentType)) {
      invalidAccidentType.push({ id: c.id, accidentType: c.accidentType });
    }
  }

  for (const c of tsCases) {
    if (c.workCategory) {
      tsCategoryCounts[c.workCategory] = (tsCategoryCounts[c.workCategory] ?? 0) + 1;
      if (!VALID_WORK_CATEGORIES.has(c.workCategory)) {
        invalidTs.push({ id: c.id, workCategory: c.workCategory, file: c.__file });
      }
    }
    if (c.type && !VALID_ACCIDENT_TYPES.has(c.type)) {
      invalidAccidentType.push({ id: c.id, type: c.type, file: c.__file });
    }
  }

  return {
    jsonlIndustryCounts,
    tsCategoryCounts,
    invalidJsonl: invalidJsonl.slice(0, 30),
    invalidJsonlCount: invalidJsonl.length,
    invalidTs,
    invalidAccidentType: invalidAccidentType.slice(0, 30),
    invalidAccidentTypeCount: invalidAccidentType.length,
  };
}

function auditC(jsonlCases, tsCases) {
  // Duplicate IDs within jsonl
  const jsonlIdCounts = new Map();
  for (const c of jsonlCases) {
    if (c.__parseError || !c.id) continue;
    jsonlIdCounts.set(c.id, (jsonlIdCounts.get(c.id) ?? 0) + 1);
  }
  const jsonlDupIds = [...jsonlIdCounts.entries()].filter(([, n]) => n > 1);

  const tsIdCounts = new Map();
  for (const c of tsCases) {
    if (!c.id) continue;
    tsIdCounts.set(c.id, (tsIdCounts.get(c.id) ?? 0) + 1);
  }
  const tsDupIds = [...tsIdCounts.entries()].filter(([, n]) => n > 1);

  // Cross-set ID overlap (JSONL vs TS)
  const tsIdSet = new Set(tsCases.map((c) => c.id));
  const crossOverlap = [];
  for (const c of jsonlCases) {
    if (c.__parseError) continue;
    if (tsIdSet.has(c.id)) crossOverlap.push(c.id);
  }

  // Near-duplicate detection within JSONL (occurredOn + industry + first 40 chars of summary)
  const sigMap = new Map();
  for (const c of jsonlCases) {
    if (c.__parseError) continue;
    const key = `${c.occurredOn ?? ""}|${c.industry ?? ""}|${(c.summary ?? "").slice(0, 40)}`;
    const arr = sigMap.get(key) ?? [];
    arr.push(c.id);
    sigMap.set(key, arr);
  }
  const jsonlNearDups = [...sigMap.entries()].filter(([, ids]) => ids.length > 1);

  return {
    jsonlDupIds,
    jsonlDupIdsCount: jsonlDupIds.length,
    tsDupIds,
    tsDupIdsCount: tsDupIds.length,
    crossOverlapCount: crossOverlap.length,
    crossOverlapSample: crossOverlap.slice(0, 10),
    jsonlNearDups: jsonlNearDups.slice(0, 20),
    jsonlNearDupsCount: jsonlNearDups.length,
  };
}

function auditD(jsonlCases, tsCases, sampleSize = 100) {
  const all = [];
  for (const c of jsonlCases) {
    if (c.__parseError) continue;
    all.push({ scope: "jsonl", ...c });
  }
  for (const c of tsCases) all.push({ scope: "ts", ...c });

  // Deterministic sample
  const step = Math.floor(all.length / sampleSize) || 1;
  const sample = [];
  for (let i = 0; i < all.length && sample.length < sampleSize; i += step) {
    sample.push(all[i]);
  }

  const issues = {
    dateMalformed: [],
    severityInvalid: [],
    severityMissing: [],
    summaryTooShort: [],
    summaryMissing: [],
    causesEmpty: [],
    preventionsEmpty: [],
    dateOutOfRange: [],
  };
  for (const c of sample) {
    const occurredOn = c.occurredOn;
    if (!occurredOn) {
      issues.dateMalformed.push({ scope: c.scope, id: c.id });
    } else if (!/^\d{4}(-\d{2}(-\d{2})?)?$/.test(occurredOn)) {
      issues.dateMalformed.push({ scope: c.scope, id: c.id, occurredOn });
    } else {
      const year = Number(occurredOn.slice(0, 4));
      if (year < 2007 || year > 2027) issues.dateOutOfRange.push({ id: c.id, occurredOn });
    }
    const sev = c.scope === "jsonl" ? c.severity : c.severity;
    if (!sev) issues.severityMissing.push({ scope: c.scope, id: c.id });
    else if (!VALID_SEVERITY.has(sev)) issues.severityInvalid.push({ scope: c.scope, id: c.id, severity: sev });

    const summary = c.summary;
    if (!summary) issues.summaryMissing.push({ scope: c.scope, id: c.id });
    else if (summary.length < 25) issues.summaryTooShort.push({ scope: c.scope, id: c.id, length: summary.length });

    if (c.scope === "jsonl") {
      if (!c.causes || c.causes.length === 0) issues.causesEmpty.push({ id: c.id });
      if (!c.preventions || c.preventions.length === 0) issues.preventionsEmpty.push({ id: c.id });
    }
  }
  return {
    sampleSize: sample.length,
    issues: Object.fromEntries(Object.entries(issues).map(([k, v]) => [k, { count: v.length, examples: v.slice(0, 10) }])),
  };
}

function auditE(jsonlCases, tsCases) {
  // JSONL: doesn't carry provenance — needs to be derived from id when consumed
  const tsMissingProvenance = [];
  for (const c of tsCases) {
    if (!c.provenance) {
      tsMissingProvenance.push({ id: c.id, file: c.__file });
    }
  }
  return {
    tsTotal: tsCases.length,
    tsMissingProvenance: tsMissingProvenance.length,
    tsExamplesMissingProvenance: tsMissingProvenance.slice(0, 10),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────
function main() {
  console.log("=== ANZEN-AI Accident Data Quality Audit ===\n");

  console.log(`Loading ${JSONL_PATH}`);
  const jsonlCases = loadJsonl(JSONL_PATH);
  console.log(`  → ${jsonlCases.length} entries (${jsonlCases.filter((c) => c.__parseError).length} parse errors)\n`);

  const tsFiles = readdirSync(TS_DIR).filter((f) => /^real-accident-cases.*\.ts$/.test(f));
  const tsCases = [];
  for (const f of tsFiles) {
    const cs = parseTsCases(join(TS_DIR, f));
    console.log(`Loading ${f}: ${cs.length} entries`);
    tsCases.push(...cs);
  }
  console.log(`  TS total: ${tsCases.length}\n`);

  const A = auditA(jsonlCases, tsCases);
  console.log("Phase A: Source coverage\n", JSON.stringify(A, null, 2), "\n");

  const B = auditB(jsonlCases, tsCases);
  console.log("Phase B: Industry slug consistency\n", JSON.stringify(B, null, 2), "\n");

  const C = auditC(jsonlCases, tsCases);
  console.log("Phase C: Duplicates\n", JSON.stringify(C, null, 2), "\n");

  const D = auditD(jsonlCases, tsCases);
  console.log("Phase D: Sampling quality\n", JSON.stringify(D, null, 2), "\n");

  const E = auditE(jsonlCases, tsCases);
  console.log("Phase E: Provenance backfill\n", JSON.stringify(E, null, 2), "\n");

  const outDir = join(__dirname, "etl", "data");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `accident-audit-${new Date().toISOString().slice(0, 10)}.json`);
  writeFileSync(outPath, JSON.stringify({ A, B, C, D, E }, null, 2));
  console.log(`Report written: ${outPath}`);
}

main();
