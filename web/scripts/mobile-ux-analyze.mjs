#!/usr/bin/env node
/**
 * Analyze the mobile UX audit JSON.
 *
 * Outputs:
 *   - aggregate counts by issue kind
 *   - per-issue priority (P0/P1/P2/P3) using counts × severity rubric
 *   - top offending pages per kind
 *   - before/after diff if both files are present
 */
import fs from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.resolve("audit-out");

const SEVERITY = {
  horizontalScroll: "P0",
  modalOverflow: "P0",
  hamburgerMissing: "P0",
  tinyTap: "P1",
  smallFont: "P1",
  tableOverflow: "P1",
  missingInputmode: "P1",
  stickyHeaderTooTall: "P2",
  missingFooter: "P2",
  missingImageDimensions: "P3",
};

const PRIORITY_RANK = { P0: 0, P1: 1, P2: 2, P3: 3 };

async function load(suffix) {
  const fp = path.join(OUT_DIR, `audit-${suffix}.json`);
  try {
    return JSON.parse(await fs.readFile(fp, "utf8"));
  } catch {
    return null;
  }
}

function summarize(report) {
  const byKind = {};
  const byKindByPage = {};
  const byPage = {};
  const byViewport = {};
  for (const run of report.runs) {
    byViewport[run.viewport] ||= { total: 0, issues: 0, pages: 0 };
    byViewport[run.viewport].total++;
    byViewport[run.viewport].issues += run.issues.length;
    if (run.issues.length > 0) byViewport[run.viewport].pages++;
    byPage[run.url] ||= 0;
    byPage[run.url] += run.issues.length;
    for (const iss of run.issues) {
      byKind[iss.kind] ||= { count: 0, samples: 0 };
      byKind[iss.kind].count++;
      if ("count" in iss) byKind[iss.kind].samples += iss.count;
      byKindByPage[iss.kind] ||= {};
      byKindByPage[iss.kind][run.url] ||= 0;
      byKindByPage[iss.kind][run.url]++;
    }
  }
  return { byKind, byKindByPage, byPage, byViewport };
}

function formatTable(rows) {
  if (rows.length === 0) return "(none)";
  const cols = Object.keys(rows[0]);
  const widths = cols.map((c) => Math.max(c.length, ...rows.map((r) => String(r[c] ?? "").length)));
  const fmt = (row) => cols.map((c, i) => String(row[c] ?? "").padEnd(widths[i])).join("  ");
  const header = fmt(Object.fromEntries(cols.map((c) => [c, c])));
  return [header, fmt(Object.fromEntries(cols.map((c, i) => [c, "-".repeat(widths[i])]))), ...rows.map(fmt)].join("\n");
}

const before = await load("before");
const after = await load("after");
if (!before) {
  console.error("Missing audit-out/audit-before.json");
  process.exit(1);
}

const beforeSum = summarize(before);

console.log("=== BEFORE summary ===");
console.log(`runs: ${before.runs.length}, viewports: ${Object.keys(beforeSum.byViewport).join(", ")}`);
console.log("");
console.log("Issues by viewport:");
console.log(
  formatTable(
    Object.entries(beforeSum.byViewport).map(([vp, v]) => ({
      viewport: vp,
      pages_with_issues: v.pages,
      total_issues: v.issues,
      total_runs: v.total,
    }))
  )
);
console.log("");
console.log("Issues by kind (count = (page,viewport) pairs affected, samples = item-level):");
const kindRows = Object.entries(beforeSum.byKind)
  .map(([k, v]) => ({ kind: k, priority: SEVERITY[k] || "P3", affected: v.count, samples: v.samples }))
  .sort(
    (a, b) =>
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.affected - a.affected
  );
console.log(formatTable(kindRows));
console.log("");

console.log("Top 15 pages by total issue count:");
const pageRows = Object.entries(beforeSum.byPage)
  .map(([url, n]) => ({ url, issues: n }))
  .sort((a, b) => b.issues - a.issues)
  .slice(0, 15);
console.log(formatTable(pageRows));
console.log("");

console.log("Top affected pages per kind:");
for (const kind of Object.keys(beforeSum.byKindByPage)) {
  const entries = Object.entries(beforeSum.byKindByPage[kind])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  console.log(`  ${kind} (${SEVERITY[kind] || "P3"}):`);
  for (const [url, n] of entries) {
    console.log(`    ${n} viewports → ${url}`);
  }
}

if (after) {
  const afterSum = summarize(after);
  console.log("\n=== AFTER summary ===");
  console.log(`runs: ${after.runs.length}`);
  console.log("");
  console.log("Diff by kind (BEFORE → AFTER, delta):");
  const allKinds = new Set([...Object.keys(beforeSum.byKind), ...Object.keys(afterSum.byKind)]);
  const diffRows = [];
  for (const kind of allKinds) {
    const b = beforeSum.byKind[kind]?.count || 0;
    const a = afterSum.byKind[kind]?.count || 0;
    diffRows.push({
      kind,
      priority: SEVERITY[kind] || "P3",
      before: b,
      after: a,
      delta: a - b,
    });
  }
  diffRows.sort(
    (x, y) => PRIORITY_RANK[x.priority] - PRIORITY_RANK[y.priority] || (y.before - y.after) - (x.before - x.after)
  );
  console.log(formatTable(diffRows));
}
