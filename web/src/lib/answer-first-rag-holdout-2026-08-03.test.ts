import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { allLawArticles, mhlwLawArticles } from "@/data/laws";
import { ANSWER_FIRST_RAG_HOLDOUT_2026_08_03 } from "@/data/answer-first-rag-holdout-2026-08-03";
import { searchLawArticles } from "@/lib/law-search";
import { searchRelevantArticlesWithScore } from "@/lib/rag-search";

const HOLDOUT_SHA256 =
  "5b290c555603783c69af34decc9e747e0149d892992ed94c9a96c175fb9d73d2";
const quarantined = new Set(mhlwLawArticles);
const publicLawSearchArticles = allLawArticles.filter(
  (article) => !quarantined.has(article),
);

function articleKey(lawShort: string, articleNum: string): string {
  return `${lawShort}${articleNum}`;
}

function runCase(testCase: (typeof ANSWER_FIRST_RAG_HOLDOUT_2026_08_03)[number]) {
  if (testCase.surface === "rag") {
    return searchRelevantArticlesWithScore(testCase.query, 5).articles;
  }
  return searchLawArticles(
    publicLawSearchArticles,
    testCase.query,
    "all",
    5,
  ).map((hit) => hit.article);
}

describe("2026-08-03 answer-first RAG fixed holdout", () => {
  it("既存220件とは別のholdoutをchecksumで固定する", () => {
    const actual = createHash("sha256")
      .update(JSON.stringify(ANSWER_FIRST_RAG_HOLDOUT_2026_08_03))
      .digest("hex");
    expect(actual).toBe(HOLDOUT_SHA256);
  });

  it.each(ANSWER_FIRST_RAG_HOLDOUT_2026_08_03)(
    "$id: Top-5必須根拠と負例を満たす",
    (testCase) => {
      const articles = runCase(testCase);
      const keys = articles.map((article) =>
        articleKey(article.lawShort, article.articleNum),
      );
      for (const required of testCase.requiredTop5) {
        expect(keys, `${testCase.id}: missing ${required}`).toContain(required);
      }
      if ("requiredPrefix" in testCase && testCase.requiredPrefix) {
        expect(keys.slice(0, testCase.requiredPrefix.length)).toEqual([
          ...testCase.requiredPrefix,
        ]);
      }
      if ("forbiddenTop5" in testCase && testCase.forbiddenTop5) {
        for (const forbidden of testCase.forbiddenTop5) {
          expect(keys, `${testCase.id}: forbidden ${forbidden}`).not.toContain(
            forbidden,
          );
        }
      }
      if ("forbiddenLawShorts" in testCase && testCase.forbiddenLawShorts) {
        for (const article of articles) {
          expect(
            testCase.forbiddenLawShorts,
            `${testCase.id}: category leap to ${article.lawShort}`,
          ).not.toContain(article.lawShort);
        }
      }
      // AI回答・引用に使うRAG面はhash確認済み本文だけを許可する。
      // /law-search は既存curated周辺法令も検索対象で、AI根拠には流用しない。
      if (testCase.surface === "rag") {
        for (const required of testCase.requiredTop5) {
          const source = articles.find(
            (article) => articleKey(article.lawShort, article.articleNum) === required,
          );
          expect(source?.verificationStatus, `${testCase.id}: ${required}`).toBe(
            "snapshot-hash-verified",
          );
        }
      }
    },
  );

  it("holdoutのRetrieval Recall@5=100%、primary MRR>=0.90", () => {
    let retrieved = 0;
    let requiredCount = 0;
    let reciprocalRank = 0;
    for (const testCase of ANSWER_FIRST_RAG_HOLDOUT_2026_08_03) {
      const keys = runCase(testCase).map((article) =>
        articleKey(article.lawShort, article.articleNum),
      );
      requiredCount += testCase.requiredTop5.length;
      retrieved += testCase.requiredTop5.filter((key) => keys.includes(key)).length;
      const primaryRank = keys.indexOf(testCase.requiredTop5[0]) + 1;
      reciprocalRank += primaryRank > 0 ? 1 / primaryRank : 0;
    }
    expect(retrieved / requiredCount).toBe(1);
    expect(reciprocalRank / ANSWER_FIRST_RAG_HOLDOUT_2026_08_03.length).toBeGreaterThanOrEqual(
      0.9,
    );
  });

  it("電気の高圧作業と令6条1号の圧気作業を同一視しない根拠を保持する", () => {
    const articles = searchRelevantArticlesWithScore(
      "電気作業で作業主任者の選任が必要か",
      5,
    ).articles;
    const workDirection = articles.find(
      (article) => article.lawShort === "安衛則" && article.articleNum === "第350条",
    );
    const workChiefList = articles.find(
      (article) => article.lawShort === "安衛令" && article.articleNum === "第6条",
    );
    expect(workDirection?.articleTitle).toContain("作業指揮");
    expect(workDirection?.text).toContain("作業の指揮者");
    expect(workChiefList?.text).toContain("大気圧を超える気圧下");
    expect(workChiefList?.text).toContain("圧気工法");
  });
});
