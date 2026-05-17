import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { searchRelevantArticlesWithScore } from "@/lib/rag-search";
import { isLawShortEquivalent } from "@/lib/rag/synonyms";

/**
 * RAG 検索 100 問ベンチマーク（fresh セット）。
 *
 * 既存の `rag-100q.test.ts` とは別の言い回し・観点で同等の論点を試す
 * セカンダリ評価。同じ閾値で判定し、結果サマリは
 * `/about/chatbot-eval` ページが表示する追加データソースとして
 * `web/src/data/chatbot-eval-fresh-results.json` に書き出す。
 */
const TOP_K = 5;
/**
 * fresh セットは既存セットと異なる言い回し・観点で同じ法令論点を試す
 * セカンダリ評価。Phase B（同義語辞書・コーパス補完・PINNED_TOPICS 拡張・
 * 法令略称エイリアス対応）後に Recall@5 100% を達成しており、回帰防止のため
 * 高めの閾値で運用する。
 */
const TARGET_ACCURACY = 0.9;

type FreshQuestion = {
  id: number;
  topic: string;
  question: string;
  gold: { lawShort: string; articleNum: string }[];
};

type FreshFixture = {
  generated_at: string;
  total: number;
  questions: FreshQuestion[];
};

function isMatch(
  results: { law: string; lawShort: string; articleNum: string }[],
  gold: { lawShort: string; articleNum: string }[]
): boolean {
  return gold.some((g) =>
    results.some(
      (r) =>
        r.articleNum === g.articleNum &&
        (r.lawShort === g.lawShort ||
          r.law === g.lawShort ||
          isLawShortEquivalent(r.lawShort, g.lawShort))
    )
  );
}

const fixturePath = resolve(process.cwd(), "test/chatbot-fresh-100.json");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as FreshFixture;

describe("RAG 100問ベンチマーク (fresh)", () => {
  // 100問を逐次評価する CPU バウンドな処理で、コーパス拡張により CI 上で
  // 5秒のデフォルトを超えることがあるため timeout を 30秒に拡張する。
  // 精度判定（>= TARGET_ACCURACY）は assertion 側で担保しているので、
  // 実時間オーバーで失敗扱いになるのを防ぐのが目的。
  it(`fresh セットの正答率が ${TARGET_ACCURACY * 100}% 以上であること`, { timeout: 30000 }, () => {
    let correct = 0;
    const failures: Array<{
      id: number;
      topic: string;
      question: string;
      expected: string;
      actual: string;
    }> = [];

    for (const tc of fixture.questions) {
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

    const total = fixture.questions.length;
    const accuracy = correct / total;

    const topicBreakdown: Record<string, { total: number; correct: number; accuracy: number }> = {};
    const failedIds = new Set(failures.map((f) => f.id));
    for (const q of fixture.questions) {
      const slot = (topicBreakdown[q.topic] ??= { total: 0, correct: 0, accuracy: 0 });
      slot.total += 1;
      if (!failedIds.has(q.id)) slot.correct += 1;
    }
    for (const t of Object.values(topicBreakdown)) {
      t.accuracy = t.total === 0 ? 0 : t.correct / t.total;
    }

    const result = {
      generated_at: new Date().toISOString(),
      source: "test/chatbot-fresh-100.json",
      total,
      correct,
      accuracy,
      target: TARGET_ACCURACY,
      passed: accuracy >= TARGET_ACCURACY,
      failures,
      topic_breakdown: topicBreakdown,
    };

    const outPath = resolve(process.cwd(), "src/data/chatbot-eval-fresh-results.json");
    try {
      writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n", "utf8");
    } catch {
      // CI/読取専用 FS では書き込み失敗を許容（テストの主目的は精度判定）
    }

    console.log(
      `\n[RAG 100Q fresh] 正答 ${correct}/${total} = ${(accuracy * 100).toFixed(1)}%`
    );
    if (failures.length > 0) {
      console.log(`[RAG 100Q fresh] 不正答 ${failures.length} 件:`);
      for (const f of failures) {
        console.log(
          `  Q${f.id} [${f.topic}] ${f.question}\n    期待: ${f.expected}\n    取得: ${f.actual}`
        );
      }
    }

    expect(accuracy).toBeGreaterThanOrEqual(TARGET_ACCURACY);
  });
});
