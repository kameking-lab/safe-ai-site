import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { allLawArticles } from "@/data/laws";
import { searchRelevantArticlesWithScore } from "@/lib/rag-search";
import { RAG_100_QUESTIONS } from "@/lib/rag-100q.fixture";

/**
 * RAG metrics benchmark — computes Recall@5 / Precision@5 / MRR
 * for both fixture sets and writes to docs/rag-metrics-latest.json
 * for failure-analysis tooling.
 */

const TOP_K = 5;

type Result = { law: string; lawShort: string; articleNum: string };
type Gold = { lawShort: string; articleNum: string };

function isMatch(r: Result, g: Gold): boolean {
  return (r.lawShort === g.lawShort || r.law === g.lawShort) && r.articleNum === g.articleNum;
}

type FreshFixture = {
  questions: Array<{ id: number; topic: string; question: string; gold: Gold[] }>;
};

function evaluateSet(
  name: string,
  questions: Array<{ id: number; topic: string; question: string; gold: Gold[] }>,
) {
  let recallHits = 0;
  let precisionSum = 0;
  let mrrSum = 0;
  const failures: Array<{
    id: number;
    topic: string;
    question: string;
    gold: string;
    got: string[];
  }> = [];
  const topic: Record<string, { total: number; correct: number }> = {};

  for (const tc of questions) {
    const { articles } = searchRelevantArticlesWithScore(tc.question, TOP_K);
    let hitRank: number | null = null;
    let matchCount = 0;
    for (let i = 0; i < articles.length; i++) {
      if (tc.gold.some((g) => isMatch(articles[i] as Result, g))) {
        matchCount++;
        if (hitRank === null) hitRank = i + 1;
      }
    }
    (topic[tc.topic] ??= { total: 0, correct: 0 }).total++;
    if (hitRank !== null) {
      recallHits++;
      mrrSum += 1 / hitRank;
      topic[tc.topic].correct++;
    } else {
      failures.push({
        id: tc.id,
        topic: tc.topic,
        question: tc.question,
        gold: tc.gold.map((g) => `${g.lawShort}${g.articleNum}`).join(" / "),
        got: articles.map((a) => `${a.lawShort}${a.articleNum}`),
      });
    }
    precisionSum += matchCount / TOP_K;
  }

  const n = questions.length;
  return {
    name,
    n,
    recall5: recallHits / n,
    precision5: precisionSum / n,
    mrr: mrrSum / n,
    failures,
    topicBreakdown: Object.fromEntries(
      Object.entries(topic).map(([k, v]) => [k, { ...v, accuracy: v.total ? v.correct / v.total : 0 }]),
    ),
  };
}

describe("RAG metrics (Recall@5 / Precision@5 / MRR)", () => {
  it("emits metrics report for fresh + main fixtures", { timeout: 60_000 }, () => {
    const freshFixture = JSON.parse(
      readFileSync(resolve(process.cwd(), "test/chatbot-fresh-100.json"), "utf8"),
    ) as FreshFixture;

    const mainQuestions = RAG_100_QUESTIONS.map((q) => ({
      id: q.id,
      topic: q.topic,
      question: q.question,
      gold: q.gold,
    }));

    const mainReport = evaluateSet("main", mainQuestions);
    const freshReport = evaluateSet("fresh", freshFixture.questions);

    const lawInventory: Array<{ lawShort: string; law: string; count: number }> = [];
    const inv = new Map<string, { law: string; lawShort: string; count: number }>();
    for (const a of allLawArticles) {
      const k = `${a.lawShort}|${a.law}`;
      const v = inv.get(k);
      if (v) v.count++;
      else inv.set(k, { law: a.law, lawShort: a.lawShort, count: 1 });
    }
    for (const v of inv.values()) lawInventory.push(v);
    lawInventory.sort((a, b) => b.count - a.count);

    const out = {
      generated_at: new Date().toISOString(),
      main: {
        n: mainReport.n,
        recall5: mainReport.recall5,
        precision5: mainReport.precision5,
        mrr: mainReport.mrr,
        topic_breakdown: mainReport.topicBreakdown,
        failures: mainReport.failures,
      },
      fresh: {
        n: freshReport.n,
        recall5: freshReport.recall5,
        precision5: freshReport.precision5,
        mrr: freshReport.mrr,
        topic_breakdown: freshReport.topicBreakdown,
        failures: freshReport.failures,
      },
      law_inventory: lawInventory,
    };

    const outPath = resolve(process.cwd(), "../docs/rag-metrics-latest.json");
    try {
      writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
    } catch {
      /* ignore */
    }

    console.log(
      `\n[RAG metrics] main: Recall@5=${(mainReport.recall5 * 100).toFixed(1)}% P@5=${(
        mainReport.precision5 * 100
      ).toFixed(1)}% MRR=${mainReport.mrr.toFixed(3)}`,
    );
    console.log(
      `[RAG metrics] fresh: Recall@5=${(freshReport.recall5 * 100).toFixed(1)}% P@5=${(
        freshReport.precision5 * 100
      ).toFixed(1)}% MRR=${freshReport.mrr.toFixed(3)}`,
    );

    expect(mainReport.recall5).toBeGreaterThanOrEqual(0);
    expect(freshReport.recall5).toBeGreaterThanOrEqual(0);
  });
});
