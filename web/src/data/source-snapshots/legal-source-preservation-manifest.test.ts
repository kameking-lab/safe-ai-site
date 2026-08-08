import { createHash } from "node:crypto";
import {
  readdirSync,
  readFileSync,
  statSync,
  type Dirent,
} from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type CorpusManifest = {
  id: string;
  roots: string[];
  fileCount: number;
  bytes: number;
  manifestSha256: string;
};

type LegalSourcePreservationManifest = {
  schemaVersion: number;
  algorithm: string;
  excludes: string[];
  corpora: CorpusManifest[];
};

const repositoryRoot = resolve(process.cwd(), "..");
const manifestPath = resolve(
  repositoryRoot,
  "docs/audits/archive/legal-source-preservation-manifest.json",
);
const testFilePattern = /\.(?:spec|test)\.[^/\\]+$/u;
const expectedCorpora = [
  {
    id: "laws-fulltext",
    roots: ["web/src/data/laws-fulltext"],
  },
  {
    id: "laws-and-metadata",
    roots: [
      "web/src/data/laws",
      "web/src/data/laws-mhlw",
      "web/src/data/law-revisions",
      "web/src/data/law-navi",
    ],
  },
  {
    id: "verified-notices-and-circulars",
    roots: [
      "web/src/data/circulars",
      "web/src/data/source-snapshots",
      "web/src/data/mhlw-notices.ts",
      "web/src/data/public-mhlw-notices.ts",
      "web/src/data/article-notice-map.ts",
      "web/src/data/source-registry.ts",
    ],
  },
  {
    id: "surrounding-legal-snapshots",
    roots: ["web/src/data/legal"],
  },
] as const;

const sha256 = (value: Uint8Array | string) =>
  createHash("sha256").update(value).digest("hex");

const collectFiles = (path: string): string[] => {
  if (statSync(path).isFile()) return [path];

  return readdirSync(path, { withFileTypes: true }).flatMap(
    (entry: Dirent) => {
      const child = join(path, entry.name);
      if (entry.isDirectory()) return collectFiles(child);
      return entry.isFile() ? [child] : [];
    },
  );
};

const toRepositoryPath = (path: string) =>
  relative(repositoryRoot, path).replaceAll("\\", "/");

const inventory = (roots: readonly string[]) => {
  const files = roots
    .flatMap((root) => collectFiles(resolve(repositoryRoot, root)))
    .map((path) => ({ path, repositoryPath: toRepositoryPath(path) }))
    // The manifest roots are curated legal-source roots. Tests are the only
    // mechanically excluded files inside those roots; unverified material is
    // kept outside the roots so it cannot be silently treated as verified.
    .filter(({ repositoryPath }) => !testFilePattern.test(repositoryPath))
    .sort(({ repositoryPath: left }, { repositoryPath: right }) =>
      left < right ? -1 : left > right ? 1 : 0,
    );

  const lines = files.map(({ path, repositoryPath }) => {
    const content = readFileSync(path);
    return {
      bytes: content.byteLength,
      line: `${sha256(content)}  ${repositoryPath}\n`,
    };
  });

  return {
    fileCount: lines.length,
    bytes: lines.reduce((total, entry) => total + entry.bytes, 0),
    manifestSha256: sha256(lines.map(({ line }) => line).join("")),
    repositoryPaths: files.map(({ repositoryPath }) => repositoryPath),
  };
};

describe("legal source preservation manifest", () => {
  it("matches every current verified source root", () => {
    const manifest = JSON.parse(
      readFileSync(manifestPath, "utf8"),
    ) as LegalSourcePreservationManifest;

    expect(manifest).toMatchObject({
      schemaVersion: 1,
      algorithm:
        "sha256(sorted lines: <file-sha256><two spaces><repo-relative-path><LF>)",
      excludes: [
        "test files",
        "raw evidence",
        "unverified or quarantined notices",
      ],
    });

    const manifestIds = manifest.corpora.map(({ id }) => id);
    expect(new Set(manifestIds).size).toBe(manifestIds.length);
    expect(
      manifest.corpora.map(({ id, roots }) => ({ id, roots })),
    ).toEqual(expectedCorpora);

    const verifiedNoticeCorpus = expectedCorpora.find(
      ({ id }) => id === "verified-notices-and-circulars",
    );
    expect(verifiedNoticeCorpus).toBeDefined();
    if (!verifiedNoticeCorpus) {
      throw new Error("verified legal source corpus is missing");
    }

    const { repositoryPaths } = inventory(verifiedNoticeCorpus.roots);
    expect(repositoryPaths).toContain(
      "web/src/data/source-snapshots/mhlw-kihatsu-0520-6-2025-05-20.pdf",
    );

    const actualByCorpus = Object.fromEntries(
      expectedCorpora.map((corpus) => {
        const { repositoryPaths: _paths, ...actual } = inventory(corpus.roots);
        return [corpus.id, actual];
      }),
    );
    const expectedByCorpus = Object.fromEntries(
      manifest.corpora.map((corpus) => [
        corpus.id,
        {
          fileCount: corpus.fileCount,
          bytes: corpus.bytes,
          manifestSha256: corpus.manifestSha256,
        },
      ]),
    );
    expect(actualByCorpus).toEqual(expectedByCorpus);
  });
});
