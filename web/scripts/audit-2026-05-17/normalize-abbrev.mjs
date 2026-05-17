#!/usr/bin/env node
// Normalize non-canonical law abbreviations to canonical forms.
//   労安衛法 → 安衛法
//   労安衛則 → 安衛則
//   労安衛   → 安衛   (catch-all for compound terms; only when adjacent to other 法/則/令)
//   労安法   → 安衛法 (already handled but re-run for safety)
//   労安則   → 安衛則
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");

const SCAN_ROOTS = ["web/src", "web/scripts/audit-2026-05-17"]; // exclude self
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build", "coverage"]);
const EXTS = new Set([".ts", ".tsx", ".js", ".mjs", ".md", ".mdx", ".json"]);

const REPLACEMENTS = [
  // Order matters: longer match first.
  [/労安衛法/g, "安衛法"],
  [/労安衛則/g, "安衛則"],
  [/労安法/g, "安衛法"],
  [/労安則/g, "安衛則"],
];

function* walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      yield* walk(full);
    } else {
      const ext = path.extname(e.name);
      if (EXTS.has(ext)) yield full;
    }
  }
}

let totalFiles = 0;
let totalSubs = 0;
const changed = [];
for (const root of SCAN_ROOTS) {
  const abs = path.join(repoRoot, root);
  if (!fs.existsSync(abs)) continue;
  for (const fp of walk(abs)) {
    // Skip audit script outputs and self
    if (fp.includes(path.sep + "audit-2026-05-17" + path.sep)) continue;
    let text = fs.readFileSync(fp, "utf8");
    let subs = 0;
    for (const [re, to] of REPLACEMENTS) {
      text = text.replace(re, () => { subs++; return to; });
    }
    if (subs > 0) {
      fs.writeFileSync(fp, text, "utf8");
      changed.push({ file: path.relative(repoRoot, fp).replaceAll("\\", "/"), subs });
      totalSubs += subs;
    }
    totalFiles++;
  }
}

console.log(`Files scanned: ${totalFiles}`);
console.log(`Files changed: ${changed.length}`);
console.log(`Total substitutions: ${totalSubs}`);
for (const c of changed) console.log(`  ${c.file} (${c.subs})`);
