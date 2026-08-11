#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDirectory, "..", "..");
const repoRoot = path.resolve(webRoot, "..");
const includeBuild = process.argv.includes("--include-build");

const excludedDirectories = new Set([
  ".git",
  ".cache",
  ".next",
  ".vercel",
  "node_modules",
  "dist",
  "test-results",
  "playwright-report",
  "playwright-report-safety",
]);

const textExtensions = new Set([
  ".cjs",
  ".css",
  ".csv",
  ".html",
  ".js",
  ".json",
  ".jsonl",
  ".jsx",
  ".md",
  ".mjs",
  ".ps1",
  ".py",
  ".rss",
  ".sh",
  ".svg",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
]);

const privateRegistration = ["260", "022"].join("");
const privateFamilyName = String.fromCodePoint(0x91d1, 0x7530);
const privateFullName = String.fromCodePoint(0x91d1, 0x7530, 0x7fa9, 0x592a);
const privateWindowsUser = ["ka", "net"].join("");
const privateRomanizedName = ["ka", "neta", "-", "yoshita"].join("");
const privateEmailLocal = ["ken", "shi", ".y", "cc"].join("");
const privateEmailDomain = ["gm", "ail", ".com"].join("");
const privateEmail = [privateEmailLocal, privateEmailDomain].join("@");
const personalOperation = String.fromCodePoint(0x500b, 0x4eba, 0x904b, 0x55b6);
const personalDevelopment = String.fromCodePoint(0x500b, 0x4eba, 0x958b, 0x767a);
const operatorPersonal = String.fromCodePoint(0x904b, 0x55b6, 0x8005, 0x500b, 0x4eba);
const personalProject = String.fromCodePoint(
  0x500b,
  0x4eba,
  0x30d7,
  0x30ed,
  0x30b8,
  0x30a7,
  0x30af,
  0x30c8,
);

const globalForbidden = [
  ["private registration number", privateRegistration],
  ["private full name", privateFullName],
  ["private family name", privateFamilyName],
  ["private romanized name", privateRomanizedName],
  ["private email", privateEmail],
];

const publicNarrativeForbidden = [
  ["personal-operation narrative", personalOperation],
  ["personal-development narrative", personalDevelopment],
  ["operator-personal narrative", operatorPersonal],
  ["personal-project narrative", personalProject],
];

const findings = [];
const counts = {
  textFiles: 0,
  publicRuntimeFiles: 0,
  officeFiles: 0,
  officeEntries: 0,
  publicImages: 0,
  pdfFiles: 0,
  pdfPages: 0,
  buildFiles: 0,
};

function repoPath(file) {
  return path.relative(repoRoot, file).replaceAll("\\", "/");
}

function record(file, rule, detail = "") {
  findings.push({ file: repoPath(file), rule, detail });
}

function walk(directory, { includeExcluded = false } = {}) {
  if (!existsSync(directory)) return [];
  const output = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (
      entry.isDirectory() &&
      !includeExcluded &&
      excludedDirectories.has(entry.name)
    ) {
      continue;
    }
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walk(fullPath, { includeExcluded }));
    else if (entry.isFile()) output.push(fullPath);
  }
  return output;
}

function isPublicRuntime(file) {
  const relative = repoPath(file);
  return (
    relative.startsWith("web/src/") &&
    !relative.includes("/admin/") &&
    !/\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(relative)
  );
}

function scanText(file, text, { publicRuntime = false, buildArtifact = false } = {}) {
  for (const [label, needle] of globalForbidden) {
    if (text.includes(needle)) record(file, label);
  }
  const windowsUserPattern = new RegExp(`\\b${privateWindowsUser}\\b`, "iu");
  if (windowsUserPattern.test(text)) record(file, "private Windows username");

  const absoluteUserPath = /[A-Za-z]:(?:\\{1,2}|\/)Users(?:\\{1,2}|\/)[^\\/\s"'<>|]+/iu;
  const encodedUserPath = /[A-Za-z]--Users-[A-Za-z0-9._-]+/iu;
  if (absoluteUserPath.test(text) || encodedUserPath.test(text)) {
    record(file, "absolute user-local path");
  }

  if (publicRuntime || buildArtifact) {
    for (const [label, needle] of publicNarrativeForbidden) {
      if (text.includes(needle)) record(file, label);
    }
  }

  if (
    (publicRuntime || buildArtifact) &&
    /["']@type["']\s*:\s*["']Person["']/u.test(text)
  ) {
    record(file, "Person structured-data node");
  }
}

function walkBuild(directory) {
  if (!existsSync(directory)) return [];
  const output = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (
      entry.isDirectory() &&
      ["cache", "dev", "node_modules"].includes(entry.name)
    ) {
      continue;
    }
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walkBuild(fullPath));
    else if (entry.isFile()) output.push(fullPath);
  }
  return output;
}

function findEndOfCentralDirectory(buffer) {
  const signature = 0x06054b50;
  const minimum = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minimum; offset -= 1) {
    if (buffer.readUInt32LE(offset) === signature) return offset;
  }
  throw new Error("ZIP end-of-central-directory record not found");
}

function readZipEntries(buffer) {
  const eocd = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(eocd + 10);
  let centralOffset = buffer.readUInt32LE(eocd + 16);
  const entries = [];

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(centralOffset) !== 0x02014b50) {
      throw new Error("Invalid ZIP central-directory header");
    }
    const method = buffer.readUInt16LE(centralOffset + 10);
    const compressedSize = buffer.readUInt32LE(centralOffset + 20);
    const filenameLength = buffer.readUInt16LE(centralOffset + 28);
    const extraLength = buffer.readUInt16LE(centralOffset + 30);
    const commentLength = buffer.readUInt16LE(centralOffset + 32);
    const localOffset = buffer.readUInt32LE(centralOffset + 42);
    const name = buffer
      .subarray(centralOffset + 46, centralOffset + 46 + filenameLength)
      .toString("utf8");

    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error(`Invalid ZIP local header: ${name}`);
    }
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
    let data;
    if (method === 0) data = compressed;
    else if (method === 8) data = inflateRawSync(compressed);
    else throw new Error(`Unsupported ZIP compression method ${method}: ${name}`);
    entries.push({ name, data });
    centralOffset += 46 + filenameLength + extraLength + commentLength;
  }
  return entries;
}

function scanOffice(file) {
  counts.officeFiles += 1;
  let entries;
  try {
    entries = readZipEntries(readFileSync(file));
  } catch (error) {
    record(file, "Office ZIP parse failure", String(error));
    return;
  }
  counts.officeEntries += entries.length;

  for (const entry of entries) {
    if (entry.data.length > 20 * 1024 * 1024) continue;
    const text = entry.data.toString("utf8");
    for (const [label, needle] of globalForbidden) {
      if (text.includes(needle)) record(file, label, entry.name);
    }
    for (const [label, needle] of publicNarrativeForbidden) {
      if (text.includes(needle)) record(file, label, entry.name);
    }
    if (entry.name === "docProps/core.xml") {
      if (!/<dc:creator[^>]*>安全AIポータル編集部<\/dc:creator>/u.test(text)) {
        record(file, "Office core metadata lacks editorial identity", entry.name);
      }
      if (
        !/<cp:lastModifiedBy[^>]*>安全AIポータル編集部<\/cp:lastModifiedBy>/u.test(
          text,
        )
      ) {
        record(file, "Office last-modified metadata lacks editorial identity", entry.name);
      }
      if (!text.includes("労働安全コンサルタント監修")) {
        record(file, "Office core metadata lacks supervision label", entry.name);
      }
    }
    if (entry.name === "docProps/app.xml") {
      const company = /<Company[^>]*>(.*?)<\/Company>/u.exec(text)?.[1]?.trim() ?? "";
      if (company && company !== "安全AIポータル編集部") {
        record(file, "Office company metadata is not anonymous", entry.name);
      }
    }
  }
}

async function scanPdf(file) {
  counts.pdfFiles += 1;
  try {
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loadingTask = getDocument({
      data: new Uint8Array(readFileSync(file)),
      isEvalSupported: false,
      useWorkerFetch: false,
    });
    const document = await loadingTask.promise;
    const metadata = await document.getMetadata().catch(() => null);
    const chunks = [metadata ? JSON.stringify(metadata) : ""];
    counts.pdfPages += document.numPages;
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      chunks.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
    }
    const text = chunks.join("\n");
    scanText(file, text);
    for (const [label, needle] of publicNarrativeForbidden) {
      if (text.includes(needle)) record(file, label);
    }
    await loadingTask.destroy();
  } catch (error) {
    record(file, "PDF parse failure", String(error));
  }
}

function scanImageMetadata(file) {
  counts.publicImages += 1;
  const buffer = readFileSync(file);
  const extension = path.extname(file).toLowerCase();
  const latin = buffer.toString("latin1");
  if (extension === ".jpg" || extension === ".jpeg") {
    if (latin.includes("Exif\u0000\u0000") || latin.includes("http://ns.adobe.com/xap/1.0/")) {
      record(file, "embedded JPEG EXIF/XMP metadata");
    }
  } else if (extension === ".webp") {
    if (latin.includes("EXIF") || latin.includes("XMP ")) {
      record(file, "embedded WebP EXIF/XMP metadata");
    }
  } else if (extension === ".png") {
    if (latin.includes("eXIf") || latin.includes("XML:com.adobe.xmp")) {
      record(file, "embedded PNG EXIF/XMP metadata");
    }
  }
  scanText(file, buffer.toString("utf8"));
}

for (const file of walk(repoRoot)) {
  const extension = path.extname(file).toLowerCase();
  if (extension === ".pptx") {
    scanOffice(file);
    continue;
  }
  if (extension === ".pdf") {
    await scanPdf(file);
    continue;
  }
  if (textExtensions.has(extension) || path.basename(file) === "Dockerfile") {
    counts.textFiles += 1;
    const publicRuntime = isPublicRuntime(file);
    if (publicRuntime) counts.publicRuntimeFiles += 1;
    scanText(file, readFileSync(file, "utf8"), { publicRuntime });
  }
}

const publicSeminarDirectory = path.join(webRoot, "public", "seminars");
const publicSeminarFiles = existsSync(publicSeminarDirectory)
  ? readdirSync(publicSeminarDirectory).filter((name) => name.endsWith(".pptx"))
  : [];
if (publicSeminarFiles.length !== 12) {
  record(publicSeminarDirectory, "expected 12 anonymized public seminar decks", String(publicSeminarFiles.length));
}
const seminarTemplate = path.join(repoRoot, "templates", "seminar-template.pptx");
if (!existsSync(seminarTemplate)) {
  record(seminarTemplate, "anonymized seminar template is missing");
}

for (const file of walk(path.join(webRoot, "public"))) {
  if ([".png", ".jpg", ".jpeg", ".webp"].includes(path.extname(file).toLowerCase())) {
    scanImageMetadata(file);
  }
}

if (includeBuild) {
  const buildRoot = path.join(webRoot, ".next");
  const buildFiles = [
    ...walkBuild(path.join(buildRoot, "server")),
    ...walkBuild(path.join(buildRoot, "static")),
    ...walkBuild(path.join(buildRoot, "types")),
    ...(existsSync(buildRoot)
      ? readdirSync(buildRoot, { withFileTypes: true })
          .filter(
            (entry) =>
              entry.isFile() &&
              /(?:build|routes|prerender|react-loadable|server-reference|images)-manifest\.(?:js|json)$/u.test(
                entry.name,
              ),
          )
          .map((entry) => path.join(buildRoot, entry.name))
      : []),
  ];
  for (const file of new Set(buildFiles)) {
    const stats = statSync(file);
    if (stats.size > 25 * 1024 * 1024) continue;
    counts.buildFiles += 1;
    scanText(file, readFileSync(file).toString("utf8"), { buildArtifact: true });
  }
}

if (findings.length > 0) {
  process.stderr.write("public identity guard failed\n");
  for (const finding of findings) {
    process.stderr.write(
      `- ${finding.file}: ${finding.rule}${finding.detail ? ` (${finding.detail})` : ""}\n`,
    );
  }
  process.exitCode = 1;
} else {
  process.stdout.write(`public identity guard passed ${JSON.stringify(counts)}\n`);
}
