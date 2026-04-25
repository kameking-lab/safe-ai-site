import { describe, it, expect } from "vitest";
import { searchRelevantArticlesWithScore } from "@/lib/rag-search";
import { RAG_100_QUESTIONS } from "@/lib/rag-100q.fixture";

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

function isMatch(
  results: { law: string; lawShort: string; articleNum: string }[],
  gold: { lawShort: string; articleNum: string }[]
): boolean {
  return gold.some((g) =>
    results.some(
      (r) =>
        (r.lawShort === g.lawShort || r.law === g.lawShort) &&
        r.articleNum === g.articleNum
    )
  );
}

describe("RAG 100問ベンチマーク", () => {
  it(`正答率が ${TARGET_ACCURACY * 100}% 以上であること`, () => {
    let correct = 0;
    const failures: Array<{
      id: number;
      topic: string;
      question: string;
      expected: string;
      actual: string;
    }> = [];

    for (const tc of RAG_100_QUESTIONS) {
      const { articles } = searchRelevantArticlesWithScore(tc.question, TOP_K);
      const ok = isMatch(articles, tc.gold);
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

    const accuracy = correct / RAG_100_QUESTIONS.length;
    // 結果サマリ出力（CI ログから精度を確認できるように）
    console.log(
      `\n[RAG 100Q] 正答 ${correct}/${RAG_100_QUESTIONS.length} = ${(accuracy * 100).toFixed(1)}%`
    );
    if (failures.length > 0) {
        console.log(`[RAG 100Q] 不正答 ${failures.length} 件:`);
      for (const f of failures) {
            console.log(
          `  Q${f.id} [${f.topic}] ${f.question}\n    期待: ${f.expected}\n    取得: ${f.actual}`
        );
      }
    }

    expect(accuracy).toBeGreaterThanOrEqual(TARGET_ACCURACY);
  });
});
