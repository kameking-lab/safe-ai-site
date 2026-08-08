import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  allLawArticles,
  corpusGapFillArticles,
  egovVerifiedExcerpts,
} from "@/data/laws";

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

function canonicalArticlesJson(snapshot: Snapshot): string {
  return JSON.stringify(
    snapshot.articles.map((article) => ({
      articleNum: article.articleNum,
      caption: article.caption,
      isDeleted: article.isDeleted,
      paragraphs: article.paragraphs,
      text: article.text,
      sortKey: article.sortKey,
    })),
  );
}

function canonicalArticleJson(article: SnapshotArticle): string {
  return JSON.stringify({
    articleNum: article.articleNum,
    caption: article.caption,
    isDeleted: article.isDeleted,
    paragraphs: article.paragraphs,
    text: article.text,
    sortKey: article.sortKey,
  });
}

function loadSnapshot(lawId: string): Snapshot {
  return JSON.parse(
    readFileSync(
      join(process.cwd(), "src/data/laws-fulltext", `${lawId}.json`),
      "utf8",
    ),
  ) as Snapshot;
}

describe("generated e-Gov verified excerpts", () => {
  it("copies exact non-deleted text from a hash-valid committed snapshot", () => {
    expect(egovVerifiedExcerpts).toHaveLength(63);
    const snapshots = new Map<string, Snapshot>();

    for (const excerpt of egovVerifiedExcerpts) {
      expect(excerpt.sourceKind).toBe("egov-fulltext-snapshot");
      expect(excerpt.verificationStatus).toBe("snapshot-hash-verified");
      expect(excerpt.humanReviewStatus).toBe("not-reviewed");
      expect(excerpt.sourceLawId).toMatch(/^[0-9A-Z]{15}$/);
      expect(excerpt.sourceUrl).toBe(
        `https://laws.e-gov.go.jp/law/${excerpt.sourceLawId}`,
      );

      const lawId = excerpt.sourceLawId as string;
      const snapshot =
        snapshots.get(lawId) ??
        (() => {
          const loaded = loadSnapshot(lawId);
          snapshots.set(lawId, loaded);
          return loaded;
        })();
      expect(snapshot.lawId).toBe(lawId);
      expect(snapshot.sha256).toBe(
        sha256(canonicalArticlesJson(snapshot)),
      );
      expect(excerpt.sourceHash).toBe(snapshot.sha256);
      expect(excerpt.sourceRevisionId).toBe(snapshot.revisionId);
      expect(excerpt.sourceFetchedAt).toBe(snapshot.fetchedAt);

      const sourceArticle = snapshot.articles.find(
        (article) => article.articleNum === excerpt.articleNum,
      );
      expect(sourceArticle, `${lawId} ${excerpt.articleNum}`).toBeDefined();
      expect(sourceArticle?.isDeleted).toBe(false);
      expect(excerpt.text).toBe(sourceArticle?.text);
      expect(excerpt.contentHash).toBe(
        sha256(canonicalArticleJson(sourceArticle as SnapshotArticle)),
      );
    }
  });

  it("includes the exact current Electrician Act qualification provisions", () => {
    const electricianAct = egovVerifiedExcerpts.filter(
      (article) => article.sourceLawId === "335AC0000000139",
    );

    expect(electricianAct.map((article) => article.articleNum)).toEqual([
      "第2条",
      "第3条",
    ]);
    expect(electricianAct.every((article) => article.law === "電気工事士法")).toBe(
      true,
    );
    expect(electricianAct.every((article) => article.lawShort === "電気工事士法")).toBe(
      true,
    );
    expect(electricianAct.every((article) => article.sourceRevisionId === "20250601_504AC0000000068")).toBe(
      true,
    );
    expect(electricianAct.find((article) => article.articleNum === "第2条")?.text).toContain(
      "電気工事",
    );
    expect(electricianAct.find((article) => article.articleNum === "第3条")?.text).toContain(
      "第一種電気工事士",
    );
  });

  it("includes the five minimal public-search provisions for answer-first branching", () => {
    const expected = [
      {
        lawId: "347CO0000000318",
        articleNum: "第10条",
        revisionId: "20260401_507CO0000000361",
        text: "作業床を最も高く上昇させた場合",
      },
      {
        lawId: "347M50002000032",
        articleNum: "第41条",
        revisionId: "20260801_508M60000100086",
        text: "別表第三",
      },
      {
        lawId: "347M50002000032",
        articleNum: "第350条",
        revisionId: "20260801_508M60000100086",
        text: "作業の指揮者",
      },
      {
        lawId: "347M50002000036",
        articleNum: "第8条",
        revisionId: "20260401_508M60000100003",
        text: "臨時に有機溶剤業務",
      },
      {
        lawId: "347M50002000036",
        articleNum: "第9条",
        revisionId: "20260401_508M60000100003",
        text: "短時間",
      },
    ];

    for (const target of expected) {
      const article = egovVerifiedExcerpts.find(
        (candidate) =>
          candidate.sourceLawId === target.lawId &&
          candidate.articleNum === target.articleNum,
      );
      expect(article, `${target.lawId} ${target.articleNum}`).toBeDefined();
      expect(article?.sourceRevisionId).toBe(target.revisionId);
      expect(article?.text).toContain(target.text);
    }
  });

  it("never reintroduces the quarantined summary objects into the public corpus", () => {
    const publicObjects = new Set<unknown>(allLawArticles);
    for (const summary of corpusGapFillArticles) {
      expect(publicObjects.has(summary)).toBe(false);
    }
    for (const excerpt of egovVerifiedExcerpts) {
      expect(corpusGapFillArticles.includes(excerpt)).toBe(false);
    }
  });
});
