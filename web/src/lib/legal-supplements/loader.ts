import "server-only";
import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import { resolve } from "node:path";
import manifest from "@/data/legal-supplement-lab-manifest.json";
import type { SupplementDataset } from "./types";

export function localSupplementsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.SAFE_AI_LOCAL_SUPPLEMENTS === "true" && env.NODE_ENV !== "production" &&
    !env.VERCEL && !env.VERCEL_ENV;
}

export function localSupplementFile(): string {
  return resolve(process.cwd(), "../../legal-rag-lab-2026-10-26/rag-dataset-v1.json");
}

let cachedDataset: SupplementDataset | undefined;

/** Pinned, reviewed local bytes only. No network, DB or paid service fallback. */
export async function loadLocalSupplements(): Promise<SupplementDataset> {
  if (!localSupplementsEnabled()) throw new Error("local supplement experiment disabled");
  const path = localSupplementFile();
  if ((await realpath(path)).toLowerCase() !== path.toLowerCase()) throw new Error("redirected local dataset");
  if ((await stat(path)).size > 64 * 1024 * 1024) throw new Error("local dataset exceeds size limit");
  const bytes = await readFile(path);
  return decodeSupplementBytes(bytes);
}

export function decodeSupplementBytes(bytes: Buffer): SupplementDataset {
  if (createHash("sha256").update(bytes).digest("hex") !== manifest.datasetSha256) {
    throw new Error("local dataset hash mismatch");
  }
  if (cachedDataset) return cachedDataset;
  const data = JSON.parse(bytes.toString("utf8")) as SupplementDataset;
  if (data.schema !== "safe-ai-supplement-rag/v1" || data.asOf !== manifest.asOf ||
    data.laws.length !== 5 || data.documents.length !== manifest.documentCount ||
    data.laws.some((law) => !manifest.laws.some((expected) =>
      expected.lawId === law.lawId && expected.revisionId === law.revisionId && expected.xmlSha256 === law.xmlSha256))) {
    throw new Error("local dataset identity mismatch");
  }
  cachedDataset = data;
  return data;
}
