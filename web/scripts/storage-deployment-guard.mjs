#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { lstatSync, readdirSync } from "node:fs";
import path from "node:path";

const MIB = 1024 * 1024;
const MAX_NEW_TRACKED = 5 * MIB;
const MAX_SINGLE_FILE = 100 * MIB;
const MAX_NON_RUNTIME_MEDIA_COUNT = 125;
const MAX_NON_RUNTIME_MEDIA_BYTES = 20 * MIB;

const LARGE_RUNTIME_PREFIXES = [
  "data/",
  "web/src/data/",
  "web/prisma/",
  "web/src/fixtures/",
  "web/src/__fixtures__/",
  "web/test/fixtures/",
  "web/tests/fixtures/",
  "web/e2e/fixtures/",
];
const PUBLIC_RUNTIME_MEDIA_SUFFIXES = new Set([
  ".ico", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp",
  ".avif", ".mp4", ".webm", ".woff", ".woff2", ".ttf",
]);
const PUBLIC_RUNTIME_EXACT_PATHS = new Set([
  "web/public/ads.txt",
  "web/public/offline.html",
  "web/public/print.css",
  "web/public/sw.js",
  "web/public/manifest.json",
  "web/public/screenshots/manifest.json",
  "web/public/geo/japan-prefectures-ne10m.json",
]);
const REVIEWED_FALL_PREVENTION_PREFIX =
  "web/public/training/safety-seminars/fall-prevention/";
const REVIEWED_FALL_PREVENTION_DOWNLOAD_SUFFIXES = new Set([".pdf", ".pptx"]);
const COMPACT_EVIDENCE_FILES = new Set([
  "README.md",
  "manifest.json",
  "checksum-manifest.json",
  "independent-review.md",
  "quality-gates-automated.json",
  "preview-conversation-audit.json",
  "conversation-evaluation.json",
  "production-smoke.json",
  "external-boundary.json",
]);
const RAW_EVIDENCE_SUFFIXES = new Set([
  ".har", ".html", ".log", ".trace", ".zip", ".gz", ".tgz",
  ".mp4", ".webm", ".png", ".jpg", ".jpeg", ".gif", ".webp",
  ".jsonl", ".lcov",
]);
const MEDIA_OR_JSON_SUFFIXES = new Set([
  ".json", ".jsonl", ".png", ".jpg", ".jpeg", ".gif", ".webp",
  ".avif", ".svg",
]);
const GENERATED_SEGMENTS = new Set([
  ".next", "out", "build", "dist", "coverage", "test-results",
  "playwright-report", "audit-out", ".turbo", ".cache", "lighthouse-raw",
  "lighthouse-trace", "lighthouse-results", ".lighthouseci", "trace",
  "traces", "videos", "tmp", ".tmp", "benchmark-output",
  ".benchmark-output", ".bench", ".genquality", ".local-evidence",
  ".ci-performance-evidence", ".maintenance-snapshots", "local-snapshots",
  "logs",
]);

function suffixOf(filePath) {
  return path.posix.extname(filePath).toLowerCase();
}

function isPublicRuntimeAllowed(filePath) {
  if (!filePath.startsWith("web/public/")) return false;
  const suffix = suffixOf(filePath);
  const seminarRelative = filePath.slice("web/public/seminars/".length);
  const directSeminarPptx = filePath.startsWith("web/public/seminars/")
    && !seminarRelative.includes("/")
    && suffix === ".pptx";
  const fallPreventionRelative = filePath.startsWith(REVIEWED_FALL_PREVENTION_PREFIX)
    ? filePath.slice(REVIEWED_FALL_PREVENTION_PREFIX.length)
    : "";
  const directFallPreventionAudio = fallPreventionRelative.startsWith("audio/")
    && !fallPreventionRelative.slice("audio/".length).includes("/")
    && /^slide-\d{2}\.mp3$/u.test(fallPreventionRelative.slice("audio/".length));
  const directFallPreventionDownload = fallPreventionRelative.startsWith("downloads/")
    && !fallPreventionRelative.slice("downloads/".length).includes("/")
    && REVIEWED_FALL_PREVENTION_DOWNLOAD_SUFFIXES.has(suffix);
  return PUBLIC_RUNTIME_MEDIA_SUFFIXES.has(suffix)
    || PUBLIC_RUNTIME_EXACT_PATHS.has(filePath)
    || directSeminarPptx
    || directFallPreventionAudio
    || directFallPreventionDownload;
}

function isRuntimeAllowed(filePath) {
  if (filePath.startsWith("web/public/")) return isPublicRuntimeAllowed(filePath);
  return LARGE_RUNTIME_PREFIXES.some((prefix) => filePath.startsWith(prefix));
}

function isGeneratedArtifact(filePath) {
  const parts = filePath.split("/");
  if (parts.includes("node_modules")) return true;
  if (parts.some((part, index) => part === ".vercel" && parts[index + 1] === "output")) {
    return true;
  }
  if (parts.includes("screenshots") && !filePath.startsWith("web/public/screenshots/")) {
    return true;
  }
  const rootIndex = parts[0] === "web" ? 1 : 0;
  const generatedRoot = parts[rootIndex] ?? "";
  if (GENERATED_SEGMENTS.has(generatedRoot)) return true;
  if (/^(test-results|playwright-report|lighthouse-raw|lighthouse-trace)-.+/.test(generatedRoot)) {
    return true;
  }
  if ([".next", ".turbo", ".cache", ".local-evidence", ".ci-performance-evidence", ".maintenance-snapshots", "node_modules"]
    .some((part) => parts.includes(part))) {
    return true;
  }
  const basename = parts.at(-1) ?? "";
  return /\.(lhr\.json|har|lcov|trace|log|tmp)$/.test(filePath)
    || (basename.startsWith("lh5d-noimg") && basename.endsWith(".json"));
}

function isForbiddenAuditEvidence(filePath) {
  if (!filePath.startsWith("docs/audits/evidence/")) return false;
  const parts = filePath.split("/");
  const basename = parts.at(-1) ?? "";
  const rawDirectory = parts.some((part) => [
    "raw", "screenshots", "traces", "videos", "playwright-report",
    "test-results", "lighthouse-runs",
  ].includes(part));
  return rawDirectory
    || RAW_EVIDENCE_SUFFIXES.has(suffixOf(filePath))
    || !COMPACT_EVIDENCE_FILES.has(basename);
}

function fail(message) {
  process.stderr.write(`storage deployment guard: ${JSON.stringify(String(message))}\n`);
  process.exitCode = 1;
}

const committedTreeMode = process.argv.includes("--committed-tree");
const workspaceMode = process.argv.includes("--workspace");
if (committedTreeMode === workspaceMode) {
  fail("choose exactly one scan mode; deployment is blocked");
  process.exit();
}

let sourceRoot;
let trackedPaths;
let workspacePrefix = "";
const committedSizes = new Map();
if (committedTreeMode) {
  try {
    sourceRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    const raw = execFileSync("git", ["-C", sourceRoot, "ls-tree", "-r", "-l", "-z", "--full-tree", "HEAD"], {
      encoding: "buffer",
      maxBuffer: 64 * MIB,
      stdio: ["ignore", "pipe", "pipe"],
    });
    trackedPaths = [];
    let offset = 0;
    while (offset < raw.length) {
      const terminator = raw.indexOf(0, offset);
      if (terminator < 0) throw new Error("unterminated git tree entry");
      const entry = raw.subarray(offset, terminator);
      offset = terminator + 1;
      if (entry.length === 0) continue;
      const separator = entry.indexOf(9);
      if (separator < 0) throw new Error("git tree entry lacks a path separator");
      const header = entry.subarray(0, separator).toString("ascii").trim().split(/\s+/);
      const pathBytes = entry.subarray(separator + 1);
      const filePath = pathBytes.toString("utf8").replaceAll("\\", "/");
      if (!Buffer.from(filePath, "utf8").equals(pathBytes)) {
        throw new Error("git tree path is not valid UTF-8");
      }
      if (header.length !== 4) throw new Error("unexpected git tree entry format");
      const [mode, objectType, , rawSize] = header;
      if (!new Set(["100644", "100755"]).has(mode) || objectType !== "blob") {
        fail(`committed source is not a regular file: ${filePath} (mode ${mode}, type ${objectType})`);
        continue;
      }
      const size = Number(rawSize);
      if (!Number.isSafeInteger(size) || size < 0) throw new Error("invalid git blob size");
      trackedPaths.push(filePath);
      committedSizes.set(filePath, size);
    }
  } catch {
    fail("unable to enumerate committed HEAD objects; deployment is blocked");
    process.exit();
  }
} else {
  sourceRoot = process.cwd();
  workspacePrefix = path.basename(sourceRoot).toLowerCase() === "web" ? "web/" : "";
  const relativePaths = [];
  const excludedRoots = new Set([".git", ".next", ".vercel", "node_modules"]);
  const pending = [{ absolute: sourceRoot, relative: "" }];
  try {
    while (pending.length > 0) {
      const current = pending.pop();
      for (const entry of readdirSync(current.absolute, { withFileTypes: true })) {
        const relative = current.relative ? `${current.relative}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          if (!current.relative && excludedRoots.has(entry.name)) continue;
          pending.push({ absolute: path.join(current.absolute, entry.name), relative });
        } else {
          relativePaths.push(relative.replaceAll("\\", "/"));
        }
      }
    }
  } catch {
    fail("unable to enumerate the uploaded build workspace; deployment is blocked");
    process.exit();
  }
  trackedPaths = relativePaths.map((filePath) => `${workspacePrefix}${filePath}`);
}

if (!isPublicRuntimeAllowed("web/public/screenshots/runtime-guide.png")
  || !isPublicRuntimeAllowed("web/public/seminars/teiatsu-denki.pptx")
  || !isPublicRuntimeAllowed(`${REVIEWED_FALL_PREVENTION_PREFIX}audio/slide-01.mp3`)
  || !isPublicRuntimeAllowed(`${REVIEWED_FALL_PREVENTION_PREFIX}downloads/fall-prevention-training.pdf`)
  || !isPublicRuntimeAllowed(`${REVIEWED_FALL_PREVENTION_PREFIX}downloads/fall-prevention-training.pptx`)
  || isPublicRuntimeAllowed(`${REVIEWED_FALL_PREVENTION_PREFIX}audio/raw/slide-01.mp3`)
  || isPublicRuntimeAllowed("web/public/training/safety-seminars/another-theme/audio/slide-01.mp3")
  || isPublicRuntimeAllowed("web/public/seminars/raw/unreviewed.pptx")
  || isPublicRuntimeAllowed("web/public/prod.sqlite-wal")
  || isPublicRuntimeAllowed("web/public/database-backup")
  || !isGeneratedArtifact("web/test-results-probe/result.json")
  || isGeneratedArtifact("web/src/app/build/page.tsx")) {
  fail("classifier self-test failed; deployment is blocked");
}

let mediaCount = 0;
let mediaBytes = 0;
for (const filePath of trackedPaths) {
  let size;
  if (committedTreeMode) {
    size = committedSizes.get(filePath);
    if (!Number.isSafeInteger(size)) {
      fail(`committed blob size is unavailable: ${filePath}`);
      continue;
    }
  } else {
    try {
      const physicalPath = workspacePrefix
        ? filePath.slice(workspacePrefix.length)
        : filePath;
      const item = lstatSync(path.join(sourceRoot, ...physicalPath.split("/")));
      if (!item.isFile()) {
        fail(`tracked/deployed source is not a regular file: ${filePath}`);
        continue;
      }
      size = item.size;
    } catch {
      fail(`workspace file cannot be read: ${filePath}`);
      continue;
    }
  }

  if (isGeneratedArtifact(filePath)) {
    fail(`generated build/test artifact is tracked: ${filePath}`);
  }
  if (filePath.startsWith("web/public/") && !isPublicRuntimeAllowed(filePath)) {
    fail(`unreviewed file is present in public: ${filePath}`);
  }
  if (isForbiddenAuditEvidence(filePath)) {
    fail(`raw/non-current audit evidence is tracked: ${filePath}`);
  }
  if (size > MAX_SINGLE_FILE) {
    fail(`single file exceeds 100 MiB: ${filePath} (${size} bytes)`);
  } else if (size >= MAX_NEW_TRACKED && !isRuntimeAllowed(filePath)) {
    fail(`non-runtime tracked file exceeds 5 MiB: ${filePath} (${size} bytes)`);
  }
  if (MEDIA_OR_JSON_SUFFIXES.has(suffixOf(filePath)) && !isRuntimeAllowed(filePath)) {
    mediaCount += 1;
    mediaBytes += size;
  }
}

if (mediaCount > MAX_NON_RUNTIME_MEDIA_COUNT || mediaBytes > MAX_NON_RUNTIME_MEDIA_BYTES) {
  fail(`non-runtime JSON/image tree exceeds budget: ${mediaCount} files, ${mediaBytes} bytes`);
}

if (process.exitCode) process.exit();
process.stdout.write(
  `storage deployment guard passed (${committedTreeMode ? "committed" : "workspace"}): ${trackedPaths.length} files\n`,
);
