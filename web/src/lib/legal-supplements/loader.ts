import "server-only";
import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { gunzip } from "node:zlib";
import manifest from "@/data/legal-supplement-lab-manifest.json";
import release from "@/data/legal-supplement-release.json";
import type { SupplementDataset } from "./types";

export function localSupplementsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.SAFE_AI_LOCAL_SUPPLEMENTS === "true" && env.NODE_ENV !== "production" &&
    !env.VERCEL && !env.VERCEL_ENV && !disabled(env);
}

function disabled(env: NodeJS.ProcessEnv): boolean {
  return env.SAFE_AI_LEGAL_SUPPLEMENTS_DISABLED === "true" ||
    env.SAFE_AI_STAGING_MODE?.trim().toLowerCase() === "true" ||
    Boolean(env.VERCEL_ENV && env.VERCEL_ENV !== "production");
}

/** Exact immutable release opt-in; local experimental flag never enables production. */
export function supplementsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (disabled(env)) return false;
  if (env.SAFE_AI_LEGAL_SUPPLEMENTS_RELEASE) return env.SAFE_AI_LEGAL_SUPPLEMENTS_RELEASE === release.release;
  return localSupplementsEnabled(env);
}

/** A wrong configured version must hold the answer, not fall through to another corpus. */
export function supplementsRequested(env: NodeJS.ProcessEnv = process.env): boolean {
  return !disabled(env) && (Boolean(env.SAFE_AI_LEGAL_SUPPLEMENTS_RELEASE) || localSupplementsEnabled(env));
}

export function supplementFile(): string {
  return resolve(process.cwd(), release.file);
}

const unzip = promisify(gunzip);
let cache: { signature: string; pending: Promise<SupplementDataset> } | undefined;
const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const samePath = (a: string, b: string) => process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;

async function fileSignature(path: string): Promise<string> {
  if (!samePath(await realpath(path), path)) throw new Error("redirected supplement package");
  const info = await stat(path);
  if (!info.isFile() || info.size !== release.packedBytes) throw new Error("supplement package size mismatch");
  return [path, info.dev, info.ino, info.size, info.mtimeMs, info.ctimeMs].join(":");
}

/** No network/DB fallback. Reuse verified immutable bytes, but recheck the gate and file identity. */
export async function loadSupplements(): Promise<SupplementDataset> {
  if (!supplementsEnabled()) throw new Error("supplement release disabled or unknown");
  const path = supplementFile();
  let signature: string;
  try { signature = await fileSignature(path); }
  catch (error) { cache = undefined; throw error; }
  if (cache?.signature !== signature) {
    const pending = (async () => {
      const packed = await readFile(path);
      if (sha256(packed) !== release.packedSha256) throw new Error("supplement package hash mismatch");
      const bytes = await unzip(packed, { maxOutputLength: 64 * 1024 * 1024 });
      if (bytes.length !== release.decodedBytes || await fileSignature(path) !== signature) {
        throw new Error("supplement package changed during read");
      }
      return decodeSupplementBytes(bytes);
    })();
    cache = { signature, pending };
  }
  const entry = cache;
  try {
    const dataset = await entry.pending;
    if (!supplementsEnabled()) throw new Error("supplement release disabled during read");
    return dataset;
  } catch (error) {
    if (cache === entry) cache = undefined;
    throw error;
  }
}

export function decodeSupplementBytes(bytes: Buffer): SupplementDataset {
  if (sha256(bytes) !== manifest.datasetSha256 || release.datasetSha256 !== manifest.datasetSha256 ||
    release.asOf !== manifest.asOf || release.documentCount !== manifest.documentCount ||
    JSON.stringify(release.laws) !== JSON.stringify(manifest.laws)) {
    throw new Error("supplement dataset hash or pin mismatch");
  }
  const data = JSON.parse(bytes.toString("utf8")) as SupplementDataset;
  if (data.schema !== "safe-ai-supplement-rag/v1" || data.asOf !== manifest.asOf ||
    data.laws.length !== manifest.laws.length || new Set(data.laws.map(law => law.lawId)).size !== manifest.laws.length ||
    data.documents.length !== manifest.documentCount ||
    manifest.laws.some(expected => !data.laws.some(law =>
      expected.lawId === law.lawId && expected.revisionId === law.revisionId && expected.xmlSha256 === law.xmlSha256))) {
    throw new Error("supplement dataset identity mismatch");
  }
  return data;
}
