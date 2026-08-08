#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { extname, relative, resolve } from "node:path";

const repoRoot = resolve(process.cwd(), "..");
const evidenceRoot = process.env.TRUST_BOUNDARY_EVIDENCE_ROOT
  ? resolve(process.env.TRUST_BOUNDARY_EVIDENCE_ROOT)
  : resolve(
      repoRoot,
      "docs/audits/evidence/best-in-class-resume-2026-07-26/trust-boundaries",
    );
mkdirSync(evidenceRoot, { recursive: true });

const scanRoots = [
  resolve(repoRoot, "web/src"),
  resolve(repoRoot, "web/scripts"),
  resolve(repoRoot, "scripts"),
  resolve(repoRoot, ".github"),
];
const allowedExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".yml",
  ".yaml",
]);
const excludedSegments = new Set([
  ".git",
  ".next",
  "node_modules",
  "coverage",
  "playwright-report",
  "test-results",
]);

function walk(path) {
  if (!statSync(path).isDirectory()) return [path];
  const files = [];
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (excludedSegments.has(entry.name)) continue;
    const target = resolve(path, entry.name);
    if (entry.isDirectory()) files.push(...walk(target));
    else if (allowedExtensions.has(extname(entry.name))) files.push(target);
  }
  return files;
}

function repoPath(path) {
  return relative(repoRoot, path).replaceAll("\\", "/");
}

function lineNumber(text, index) {
  return text.slice(0, index).split("\n").length;
}

function isTestPath(path) {
  return /(?:^|\/)(?:e2e|test|tests)(?:\/|$)|\.(?:test|spec)\.[^.]+$/.test(path);
}

const secretPatterns = [
  { id: "private-key", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { id: "aws-access-key", regex: /\bAKIA[0-9A-Z]{16}\b/g },
  { id: "google-api-key", regex: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { id: "github-token", regex: /\bgh[pousr]_[0-9A-Za-z]{36,255}\b/g },
  { id: "stripe-secret", regex: /\bsk_(?:live|test)_[0-9A-Za-z]{20,}\b/g },
  { id: "slack-token", regex: /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/g },
];
const piiTerms =
  /(?:\b(?:email|e-mail|mailAddress|fullName|userName|company|phone|medical|prompt|question|query|requestBody)\b|相談本文|相談内容|健康情報)/i;
const logCall = /\b(?:console\.(?:log|info|warn|error)|logger\.(?:info|warn|error|debug))\s*\((.*)/;
const analyticsCall = /\b(?:trackEvent|gtag|analytics\.)\s*\((.*)/;
const urlPattern = /https:\/\/[^\s"'`<>)\]}]+/g;
const aiPattern =
  /@google\/(?:genai|generative-ai)|GoogleGenAI|@ai-sdk|openai|generateContent|generativeModel|Gemini|GEMINI_API_KEY/i;

function expressionsOnly(value) {
  return value
    .replace(/(["'])(?:\\.|(?!\1).)*\1/g, "")
    .replace(/`([^`]*)`/g, (_match, body) =>
      [...body.matchAll(/\$\{([^}]*)\}/g)].map((entry) => entry[1]).join(" "),
    );
}

function containsSensitiveValue(value) {
  const expressions = expressionsOnly(value).replace(
    /\b(?:query|prompt|question|urlQuery|debouncedQuery)\s*\.\s*length\b/gi,
    "",
  );
  return piiTerms.test(expressions);
}

const files = [...new Set(scanRoots.flatMap(walk))].sort();
const secretCandidates = [];
const piiLogCandidates = [];
const sensitiveAnalyticsCandidates = [];
const externalUrls = [];
const aiFiles = [];

for (const file of files) {
  const path = repoPath(file);
  const text = readFileSync(file, "utf8");
  const test = isTestPath(path);

  for (const pattern of secretPatterns) {
    pattern.regex.lastIndex = 0;
    for (const match of text.matchAll(pattern.regex)) {
      secretCandidates.push({
        file: path,
        line: lineNumber(text, match.index ?? 0),
        pattern: pattern.id,
        // 値を証跡へ残さず、同一候補の突合用に不可逆digestだけを保持する。
        digest: createHash("sha256").update(match[0]).digest("hex").slice(0, 12),
        test,
      });
    }
  }

  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const log = logCall.exec(line);
    if (log && containsSensitiveValue(log[1])) {
      piiLogCandidates.push({
        file: path,
        line: index + 1,
        test,
        reason: "ログ呼出し引数にPII・自由入力を示す識別子候補",
      });
    }
    const analytics = analyticsCall.exec(line);
    if (analytics && containsSensitiveValue(analytics[1])) {
      sensitiveAnalyticsCandidates.push({
        file: path,
        line: index + 1,
        test,
        reason: "analytics呼出し引数に自由入力を示す識別子候補",
      });
    }
  });

  for (const match of text.matchAll(urlPattern)) {
    let hostname = "";
    try {
      hostname = new URL(match[0]).hostname;
    } catch {
      continue;
    }
    externalUrls.push({
      file: path,
      line: lineNumber(text, match.index ?? 0),
      url: match[0],
      hostname,
      test,
    });
  }
  if (aiPattern.test(text)) aiFiles.push({ file: path, test });
}

const uniqueExternal = [
  ...new Map(
    externalUrls.map((entry) => [
      `${entry.file}:${entry.line}:${entry.url}`,
      entry,
    ]),
  ).values(),
];
const productionPiiLogs = piiLogCandidates.filter((item) => !item.test);
const productionSensitiveAnalytics = sensitiveAnalyticsCandidates.filter(
  (item) => !item.test,
);
const productionAiFiles = aiFiles.filter((item) => !item.test);

const report = {
  generatedAt: new Date().toISOString(),
  scope: scanRoots.map(repoPath),
  filesScanned: files.length,
  policy: {
    secrets: "候補値は出力せず、file/line/pattern/digestのみを保存する。",
    pii:
      "静的候補であり、変数の由来を人手確認する。相談本文、氏名、メール、会社名、健康情報、prompt/queryをログ・analyticsへ送らない。",
    external:
      "文字列URLの棚卸し。実際の送信可否、server/client、同意、timeout、allowlistは個別routeで確認する。",
  },
  secretCandidates,
  piiLogCandidates,
  sensitiveAnalyticsCandidates,
  externalUrls: uniqueExternal,
  aiFiles,
  summary: {
    secretCandidateCount: secretCandidates.length,
    productionPiiLogCandidateCount: productionPiiLogs.length,
    productionSensitiveAnalyticsCandidateCount:
      productionSensitiveAnalytics.length,
    uniqueExternalUrlCount: uniqueExternal.length,
    externalHostCount: new Set(uniqueExternal.map((item) => item.hostname)).size,
    productionAiFileCount: productionAiFiles.length,
  },
};

const reportPath = resolve(evidenceRoot, "trust-boundary-inventory.json");
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(
  `${JSON.stringify({ reportPath, ...report.summary }, null, 2)}\n`,
);

if (
  secretCandidates.length > 0 ||
  productionPiiLogs.length > 0 ||
  productionSensitiveAnalytics.length > 0
) {
  process.exitCode = 1;
}
