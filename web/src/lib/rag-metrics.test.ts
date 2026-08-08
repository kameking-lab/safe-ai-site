import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { verifiedLawArticles } from "@/data/laws/verified-corpus";
import { searchRelevantArticlesWithScore } from "@/lib/rag-search";
import { RAG_100_QUESTIONS } from "@/lib/rag-100q.fixture";
import { isLawShortEquivalent } from "@/lib/rag/synonyms";
import { evaluateChatbotSafety } from "@/lib/chatbot-safety";

/**
 * RAG metrics benchmark — computes Recall@5 / Precision@5 / MRR
 * for both fixture sets and writes to docs/rag-metrics-latest.json
 * for failure-analysis tooling.
 */

const TOP_K = 5;

type Result = { law: string; lawShort: string; articleNum: string };
type Gold = { lawShort: string; articleNum: string };

function isMatch(r: Result, g: Gold): boolean {
  if (r.articleNum !== g.articleNum) return false;
  if (r.lawShort === g.lawShort || r.law === g.lawShort) return true;
  return isLawShortEquivalent(r.lawShort, g.lawShort);
}

type FreshFixture = {
  questions: Array<{
    id: number;
    topic: string;
    question: string;
    gold: Gold[];
    disposition?:
      | "clarification-required"
      | "wrong-premise"
      | "source-gap";
    requiredAll?: boolean;
  }>;
};

function evaluateSet(
  name: string,
  questions: Array<{
    id: number;
    topic: string;
    question: string;
    gold: Gold[];
    disposition?:
      | "clarification-required"
      | "wrong-premise"
      | "source-gap";
    requiredAll?: boolean;
  }>,
) {
  let recallHits = 0;
  let precisionSum = 0;
  let mrrSum = 0;
  let retrievalTotal = 0;
  let safeHoldTotal = 0;
  let safeHoldCorrect = 0;
  const failures: Array<{
    id: number;
    topic: string;
    question: string;
    gold: string;
    got: string[];
  }> = [];
  const topic: Record<string, { total: number; correct: number }> = {};

  for (const tc of questions) {
    if (tc.disposition) {
      safeHoldTotal += 1;
      const expectedKind =
        tc.disposition === "clarification-required"
          ? "ambiguous"
          : tc.disposition;
      if (evaluateChatbotSafety(tc.question)?.kind === expectedKind) {
        safeHoldCorrect += 1;
      } else {
        failures.push({
          id: tc.id,
          topic: tc.topic,
          question: tc.question,
          gold: `安全保留: ${expectedKind}`,
          got: [evaluateChatbotSafety(tc.question)?.kind ?? "保留なし"],
        });
      }
      continue;
    }
    retrievalTotal += 1;
    const { articles } = searchRelevantArticlesWithScore(tc.question, TOP_K);
    const matchedRanks = tc.gold.map((gold) => {
      const index = articles.findIndex((article) =>
        isMatch(article as Result, gold),
      );
      return index < 0 ? null : index + 1;
    });
    const matched = matchedRanks.filter(
      (rank): rank is number => rank !== null,
    );
    const hitRank =
      tc.requiredAll
        ? matched.length === tc.gold.length && matched.length > 0
          ? Math.max(...matched)
          : null
        : matched.length > 0
          ? Math.min(...matched)
          : null;
    const firstRelevantRank =
      matched.length > 0 ? Math.min(...matched) : null;
    const matchCount = new Set(matched).size;
    (topic[tc.topic] ??= { total: 0, correct: 0 }).total++;
    if (hitRank !== null) {
      recallHits++;
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
    if (firstRelevantRank !== null) {
      mrrSum += 1 / firstRelevantRank;
    }
    precisionSum += matchCount / TOP_K;
  }

  const n = retrievalTotal;
  return {
    name,
    n,
    recall5: n === 0 ? 0 : recallHits / n,
    precision5: n === 0 ? 0 : precisionSum / n,
    mrr: n === 0 ? 0 : mrrSum / n,
    safeHoldTotal,
    safeHoldCorrect,
    safeHoldRate:
      safeHoldTotal === 0 ? 1 : safeHoldCorrect / safeHoldTotal,
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
      disposition: q.disposition,
      requiredAll: q.requiredAll,
    }));

    const mainReport = evaluateSet("main", mainQuestions);
    const freshReport = evaluateSet("fresh", freshFixture.questions);

    const lawInventory: Array<{ lawShort: string; law: string; count: number }> = [];
    const inv = new Map<string, { law: string; lawShort: string; count: number }>();
    for (const a of verifiedLawArticles) {
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
        safe_hold_total: mainReport.safeHoldTotal,
        safe_hold_correct: mainReport.safeHoldCorrect,
        safe_hold_rate: mainReport.safeHoldRate,
        topic_breakdown: mainReport.topicBreakdown,
        failures: mainReport.failures,
      },
      fresh: {
        n: freshReport.n,
        recall5: freshReport.recall5,
        precision5: freshReport.precision5,
        mrr: freshReport.mrr,
        safe_hold_total: freshReport.safeHoldTotal,
        safe_hold_correct: freshReport.safeHoldCorrect,
        safe_hold_rate: freshReport.safeHoldRate,
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
    expect(mainReport.safeHoldCorrect).toBe(mainReport.safeHoldTotal);
    expect(freshReport.safeHoldCorrect).toBe(freshReport.safeHoldTotal);
  });
});
