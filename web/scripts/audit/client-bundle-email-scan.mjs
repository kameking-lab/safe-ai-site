#!/usr/bin/env node

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const webRoot = process.cwd();
const chunksRoot = resolve(webRoot, ".next/static/chunks");
const evidenceRoot = process.env.CLIENT_BUNDLE_EMAIL_EVIDENCE_ROOT
  ? resolve(process.env.CLIENT_BUNDLE_EMAIL_EVIDENCE_ROOT)
  : resolve(
      webRoot,
      "../docs/audits/evidence/best-in-class-2026-07-24/privacy",
    );
mkdirSync(evidenceRoot, { recursive: true });

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = resolve(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

if (!statSync(chunksRoot).isDirectory()) {
  throw new Error("production build の .next/static/chunks がありません。");
}

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu;
const findings = walk(chunksRoot)
  .filter((path) => path.endsWith(".js"))
  .flatMap((path) => {
    const source = readFileSync(path, "utf8");
    const count = [...source.matchAll(emailPattern)].length;
    return count > 0
      ? [
          {
            file: relative(webRoot, path).replaceAll("\\", "/"),
            matchCount: count,
          },
        ]
      : [];
  });

const report = {
  generatedAt: new Date().toISOString(),
  scope: ".next/static/chunks/**/*.js",
  privacy: "一致文字列そのものは証跡・標準出力へ保存しない。",
  findingCount: findings.length,
  findings,
  passed: findings.length === 0,
};
const reportPath = resolve(evidenceRoot, "client-bundle-email-scan.json");
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(
  `${JSON.stringify(
    {
      reportPath,
      findingCount: findings.length,
      passed: report.passed,
    },
    null,
    2,
  )}\n`,
);
if (!report.passed) process.exitCode = 1;
