// Offline packaging only: no fetching, database writes or activation.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync, gunzipSync } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pin = JSON.parse(readFileSync(resolve(root, "src/data/legal-supplement-lab-manifest.json"), "utf8"));
const release = `five-law-${pin.asOf}-${pin.datasetSha256.slice(0, 12)}`;
const relativeFile = `src/data/legal-supplements/${release}.json.gz`;
const manifestFile = resolve(root, "src/data/legal-supplement-release.json");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const source = process.argv[2];
function validateData(bytes) {
  if (hash(bytes) !== pin.datasetSha256) throw new Error("source does not match reviewed dataset");
  const data = JSON.parse(bytes.toString("utf8"));
  if (data.schema !== "safe-ai-supplement-rag/v1" || data.asOf !== pin.asOf || data.documents.length !== pin.documentCount ||
    data.laws.length !== pin.laws.length || new Set(data.laws.map(law => law.lawId)).size !== pin.laws.length ||
    pin.laws.some(expected => !data.laws.some(law => law.lawId === expected.lawId && law.revisionId === expected.revisionId && law.xmlSha256 === expected.xmlSha256))) {
    throw new Error("source identity mismatch");
  }
  return data;
}
if (source && source !== "--check") {
  // Verify the exact old selection before writing anything. The old archive is
  // immutable; a new selection is an explicit, local-only review operation.
  const current = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, "utf8")) : undefined;
  if (current && (process.argv[3] !== "--replace-release" || process.argv[4] !== current.release)) {
    throw new Error("existing release: supply --replace-release with its exact ID");
  }
  const bytes = readFileSync(resolve(source));
  validateData(bytes);
  const packed = gzipSync(bytes, { level: 9 });
  const archive = resolve(root, relativeFile);
  mkdirSync(dirname(archive), { recursive: true });
  if (existsSync(archive)) {
    if (hash(readFileSync(archive)) !== hash(packed)) throw new Error("immutable archive already exists with different bytes");
  } else writeFileSync(archive, packed, { flag: "wx" });
  const temporary = `${manifestFile}.${process.pid}.tmp`;
  try {
    writeFileSync(temporary, `${JSON.stringify({ release, file: relativeFile, packedSha256: hash(packed), packedBytes: packed.length, decodedBytes: bytes.length, ...pin }, null, 2)}\n`, { flag: "wx" });
    renameSync(temporary, manifestFile);
  } finally { rmSync(temporary, { force: true }); }
}
const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
const packed = readFileSync(resolve(root, relativeFile));
const decoded = gunzipSync(packed, { maxOutputLength: 64 * 1024 * 1024 });
const data = validateData(decoded);
if (manifest.release !== release || manifest.file !== relativeFile || hash(packed) !== manifest.packedSha256 ||
  packed.length !== manifest.packedBytes || decoded.length !== manifest.decodedBytes || hash(decoded) !== pin.datasetSha256 ||
  manifest.datasetSha256 !== pin.datasetSha256 || manifest.asOf !== pin.asOf || manifest.documentCount !== pin.documentCount ||
  JSON.stringify(manifest.laws) !== JSON.stringify(pin.laws) || data.asOf !== pin.asOf || data.documents.length !== pin.documentCount ||
  data.laws.length !== pin.laws.length || new Set(data.laws.map(law => law.lawId)).size !== pin.laws.length ||
  pin.laws.some(expected => !data.laws.some(law => law.lawId === expected.lawId && law.revisionId === expected.revisionId && law.xmlSha256 === expected.xmlSha256))) {
  throw new Error("package identity mismatch");
}
console.log(JSON.stringify({ result: "PASS", release, packedBytes: packed.length, decodedBytes: decoded.length, datasetSha256: hash(decoded), laws: data.laws.length, documents: data.documents.length }));
