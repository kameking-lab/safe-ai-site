import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

type Corpus = {
  id: string;
  roots: string[];
  fileCount: number;
  bytes: number;
  manifestSha256: string;
};
type PreservationManifest = {
  schemaVersion: number;
  generatedAtJst: string;
  corpora: Corpus[];
};
const testFilePattern = /\.(?:spec|test)\.[^/\\]+$/u;
const textSourcePattern = /\.(?:json|jsonl|ts)$/u;
const sha256 = (value: Uint8Array | string) => createHash("sha256").update(value).digest("hex");

function collectFiles(path: string): string[] {
  if (statSync(path).isFile()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? collectFiles(child) : entry.isFile() ? [child] : [];
  });
}

/** Same canonical bytes and roots as the independent preservation regression. */
function inventory(repositoryRoot: string, roots: string[], candidate?: { path: string; content: string }) {
  const files = roots.flatMap((root) => collectFiles(resolve(repositoryRoot, root)))
    .map((path) => ({ path, repositoryPath: relative(repositoryRoot, path).replaceAll("\\", "/") }))
    .filter(({ repositoryPath }) => !testFilePattern.test(repositoryPath))
    .sort((a, b) => a.repositoryPath < b.repositoryPath ? -1 : a.repositoryPath > b.repositoryPath ? 1 : 0);
  let candidateMatched = false;
  const lines = files.map(({ path, repositoryPath }) => {
    const isCandidate = candidate !== undefined && resolve(path) === resolve(candidate.path);
    candidateMatched ||= isCandidate;
    let content = isCandidate ? Buffer.from(candidate!.content, "utf-8") : readFileSync(path);
    if (textSourcePattern.test(repositoryPath)) {
      const canonical = Buffer.allocUnsafe(content.byteLength);
      let offset = 0;
      for (let index = 0; index < content.byteLength; index += 1) {
        if (content[index] === 0x0d && content[index + 1] === 0x0a) continue;
        canonical[offset++] = content[index];
      }
      content = canonical.subarray(0, offset);
    }
    return { bytes: content.byteLength, line: `${sha256(content)}  ${repositoryPath}\n` };
  });
  return {
    fileCount: lines.length,
    bytes: lines.reduce((total, entry) => total + entry.bytes, 0),
    manifestSha256: sha256(lines.map(({ line }) => line).join("")),
    candidateMatched,
  };
}

/** Advance only an already-verified current manifest, changing this data file alone. */
export function prepareRevisionPreservationManifest(
  manifestPath: string, dataPath: string, candidateData: string, completedAt: string,
): string {
  const repositoryRoot = resolve(dirname(manifestPath), "../../..");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as PreservationManifest;
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.corpora) || !manifest.corpora.length) {
    throw new Error("Invalid current preservation manifest");
  }
  let candidateMatched = false;
  const corpora = manifest.corpora.map((corpus) => {
    const current = inventory(repositoryRoot, corpus.roots);
    if (current.fileCount !== corpus.fileCount || current.bytes !== corpus.bytes ||
        current.manifestSha256 !== corpus.manifestSha256) {
      throw new Error(`Current source preservation mismatch: ${corpus.id}`);
    }
    const next = inventory(repositoryRoot, corpus.roots, { path: dataPath, content: candidateData });
    candidateMatched ||= next.candidateMatched;
    return { ...corpus, fileCount: next.fileCount, bytes: next.bytes, manifestSha256: next.manifestSha256 };
  });
  if (!candidateMatched) throw new Error("Revision data is outside current preservation roots");
  const generatedAtJst = new Date(Date.parse(completedAt) + 9 * 60 * 60 * 1000)
    .toISOString().replace(/\.\d{3}Z$/, "+09:00");
  return JSON.stringify({ ...manifest, generatedAtJst, corpora }, null, 2) + "\n";
}
