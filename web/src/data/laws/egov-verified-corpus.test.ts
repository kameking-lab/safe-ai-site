import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { verifiedLawArticles } from "@/data/laws/verified-corpus";

type SnapshotArticle = {
  articleNum: string;
  caption: string;
  isDeleted: boolean;
  paragraphs: unknown[];
  text: string;
  sortKey: number[];
};

type Snapshot = {
  lawId: string;
  revisionId: string;
  fetchedAt: string;
  sha256: string;
  articles: SnapshotArticle[];
};

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function canonicalArticle(article: SnapshotArticle) {
  return {
    articleNum: article.articleNum,
    caption: article.caption,
    isDeleted: article.isDeleted,
    paragraphs: article.paragraphs,
    text: article.text,
    sortKey: article.sortKey,
  };
}

function loadSnapshot(lawId: string): Snapshot {
  return JSON.parse(
    readFileSync(
      join(process.cwd(), "src/data/laws-fulltext", `${lawId}.json`),
      "utf8",
    ),
  ) as Snapshot;
}

describe("server-side verified legal corpus", () => {
  it("contains only exact, non-deleted articles from hash-valid committed e-Gov snapshots", () => {
    expect(verifiedLawArticles.length).toBeGreaterThan(2_000);
    const snapshots = new Map<string, Snapshot>();
    const articleIndexes = new Map<string, Map<string, SnapshotArticle>>();
    const verifiedSnapshotHashes = new Set<string>();
    const keys = new Set<string>();
    const errors: string[] = [];

    for (const article of verifiedLawArticles) {
      const lawId = article.sourceLawId as string;
      const key = `${article.law}|${article.articleNum}`;
      if (
        article.sourceKind !== "egov-fulltext-snapshot" ||
        article.verificationStatus !== "snapshot-hash-verified" ||
        article.humanReviewStatus !== "not-reviewed" ||
        !/^[0-9A-Z]{15}$/.test(lawId) ||
        !/^[a-f0-9]{64}$/.test(article.sourceHash ?? "") ||
        !/^[a-f0-9]{64}$/.test(article.contentHash ?? "") ||
        article.sourceUrl !== `https://laws.e-gov.go.jp/law/${lawId}`
      ) {
        errors.push(`${key}: invalid verification metadata`);
        continue;
      }
      const snapshot =
        snapshots.get(lawId) ??
        (() => {
          const loaded = loadSnapshot(lawId);
          snapshots.set(lawId, loaded);
          articleIndexes.set(
            lawId,
            new Map(
              loaded.articles.map((candidate) => [
                candidate.articleNum,
                candidate,
              ]),
            ),
          );
          return loaded;
        })();
      if (!verifiedSnapshotHashes.has(lawId)) {
        const snapshotHash = sha256(
          JSON.stringify(snapshot.articles.map(canonicalArticle)),
        );
        if (snapshot.sha256 !== snapshotHash) {
          errors.push(`${lawId}: snapshot hash mismatch`);
        }
        verifiedSnapshotHashes.add(lawId);
      }
      if (
        article.sourceHash !== snapshot.sha256 ||
        article.sourceRevisionId !== snapshot.revisionId ||
        article.sourceFetchedAt !== snapshot.fetchedAt
      ) {
        errors.push(`${key}: snapshot metadata mismatch`);
      }

      const sourceArticle = articleIndexes.get(lawId)?.get(article.articleNum);
      if (
        !sourceArticle ||
        sourceArticle.isDeleted ||
        article.text !== sourceArticle.text ||
        article.contentHash !==
          sha256(JSON.stringify(canonicalArticle(sourceArticle)))
      ) {
        errors.push(`${key}: source article mismatch`);
      }

      if (keys.has(key)) errors.push(`${key}: duplicate`);
      keys.add(key);
    }
    expect(errors).toEqual([]);
  });

  it("matches the complete non-deleted population of every included snapshot", () => {
    const byLawId = new Map<string, number>();
    for (const article of verifiedLawArticles) {
      const lawId = article.sourceLawId as string;
      byLawId.set(lawId, (byLawId.get(lawId) ?? 0) + 1);
    }
    expect(byLawId.size).toBe(25);
    for (const [lawId, count] of byLawId) {
      const expected = loadSnapshot(lawId).articles.filter(
        (article) => !article.isDeleted && article.text.trim().length > 0,
      ).length;
      expect(count, lawId).toBe(expected);
    }
  });
});
