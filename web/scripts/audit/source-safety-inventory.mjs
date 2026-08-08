#!/usr/bin/env node

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const webRoot = process.cwd();
const evidenceRoot = process.env.SOURCE_SAFETY_EVIDENCE_ROOT
  ? resolve(process.env.SOURCE_SAFETY_EVIDENCE_ROOT)
  : resolve(
      webRoot,
      "../docs/audits/evidence/best-in-class-resume-2026-07-26/privacy",
    );
mkdirSync(evidenceRoot, { recursive: true });

const roots = ["src", "scripts"].map((path) => resolve(webRoot, path));
const readableExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const ignoredPath = /(?:^|[\\/])(?:node_modules|\.next|generated)(?:[\\/]|$)/u;

function extension(path) {
  const index = path.lastIndexOf(".");
  return index < 0 ? "" : path.slice(index);
}

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = resolve(directory, name);
    if (ignoredPath.test(path)) return [];
    const stats = statSync(path);
    if (stats.isDirectory()) return walk(path);
    return readableExtensions.has(extension(path)) ? [path] : [];
  });
}

function location(file, line) {
  return {
    file: relative(webRoot, file).replaceAll("\\", "/"),
    line,
  };
}

const secretLiteralCandidates = [];
const piiLoggingCandidates = [];
const analyticsPiiCandidates = [];
const externalAiPaths = [];
const externalDataPaths = [];
const prohibitedClaimCandidates = [];

for (const file of roots.flatMap(walk)) {
  if (file === resolve(webRoot, "scripts/audit/source-safety-inventory.mjs")) {
    continue;
  }
  const source = readFileSync(file, "utf8");
  const isTest = /\.(?:test|spec)\.[jt]sx?$/u.test(file);
  const lines = source.split(/\r?\n/u);
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const secret = /\b(api[_-]?key|secret|token|password)\b\s*[:=]\s*["'][^"'${}\s]{12,}["']/iu.exec(
      line,
    );
    if (secret && !isTest) {
      secretLiteralCandidates.push({
        ...location(file, lineNumber),
        identifier: secret[1]?.toLowerCase() ?? "credential",
      });
    }

    if (
      /\b(?:console\.(?:log|info|warn|error)|logger\.\w+)\s*\(/u.test(line) &&
      /\b(?:email|name|company|message|body|health|medical|consultation)\b|氏名|会社名|相談本文|健康情報/iu.test(
        line,
      )
    ) {
      piiLoggingCandidates.push(location(file, lineNumber));
    }

    if (
      /\b(?:track|analytics|gtag|sendEvent|capture)\s*\(/iu.test(line) &&
      /\b(?:email|name|company|message|body|health|medical|consultation)\b|氏名|会社名|相談本文|健康情報/iu.test(
        line,
      )
    ) {
      analyticsPiiCandidates.push(location(file, lineNumber));
    }

    if (
      /\b(?:openai|gemini|anthropic|generateContent|chat\.completions)\b/iu.test(
        line,
      ) &&
      !isTest
    ) {
      externalAiPaths.push(location(file, lineNumber));
    }

    if (
      /\bfetch\s*\(/u.test(line) &&
      /https?:\/\/|process\.env|new URL/iu.test(line) &&
      !isTest
    ) {
      externalDataPaths.push(location(file, lineNumber));
    }

    if (
      /CREATE-SIMPLE.{0,50}(?:互換|準拠|同等)|(?:互換|準拠|同等).{0,50}CREATE-SIMPLE|競合.{0,12}一位|業界.{0,12}一位|公式より上|必ず防げる|完全収録|全件収録/iu.test(
        line,
      ) &&
      !/(?:保証しない|ではない|禁止|検知|not\.to|否定)/u.test(line) &&
      !isTest
    ) {
      prohibitedClaimCandidates.push(location(file, lineNumber));
    }
  });
}

const unique = (items) => [
  ...new Map(items.map((item) => [`${item.file}:${item.line}`, item])).values(),
];
const report = {
  generatedAt: new Date().toISOString(),
  privacy:
    "秘密候補・PII候補の値や行内容は保存せず、ファイルと行番号だけを記録する。",
  secretLiteralCandidates: unique(secretLiteralCandidates),
  piiLoggingCandidates: unique(piiLoggingCandidates),
  analyticsPiiCandidates: unique(analyticsPiiCandidates),
  externalAiPaths: unique(externalAiPaths),
  externalDataPaths: unique(externalDataPaths),
  prohibitedClaimCandidates: unique(prohibitedClaimCandidates),
};
const blocking =
  report.secretLiteralCandidates.length +
  report.analyticsPiiCandidates.length +
  report.prohibitedClaimCandidates.length;
const result = { ...report, blockingCandidateCount: blocking, passed: blocking === 0 };
const reportPath = resolve(evidenceRoot, "source-safety-inventory.json");
writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
process.stdout.write(
  `${JSON.stringify(
    {
      reportPath,
      secretLiteralCandidates: report.secretLiteralCandidates.length,
      piiLoggingCandidates: report.piiLoggingCandidates.length,
      analyticsPiiCandidates: report.analyticsPiiCandidates.length,
      externalAiPaths: report.externalAiPaths.length,
      externalDataPaths: report.externalDataPaths.length,
      prohibitedClaimCandidates: report.prohibitedClaimCandidates.length,
      passed: result.passed,
    },
    null,
    2,
  )}\n`,
);
if (!result.passed) process.exitCode = 1;
