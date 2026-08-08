#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const webRoot = process.cwd();
const repoRoot = resolve(webRoot, "..");
const evidenceRoot = resolve(
  repoRoot,
  process.env.PERFORMANCE_RELEASE_EVIDENCE_ROOT ??
    "docs/audits/evidence/performance-release-resume-2026-07-26/baseline",
);

mkdirSync(evidenceRoot, { recursive: true });

function git(args) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${result.stderr || result.stdout}`,
    );
  }
  return result.stdout;
}

const status = git(["status", "--porcelain=v1", "-uall"]);
const untracked = git(["ls-files", "--others", "--exclude-standard"]);
const diffNameStatus = git(["diff", "--name-status"]);
const diffNumstat = git(["diff", "--numstat"]);
const diffStat = git(["diff", "--stat"]);
const shortStat = git(["diff", "--shortstat"]);
const branch = git(["branch", "--show-current"]).trim();
const head = git(["rev-parse", "HEAD"]).trim();
const statusLines = status.trimEnd().split(/\r?\n/u).filter(Boolean);
const trackedLines = statusLines.filter((line) => !line.startsWith("?? "));
const untrackedLines = statusLines.filter((line) => line.startsWith("?? "));
const stagedLines = trackedLines.filter((line) => line[0] !== " ");
const deletedLines = trackedLines.filter((line) => line.slice(0, 2).includes("D"));

for (const [name, content] of Object.entries({
  "git-status-porcelain.txt": status,
  "untracked-files.txt": untracked,
  "git-diff-name-status.txt": diffNameStatus,
  "git-diff-numstat.txt": diffNumstat,
  "git-diff-stat.txt": `${shortStat}${diffStat}`,
})) {
  writeFileSync(resolve(evidenceRoot, name), content, "utf8");
}

const summary = {
  generatedAt: new Date().toISOString(),
  branch,
  head,
  statusLineCount: statusLines.length,
  trackedStatusCount: trackedLines.length,
  untrackedCount: untrackedLines.length,
  stagedCount: stagedLines.length,
  deletedCount: deletedLines.length,
  diffFileCount: diffNumstat.trimEnd().split(/\r?\n/u).filter(Boolean).length,
  shortStat: shortStat.trim(),
  protectedExistingChanges: true,
};

writeFileSync(
  resolve(evidenceRoot, "baseline-summary.json"),
  `${JSON.stringify(summary, null, 2)}\n`,
  "utf8",
);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
