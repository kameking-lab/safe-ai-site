#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd(), "..");
function option(name, fallback) {
  const prefix = `--${name}=`;
  const value = process.argv.slice(2).find((item) => item.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}
const outputDirectory = resolve(
  repoRoot,
  option(
    "output-dir",
    "docs/audits/evidence/post-launch-growth-operations-2026-07-29/heat-review",
  ),
);
const allowedEvidenceRoot = resolve(repoRoot, "docs/audits/evidence");
if (
  outputDirectory !== allowedEvidenceRoot &&
  !outputDirectory.startsWith(`${allowedEvidenceRoot}\\`) &&
  !outputDirectory.startsWith(`${allowedEvidenceRoot}/`)
) {
  throw new Error("--output-dir must stay under docs/audits/evidence");
}
const packs = [
  {
    path: "docs/audits/heat-illness-legal-review-pack-2026-07-29.csv",
    domain: "legal",
  },
  {
    path: "docs/audits/heat-illness-medical-review-pack-2026-07-29.csv",
    domain: "medical",
  },
  {
    path: "docs/audits/heat-illness-editorial-review-pack-2026-07-29.csv",
    domain: "editorial",
  },
];
const OFFICIAL_HOSTS = new Set([
  "laws.e-gov.go.jp",
  "www.mhlw.go.jp",
  "mhlw.go.jp",
  "neccyusho.mhlw.go.jp",
  "www.wbgt.env.go.jp",
  "wbgt.env.go.jp",
  "www.fdma.go.jp",
  "fdma.go.jp",
]);
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

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

function normalizedCopy(value) {
  return String(value).normalize("NFKC").replace(/\s+/g, "");
}

function safeRelativeSource(section) {
  const match = section.match(/source:\s*(.+\.(?:tsx|ts))/);
  if (!match) return null;
  const relative = match[1].trim().replaceAll("\\", "/");
  if (!relative.startsWith("web/src/") || relative.includes("..")) return null;
  return relative;
}

function readClaims() {
  const claims = [];
  for (const pack of packs) {
    const rows = parseCsv(readFileSync(resolve(repoRoot, pack.path), "utf8"));
    const header = rows.shift();
    if (!header || header.length !== 21) {
      throw new Error(`${pack.path}: unexpected CSV schema`);
    }
    for (const columns of rows) {
      if (columns.length === 1 && !columns[0]) continue;
      if (columns.length !== 21) {
        throw new Error(`${pack.path}: unexpected row width`);
      }
      claims.push({
        id: columns[0],
        page: columns[1],
        section: columns[2],
        displayCopy: columns[3],
        claimType: columns[4],
        sourceTitle: columns[8],
        documentNumber: columns[9],
        issuer: columns[10],
        sourceUrl: columns[11],
        locator: columns[12],
        previousRetrievedAt: columns[13],
        previousHash: columns[14],
        publicDecision: columns[19],
        indexDecision: columns[20],
        domain: pack.domain,
        sourceFile: safeRelativeSource(columns[2]),
      });
    }
  }
  return claims;
}

async function snapshotExternalSource(sourceUrl) {
  let target;
  try {
    target = new URL(sourceUrl);
  } catch {
    return { status: "invalid", httpStatus: null, sha256: null };
  }
  if (target.protocol !== "https:" || !OFFICIAL_HOSTS.has(target.hostname)) {
    return { status: "non-official-host", httpStatus: null, sha256: null };
  }
  try {
    const response = await fetch(target, {
      headers: {
        Accept: "text/html,application/pdf,text/plain;q=0.9,*/*;q=0.5",
        "User-Agent": "safe-ai-portal-source-audit/1.0",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    const finalUrl = new URL(response.url);
    if (!OFFICIAL_HOSTS.has(finalUrl.hostname)) {
      return {
        status: "redirected-official-boundary",
        httpStatus: response.status,
        sha256: null,
      };
    }
    if (!response.ok) {
      return {
        status: "http-error",
        httpStatus: response.status,
        finalUrl: finalUrl.toString(),
        sha256: null,
      };
    }
    const declaredLength = Number(response.headers.get("content-length") ?? "0");
    if (declaredLength > MAX_SOURCE_BYTES) {
      return {
        status: "too-large",
        httpStatus: response.status,
        finalUrl: finalUrl.toString(),
        sha256: null,
      };
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_SOURCE_BYTES) {
      return {
        status: "too-large",
        httpStatus: response.status,
        finalUrl: finalUrl.toString(),
        sha256: null,
      };
    }
    return {
      status: "retrieved",
      httpStatus: response.status,
      finalUrl: finalUrl.toString(),
      contentType: response.headers.get("content-type")?.split(";")[0] ?? null,
      byteLength: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      retrievedAt: new Date().toISOString(),
    };
  } catch {
    return {
      status: "network-unavailable",
      httpStatus: null,
      sha256: null,
    };
  }
}

const claims = readClaims();
if (claims.length !== 46 || new Set(claims.map((claim) => claim.id)).size !== 46) {
  throw new Error(`expected 46 unique claims, got ${claims.length}`);
}
if (
  claims.some(
    (claim) =>
      claim.publicDecision !== "pending" || claim.indexDecision !== "no",
  )
) {
  throw new Error("external approval boundary changed");
}

const externalUrls = [
  ...new Set(
    claims
      .map((claim) => claim.sourceUrl)
      .filter((url) => /^https:\/\//.test(url)),
  ),
];
const sourceEntries = await Promise.all(
  externalUrls.map(async (url) => [url, await snapshotExternalSource(url)]),
);
const sourceSnapshots = Object.fromEntries(sourceEntries);

const firstClaimForCopy = new Map();
const classifications = [];
for (const claim of claims) {
  let copyStatus = "source-file-unavailable";
  if (claim.sourceFile) {
    const sourcePath = resolve(repoRoot, claim.sourceFile);
    try {
      copyStatus = normalizedCopy(readFileSync(sourcePath, "utf8")).includes(
        normalizedCopy(claim.displayCopy),
      )
        ? "exact-match"
        : "claim-drift";
    } catch {
      copyStatus = "source-file-unavailable";
    }
  }

  const normalizedDisplayCopy = claim.displayCopy.normalize("NFKC").trim();
  const duplicateOf = firstClaimForCopy.get(normalizedDisplayCopy) ?? null;
  if (!duplicateOf) firstClaimForCopy.set(normalizedDisplayCopy, claim.id);

  const externalSnapshot = /^https:\/\//.test(claim.sourceUrl)
    ? sourceSnapshots[claim.sourceUrl]
    : null;
  let classification = `ready-for-${claim.domain}-review`;
  let reason = "display copy and review boundary are ready for external review";
  if (duplicateOf) {
    classification = "duplicate";
    reason = `same display copy as ${duplicateOf}`;
  } else if (copyStatus !== "exact-match") {
    classification = "needs-rewrite";
    reason = copyStatus;
  } else if (externalSnapshot && externalSnapshot.status !== "retrieved") {
    classification = "source-gap";
    reason = `official source snapshot: ${externalSnapshot.status}`;
  }

  classifications.push({
    claimId: claim.id,
    page: claim.page,
    domain: claim.domain,
    classification,
    reason,
    duplicateOf,
    displayCopyStatus: copyStatus,
    sourceUrl: claim.sourceUrl,
    sourceStatus: externalSnapshot?.status ?? "internal-source",
    sourceSha256: externalSnapshot?.sha256 ?? null,
    documentNumber: claim.documentNumber,
    issuer: claim.issuer,
    locator: claim.locator,
    externalApprovalCreated: false,
    publicDecision: "pending",
    indexDecision: "no",
  });
}

const allowedClassifications = new Set([
  "ready-for-legal-review",
  "ready-for-medical-review",
  "ready-for-editorial-review",
  "source-gap",
  "needs-rewrite",
  "duplicate",
  "out-of-scope",
]);
if (
  classifications.some(
    (claim) => !allowedClassifications.has(claim.classification),
  )
) {
  throw new Error("unexpected review classification");
}

const counts = Object.fromEntries(
  [...allowedClassifications].map((name) => [
    name,
    classifications.filter((claim) => claim.classification === name).length,
  ]),
);
const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  claimCount: classifications.length,
  counts,
  officialSourceCount: externalUrls.length,
  officialSourcesRetrieved: Object.values(sourceSnapshots).filter(
    (source) => source.status === "retrieved",
  ).length,
  claimDriftCount: classifications.filter(
    (claim) => claim.displayCopyStatus === "claim-drift",
  ).length,
  externalApprovalCreated: false,
  publicDecision: "pending",
  indexDecision: "no",
  sourceSnapshots,
  inputs: Object.fromEntries(
    packs.map((pack) => {
      const path = resolve(repoRoot, pack.path);
      return [
        pack.path,
        {
          byteLength: statSync(path).size,
          sha256: createHash("sha256")
            .update(readFileSync(path))
            .digest("hex"),
        },
      ];
    }),
  ),
};

const rows = [
  [
    "claim ID",
    "page",
    "domain",
    "classification",
    "reason",
    "duplicate of",
    "display copy status",
    "source URL",
    "source status",
    "source SHA-256",
    "document number",
    "issuer",
    "locator",
    "external approval created",
    "public decision",
    "index decision",
  ],
  ...classifications.map((claim) => [
    claim.claimId,
    claim.page,
    claim.domain,
    claim.classification,
    claim.reason,
    claim.duplicateOf,
    claim.displayCopyStatus,
    claim.sourceUrl,
    claim.sourceStatus,
    claim.sourceSha256,
    claim.documentNumber,
    claim.issuer,
    claim.locator,
    claim.externalApprovalCreated,
    claim.publicDecision,
    claim.indexDecision,
  ]),
];

mkdirSync(outputDirectory, { recursive: true });
writeFileSync(
  resolve(outputDirectory, "claim-review-readiness.csv"),
  `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`,
  "utf8",
);
writeFileSync(
  resolve(outputDirectory, "source-snapshot-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);
process.stdout.write(
  `${JSON.stringify({
    ok: manifest.claimDriftCount === 0,
    claimCount: manifest.claimCount,
    counts,
    officialSourceCount: manifest.officialSourceCount,
    officialSourcesRetrieved: manifest.officialSourcesRetrieved,
    externalApprovalCreated: false,
    outputDirectory,
  })}\n`,
);
