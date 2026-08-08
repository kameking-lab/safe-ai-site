#!/usr/bin/env node

/**
 * Builds one reviewer-friendly CSV from the three existing 46-claim packs.
 * It preserves all pending/blank approval fields and creates a deterministic
 * review snapshot hash. It does not fetch sources or manufacture approvals.
 */
import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(process.cwd(), "..");
const outputPath = resolve(
  repoRoot,
  "docs/audits/evidence/final-production-candidate-2026-07-27/heat-review/expert-claim-pack.csv",
);
const manifestPath = resolve(
  repoRoot,
  "docs/audits/evidence/final-production-candidate-2026-07-27/heat-review/expert-claim-pack-manifest.json",
);
const sourcePaths = [
  "docs/audits/heat-illness-legal-review-pack-2026-07-27.csv",
  "docs/audits/heat-illness-medical-review-pack-2026-07-27.csv",
  "docs/audits/heat-illness-editorial-review-pack-2026-07-27.csv",
];

function parseCsv(source) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value || row.length) {
    row.push(value.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function snapshotHash(record) {
  const stable = [
    record.claimId,
    record.previewRoute,
    record.screenLocation,
    record.displayCopy,
    record.sourceTitle,
    record.sourceDocumentNumber,
    record.sourceIssuer,
    record.sourceUrl,
    record.locator,
    record.sourceAcquiredAt,
    record.sourceHashStatus,
  ].join("\u001f");
  return createHash("sha256").update(stable, "utf8").digest("hex");
}

const records = [];
const inputHashes = {};
for (const relativePath of sourcePaths) {
  const absolutePath = resolve(repoRoot, relativePath);
  const source = readFileSync(absolutePath, "utf8");
  inputHashes[relativePath] = createHash("sha256")
    .update(source, "utf8")
    .digest("hex");
  const rows = parseCsv(source);
  const header = rows.shift();
  if (!header || header.length !== 21) {
    throw new Error(`${relativePath}: expected 21 columns`);
  }
  for (const columns of rows) {
    if (columns.length === 1 && !columns[0]) continue;
    if (columns.length !== 21) {
      throw new Error(
        `${relativePath}: expected 21 columns, got ${columns.length}`,
      );
    }
    const record = {
      claimId: columns[0],
      previewRoute: columns[1],
      screenLocation: columns[2],
      displayCopy: columns[3],
      sourceTitle: columns[8],
      sourceDocumentNumber: columns[9],
      sourceIssuer: columns[10],
      sourceUrl: columns[11],
      locator: columns[12],
      sourceAcquiredAt: columns[13],
      sourceHashStatus: columns[14],
      siteInterpretation: columns[15],
      correctedCopy: columns[18],
      publicDecision: columns[19] || "pending",
      indexDecision: columns[20] || "no",
    };
    records.push({
      ...record,
      reviewSnapshotSha256: snapshotHash(record),
    });
  }
}

if (records.length !== 46) {
  throw new Error(`expected 46 claims, got ${records.length}`);
}
if (new Set(records.map((record) => record.claimId)).size !== records.length) {
  throw new Error("claim IDs are not unique");
}
if (
  records.some(
    (record) =>
      record.publicDecision !== "pending" || record.indexDecision !== "no",
  )
) {
  throw new Error("approval boundary changed: expected public=pending/index=no");
}

const outputHeader = [
  "claim ID",
  "専門家previewルート",
  "画面位置",
  "表示文",
  "source copy / 一次資料名",
  "文書番号",
  "発行主体",
  "source URL",
  "locator",
  "取得日",
  "source hash状態",
  "review snapshot SHA-256",
  "サイトの解釈・安全境界",
  "法務確認欄",
  "医学確認欄",
  "編集確認欄",
  "コメント",
  "修正文",
  "承認・差戻し",
  "確認者",
  "確認日",
  "公開可否",
  "index可否",
];
const outputRows = records.map((record) => [
  record.claimId,
  record.previewRoute,
  record.screenLocation,
  record.displayCopy,
  record.sourceTitle,
  record.sourceDocumentNumber,
  record.sourceIssuer,
  record.sourceUrl,
  record.locator,
  record.sourceAcquiredAt,
  record.sourceHashStatus,
  record.reviewSnapshotSha256,
  record.siteInterpretation,
  "",
  "",
  "",
  "",
  record.correctedCopy,
  "pending",
  "",
  "",
  record.publicDecision,
  record.indexDecision,
]);
const output = [
  outputHeader.map(csvCell).join(","),
  ...outputRows.map((row) => row.map(csvCell).join(",")),
].join("\n");

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `\uFEFF${output}\n`, "utf8");
const outputSha256 = createHash("sha256")
  .update(`\uFEFF${output}\n`, "utf8")
  .digest("hex");
const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  claimCount: records.length,
  reviewerFieldsBlank: true,
  decisionStatus: "pending",
  publicStatus: "pending",
  indexStatus: "no",
  externalApprovalCreated: false,
  sourcePaths,
  inputHashes,
  outputPath: outputPath.replace(`${repoRoot}\\`, "").replaceAll("\\", "/"),
  outputSha256,
};
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(manifest)}\n`);
