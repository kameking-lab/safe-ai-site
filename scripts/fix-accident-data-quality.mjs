#!/usr/bin/env node
/**
 * Apply quality fixes to the accident dataset.
 *
 * Fixes applied (each idempotent):
 *  1. JSONL — strip redundant "（職場のあんぜんサイト）" suffix in source.name (~26 records).
 *  2. TS — backfill structured `source` object for mhlw-* IDs by parsing
 *     "出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=XXXXX" from summary.
 *  3. TS — write explicit `provenance` for every curated record (replaces fragile
 *     ID-prefix inference inside accident-cases.ts at runtime). Inference rules:
 *       mhlw-*       → "mhlw"
 *       industry-*   → "curated"
 *       curated-*    → "curated"
 *       synthetic-*  → "synthetic"
 *       preliminary-*→ "preliminary"  (kept by existing preliminary file)
 *       others       → "curated"
 *
 * Re-running is safe: each transform is idempotent.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const JSONL_PATH = join(REPO_ROOT, "data", "accidents-10years.jsonl");
const TS_DIR = join(REPO_ROOT, "web", "src", "data", "mock");

const summary = {
  jsonlSourceNameFixed: 0,
  tsSourceAdded: 0,
  tsProvenanceAdded: 0,
  tsFilesUpdated: 0,
};

// ── Fix 1: JSONL source.name normalization ───────────────────────────────
function fixJsonl() {
  const raw = readFileSync(JSONL_PATH, "utf8");
  const lines = raw.split(/\r?\n/);
  let changed = 0;
  const out = lines.map((line) => {
    const t = line.trim();
    if (!t) return line;
    try {
      const obj = JSON.parse(t);
      if (obj.source?.name === "厚労省 職場のあんぜんサイト（職場のあんぜんサイト）") {
        obj.source.name = "厚労省 職場のあんぜんサイト";
        changed++;
        return JSON.stringify(obj);
      }
      return line;
    } catch {
      return line;
    }
  });
  if (changed > 0) {
    writeFileSync(JSONL_PATH, out.join("\n"));
  }
  summary.jsonlSourceNameFixed = changed;
}

// ── Fix 2 & 3: TS source + provenance backfill ────────────────────────────
function inferProvenanceFromId(id) {
  const lower = id.toLowerCase();
  if (lower.startsWith("mhlw-")) return "mhlw";
  if (lower.startsWith("synthetic-")) return "synthetic";
  if (lower.startsWith("preliminary-")) return "preliminary";
  // industry-*, curated-*, others → curated
  return "curated";
}

/**
 * Split top-level object blocks in a TS array body using brace-balance.
 * Returns array of { block, start, end } with offsets into `body`.
 */
function splitTopLevelBlocks(body) {
  const out = [];
  let depth = 0,
    start = -1,
    inStr = false,
    strCh = "",
    escape = false;
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
        out.push({ start, end: i + 1, block: body.slice(start, i + 1) });
        start = -1;
      }
    }
  }
  return out;
}

function extractField(block, key) {
  const re = new RegExp(`\\b${key}\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`);
  const m = block.match(re);
  return m ? m[1] : undefined;
}

function fixTsFile(path) {
  const raw = readFileSync(path, "utf8");
  const arrStart = raw.indexOf("[");
  const arrEnd = raw.lastIndexOf("]");
  if (arrStart < 0 || arrEnd < 0) return;

  const head = raw.slice(0, arrStart + 1);
  const body = raw.slice(arrStart + 1, arrEnd);
  const tail = raw.slice(arrEnd);

  const blocks = splitTopLevelBlocks(body);
  // Process from end → start so character offsets remain valid.
  let newBody = body;
  let sourceAdded = 0;
  let provAdded = 0;

  for (let i = blocks.length - 1; i >= 0; i--) {
    const { start, end, block } = blocks[i];
    const id = extractField(block, "id");
    if (!id) continue;

    const hasSource = /\bsource\s*:\s*\{/.test(block);
    const hasProvenance = /\bprovenance\s*:\s*"/.test(block);
    const summary = extractField(block, "summary");

    let mutated = block;

    // (a) Add structured source for mhlw-* IDs when missing
    if (!hasSource && id.startsWith("mhlw-")) {
      // Try to extract joho_no from summary or from id digits
      let caseId = null;
      const m = summary?.match(/joho_no=(\d+)/);
      if (m) caseId = m[1];
      else {
        const idDigits = id.match(/^mhlw-(\d+)$/);
        if (idDigits) caseId = idDigits[1];
      }
      if (caseId) {
        const url = `https://anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=${caseId}`;
        const sourceObj = `\n    source: {\n      site: "職場のあんぜんサイト",\n      caseId: "${caseId}",\n      url: "${url}",\n    },`;
        // Inject before closing brace
        const closingIdx = mutated.lastIndexOf("}");
        // Ensure last property ends with comma or newline
        const beforeClose = mutated.slice(0, closingIdx).replace(/,?\s*$/, ",");
        mutated = beforeClose + sourceObj + "\n  }";
        sourceAdded++;
      }
    }

    // (b) Add explicit provenance when missing
    if (!hasProvenance) {
      const prov = inferProvenanceFromId(id);
      const provLine = `\n    provenance: "${prov}",`;
      const closingIdx = mutated.lastIndexOf("}");
      const beforeClose = mutated.slice(0, closingIdx).replace(/,?\s*$/, ",");
      mutated = beforeClose + provLine + "\n  }";
      provAdded++;
    }

    if (mutated !== block) {
      newBody = newBody.slice(0, start) + mutated + newBody.slice(end);
    }
  }

  if (sourceAdded > 0 || provAdded > 0) {
    writeFileSync(path, head + newBody + tail);
    summary.tsFilesUpdated++;
    summary.tsSourceAdded += sourceAdded;
    summary.tsProvenanceAdded += provAdded;
  }
}

function fixTsAll() {
  const tsFiles = readdirSync(TS_DIR).filter((f) => /^real-accident-cases.*\.ts$/.test(f));
  for (const f of tsFiles) {
    fixTsFile(join(TS_DIR, f));
  }
}

// ── Run ────────────────────────────────────────────────────────────────────
fixJsonl();
fixTsAll();
console.log("Fix summary:", JSON.stringify(summary, null, 2));
