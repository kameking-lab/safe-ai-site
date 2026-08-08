import { describe, expect, it } from "vitest";
import { searchRelevantArticlesWithScore } from "@/lib/rag-search";

const PARAPHRASE_GOLD = [
  {
    id: "NP01",
    query: "昼の休憩はどれくらい必要？",
    expected: [{ lawShort: "労基法", articleNum: "第34条" }],
  },
  {
    id: "NP02",
    query: "ヘルメットが必須になるのはどんな時？",
    expected: [{ lawShort: "安衛則", articleNum: "第539条" }],
  },
  {
    id: "NP03",
    query: "ショベルカーを操縦するには講習が必要？",
    expected: [
      { lawShort: "安衛法", articleNum: "第61条" },
      { lawShort: "安衛令", articleNum: "第20条" },
    ],
  },
  {
    id: "NP04",
    query: "溶接する人は免許が要る？",
    expected: [
      { lawShort: "安衛法", articleNum: "第61条" },
      { lawShort: "安衛令", articleNum: "第20条" },
    ],
  },
  {
    id: "NP05",
    query: "脚立を使う時の安全ルールは？",
    expected: [
      { lawShort: "安衛則", articleNum: "第526条" },
      { lawShort: "安衛則", articleNum: "第518条" },
    ],
  },
  {
    id: "NP06",
    query: "ディスクグラインダーの砥石交換に講習は必要？",
    expected: [{ lawShort: "安衛則", articleNum: "第36条" }],
  },
] as const;

describe("RAG natural paraphrase gold set", () => {
  it.each(PARAPHRASE_GOLD)(
    "$id: unused field-language paraphrase reaches a verified primary article",
    ({ query, expected }) => {
      const result = searchRelevantArticlesWithScore(query, 10);
      expect(result.normalizedScore).toBeGreaterThanOrEqual(0.5);
      expect(
        expected.some((gold) =>
          result.articles.some(
            (article) =>
              article.lawShort === gold.lawShort &&
              article.articleNum === gold.articleNum,
          ),
        ),
      ).toBe(true);
      expect(
        result.articles.every(
          (article) =>
            article.sourceKind === "egov-fulltext-snapshot" &&
            article.verificationStatus === "snapshot-hash-verified",
        ),
      ).toBe(true);
    },
  );
});
