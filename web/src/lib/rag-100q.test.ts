import { describe, it, expect } from "vitest";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { searchRelevantArticlesWithScore } from "@/lib/rag-search";
import { RAG_100_QUESTIONS } from "@/lib/rag-100q.fixture";
import { isLawShortEquivalent } from "@/lib/rag/synonyms";
import { evaluateChatbotSafety } from "@/lib/chatbot-safety";

/**
 * RAG 検索 100 問ベンチマーク。
 *
 * 各問について top-5 検索結果に gold セットいずれかが含まれれば正答。
 * チャットボットの回答精度は最終的に Gemini の生成品質にも依存するが、
 * 検索段階で正しい条文を取れていれば、Gemini にハルシネーションさせず
 * 根拠ベースの回答を返せる確率が高い（=実質的な精度の代理指標）。
 *
 * 目標: 正答率 85% 以上
 */
const TOP_K = 5;
const TARGET_ACCURACY = 0.85;

function evaluateMatch(
  results: { law: string; lawShort: string; articleNum: string }[],
  gold: { lawShort: string; articleNum: string }[],
  requiredAll = false,
): {
  hitRank: number | null;
  firstRelevantRank: number | null;
  matchCount: number;
} {
  const matchedRanks = gold
    .map((g) => {
      const index = results.findIndex(
        (r) =>
          r.articleNum === g.articleNum &&
          (r.lawShort === g.lawShort ||
            r.law === g.lawShort ||
            isLawShortEquivalent(r.lawShort, g.lawShort)),
      );
      return index < 0 ? null : index + 1;
    })
    .filter((rank): rank is number => rank !== null);
  const firstRelevantRank =
    matchedRanks.length > 0 ? Math.min(...matchedRanks) : null;
  const hitRank = requiredAll
    ? matchedRanks.length === gold.length && matchedRanks.length > 0
      ? Math.max(...matchedRanks)
      : null
    : firstRelevantRank;
  return {
    hitRank,
    firstRelevantRank,
    matchCount: new Set(matchedRanks).size,
  };
}

describe("RAG 100問ベンチマーク", () => {
  // 100問を逐次評価する CPU バウンドな処理。コーパス拡張やマシン揺らぎで
  // 5秒デフォルトを踏み抜くのを予防するため timeout を 30秒に拡張する
  // （fresh セット側で同種の連鎖タイムアウトが発生したため横展開）。
  it(`正答率が ${TARGET_ACCURACY * 100}% 以上であること`, { timeout: 30000 }, () => {
    let correct = 0;
    let retrievalTotal = 0;
    let safeHoldCorrect = 0;
    let safeHoldTotal = 0;
    let precisionSum = 0;
    let mrrSum = 0;
    const failures: Array<{
      id: number;
      topic: string;
      question: string;
      expected: string;
      actual: string;
    }> = [];

    for (const tc of RAG_100_QUESTIONS) {
      if (tc.disposition) {
        safeHoldTotal += 1;
        const decision = evaluateChatbotSafety(tc.question);
        const expectedKind =
          tc.disposition === "clarification-required"
            ? "ambiguous"
            : tc.disposition;
        if (decision?.kind === expectedKind) {
          safeHoldCorrect += 1;
        } else {
          failures.push({
            id: tc.id,
            topic: tc.topic,
            question: tc.question,
            expected: `安全保留: ${expectedKind}`,
            actual: decision?.kind ?? "保留なし",
          });
        }
        continue;
      }
      retrievalTotal += 1;
      const { articles } = searchRelevantArticlesWithScore(tc.question, TOP_K);
      const { hitRank, firstRelevantRank, matchCount } = evaluateMatch(
        articles,
        tc.gold,
        tc.requiredAll,
      );
      precisionSum += matchCount / TOP_K;
      if (firstRelevantRank !== null) mrrSum += 1 / firstRelevantRank;
      const ok = hitRank !== null;
      if (ok) {
        correct++;
      } else {
        failures.push({
          id: tc.id,
          topic: tc.topic,
          question: tc.question,
          expected: tc.gold.map((g) => `${g.lawShort}${g.articleNum}`).join(" / "),
          actual: articles.map((a) => `${a.lawShort}${a.articleNum}`).join(", ") || "(no hits)",
        });
      }
    }

    const retrievalAccuracy =
      retrievalTotal === 0 ? 0 : correct / retrievalTotal;
    const precision5 =
      retrievalTotal === 0 ? 0 : precisionSum / retrievalTotal;
    const mrr = retrievalTotal === 0 ? 0 : mrrSum / retrievalTotal;
    const overallCorrect = correct + safeHoldCorrect;
    const overallAccuracy =
      RAG_100_QUESTIONS.length === 0
        ? 0
        : overallCorrect / RAG_100_QUESTIONS.length;
    const failedIds = new Set(failures.map((failure) => failure.id));
    const topicBreakdown: Record<
      string,
      { total: number; correct: number; accuracy: number }
    > = {};
    for (const question of RAG_100_QUESTIONS.filter(
      (item) => !item.disposition,
    )) {
      const slot = (topicBreakdown[question.topic] ??= {
        total: 0,
        correct: 0,
        accuracy: 0,
      });
      slot.total += 1;
      if (!failedIds.has(question.id)) slot.correct += 1;
    }
    for (const slot of Object.values(topicBreakdown)) {
      slot.accuracy = slot.total === 0 ? 0 : slot.correct / slot.total;
    }
    const passed =
      retrievalAccuracy >= TARGET_ACCURACY &&
      safeHoldCorrect === safeHoldTotal;
    const generatedAt = new Date().toISOString();
    const reportPath = process.env.RAG_100Q_REPORT_PATH;
    if (reportPath) {
      try {
        writeFileSync(
          resolve(reportPath),
          `${JSON.stringify(
          {
            generated_at: generatedAt,
            source: "src/lib/rag-100q.fixture.ts",
            total: RAG_100_QUESTIONS.length,
            correct: overallCorrect,
            accuracy: overallAccuracy,
            retrieval_total: retrievalTotal,
            retrieval_correct: correct,
            retrieval_accuracy: retrievalAccuracy,
            precision5,
            mrr,
            quality_metrics_generated_at: generatedAt,
            safe_hold_total: safeHoldTotal,
            safe_hold_correct: safeHoldCorrect,
            safe_hold_rate:
              safeHoldTotal === 0 ? 1 : safeHoldCorrect / safeHoldTotal,
            target: TARGET_ACCURACY,
            passed,
            failures,
            topic_breakdown: topicBreakdown,
          },
          null,
          2,
          )}\n`,
          "utf8",
        );
      } catch {
        // CIの読取専用FSではログとassertionを一次結果として維持する。
      }
    }
    // 結果サマリ出力（CI ログから精度を確認できるように）
    console.log(
      `\n[RAG 100Q] 条文検索 ${correct}/${retrievalTotal} = ${(retrievalAccuracy * 100).toFixed(1)}%` +
        ` / 安全保留 ${safeHoldCorrect}/${safeHoldTotal}`
    );
    if (failures.length > 0) {
        console.log(`[RAG 100Q] 不正答 ${failures.length} 件:`);
      for (const f of failures) {
            console.log(
          `  Q${f.id} [${f.topic}] ${f.question}\n    期待: ${f.expected}\n    取得: ${f.actual}`
        );
      }
    }

    expect(retrievalAccuracy).toBeGreaterThanOrEqual(TARGET_ACCURACY);
    expect(safeHoldCorrect).toBe(safeHoldTotal);
  });
});
