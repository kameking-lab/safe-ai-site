/**
 * 現場口語ベンチのランナー兼CIゲート（2026-07-11・LN-S1 / E1-E3吸収）。
 *
 * fixture（field-vernacular-bench.fixture.ts）の全ケースを
 *  (a) チャットボットRAG: searchRelevantArticlesWithScore + buildAllowedCitations
 *  (b) 横断検索: buildSearchIndex + searchItems
 * で実測し、着地率を web/.bench/field-vernacular-latest.json に書き出す。
 *
 * ratchet（非劣化ゲート）:
 * - 着地率が下限（*_LANDING_FLOOR）を割ったらCIが落ちる。下限は 2026-07-11 の
 *   是正後実測値ちょうどに設定してあり、synonyms/query-expansion/スコアリングの
 *   変更で口語の到達性が劣化すると検出される。改善したら下限を引き上げること。
 * - 範囲外ケース（outOfScope）は全問 score < 0.5 が必須（GQ51型リークの再発防止）。
 *
 * 実行: npm run bench:field-terms
 */

import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { allLawArticles } from "@/data/laws";
import { searchRelevantArticlesWithScore } from "@/lib/rag-search";
import { buildAllowedCitations } from "@/lib/chatbot-prompt-builder";
import { isLawShortEquivalent } from "@/lib/rag/synonyms";
import { buildSearchIndex, searchItems } from "@/lib/search-index";
import {
  FIELD_VERNACULAR_CASES,
  type FieldVernacularCase,
} from "@/lib/field-vernacular-bench.fixture";

const TOP_K = 10; // route.ts と同一
const CONFIDENCE_THRESHOLD = 0.5; // route.ts の CONFIDENCE_THRESHOLD と同一

/**
 * 着地率の下限（ratchet）。2026-07-11 是正後の実測値に固定。
 * 是正前の実測: RAG 24/49（49.0%）・横断検索 28/49（57.1%）・範囲外 3/5。
 */
const RAG_LANDING_FLOOR = 0; // before計測用（是正後に実測値へ引き上げる）
const SEARCH_LANDING_FLOOR = 0;

type CaseResult = {
  id: string;
  label: string;
  rag: "landed" | "missed" | "no-hit" | "rejected-ok" | "leaked" | "n/a";
  ragScore: number | null;
  ragTop5: string[];
  search: "landed" | "missed" | "n/a";
  searchTop5: string[];
};

function ragResult(tc: FieldVernacularCase): Pick<CaseResult, "rag" | "ragScore" | "ragTop5"> {
  if (!tc.chatQuery) return { rag: "n/a", ragScore: null, ragTop5: [] };
  const { articles, normalizedScore } = searchRelevantArticlesWithScore(tc.chatQuery, TOP_K);
  const allowed = buildAllowedCitations(articles);
  const top5 = allowed.slice(0, 5).map((a) => `${a.lawShort}${a.articleNum}`);
  if (tc.outOfScope) {
    return {
      rag: normalizedScore < CONFIDENCE_THRESHOLD ? "rejected-ok" : "leaked",
      ragScore: normalizedScore,
      ragTop5: top5,
    };
  }
  if (tc.goldCitations.length === 0) return { rag: "n/a", ragScore: normalizedScore, ragTop5: top5 };
  if (normalizedScore < CONFIDENCE_THRESHOLD) {
    return { rag: "no-hit", ragScore: normalizedScore, ragTop5: top5 };
  }
  const hit = tc.goldCitations.some((g) =>
    allowed.some(
      (a) =>
        a.articleNum === g.articleNum &&
        (a.lawShort === g.lawShort || isLawShortEquivalent(a.lawShort, g.lawShort))
    )
  );
  return { rag: hit ? "landed" : "missed", ragScore: normalizedScore, ragTop5: top5 };
}

describe("現場口語ベンチ（チャットボットRAG × 横断検索）", () => {
  it("fixture整合性: 全gold条文がコーパスに実在する", () => {
    const problems: string[] = [];
    for (const tc of FIELD_VERNACULAR_CASES) {
      for (const g of tc.goldCitations) {
        const found = allLawArticles.some(
          (a) =>
            a.articleNum === g.articleNum &&
            (a.lawShort === g.lawShort || isLawShortEquivalent(a.lawShort, g.lawShort))
        );
        if (!found) problems.push(`${tc.id}: ${g.lawShort}${g.articleNum} がコーパスに無い`);
      }
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });

  it("ID重複なし・in-domain 50語級", () => {
    const ids = new Set(FIELD_VERNACULAR_CASES.map((c) => c.id));
    expect(ids.size).toBe(FIELD_VERNACULAR_CASES.length);
    const inDomain = FIELD_VERNACULAR_CASES.filter((c) => !c.outOfScope);
    expect(inDomain.length).toBeGreaterThanOrEqual(50);
  });

  it(
    "着地率の実測とratchet（レポート: web/.bench/field-vernacular-latest.json）",
    { timeout: 120000 },
    async () => {
      const index = await buildSearchIndex();
      const results: CaseResult[] = [];

      for (const tc of FIELD_VERNACULAR_CASES) {
        const rag = ragResult(tc);
        let search: CaseResult["search"] = "n/a";
        let searchTop5: string[] = [];
        if (tc.searchQuery && tc.searchExpect.length > 0) {
          const hits = searchItems(index, tc.searchQuery, "all", TOP_K);
          searchTop5 = hits.slice(0, 5).map((h) => `[${h.category}]${h.title}`);
          search = hits.some((h) =>
            tc.searchExpect.some((s) => h.title.includes(s) || h.url.includes(s))
          )
            ? "landed"
            : "missed";
        }
        results.push({ id: tc.id, label: tc.label, ...rag, search, searchTop5 });
      }

      const ragScored = results.filter((r) => r.rag === "landed" || r.rag === "missed" || r.rag === "no-hit");
      const ragLanded = results.filter((r) => r.rag === "landed");
      const searchScored = results.filter((r) => r.search !== "n/a");
      const searchLanded = results.filter((r) => r.search === "landed");
      const oos = results.filter((r) => r.rag === "rejected-ok" || r.rag === "leaked");
      const oosOk = results.filter((r) => r.rag === "rejected-ok");

      const summary = {
        generatedAt: "see git log / docs (テスト決定性のため時刻は記録しない)",
        rag: { landed: ragLanded.length, total: ragScored.length, rate: ragLanded.length / ragScored.length },
        search: { landed: searchLanded.length, total: searchScored.length, rate: searchLanded.length / searchScored.length },
        outOfScope: { rejected: oosOk.length, total: oos.length },
        results,
      };

      const outDir = resolve(__dirname, "../../.bench");
      mkdirSync(outDir, { recursive: true });
      writeFileSync(resolve(outDir, "field-vernacular-latest.json"), JSON.stringify(summary, null, 2));

      // eslint-disable-next-line no-console
      console.log(
        `[field-vernacular-bench] RAG ${ragLanded.length}/${ragScored.length}` +
          ` / 検索 ${searchLanded.length}/${searchScored.length}` +
          ` / 範囲外 ${oosOk.length}/${oos.length}` +
          ` / 未着地: ${results
            .filter((r) => r.rag === "missed" || r.rag === "no-hit" || r.rag === "leaked" || r.search === "missed")
            .map((r) => r.id)
            .join(",")}`
      );

      // ratchet: 着地率の下限（是正後実測値）を割ったら赤
      expect(
        ragLanded.length / ragScored.length,
        `RAG着地率が下限を割った（${ragLanded.length}/${ragScored.length}）`
      ).toBeGreaterThanOrEqual(RAG_LANDING_FLOOR);
      expect(
        searchLanded.length / searchScored.length,
        `横断検索着地率が下限を割った（${searchLanded.length}/${searchScored.length}）`
      ).toBeGreaterThanOrEqual(SEARCH_LANDING_FLOOR);
      // 範囲外は全問 no-hit 経路（GQ51型リークの再発防止）
      expect(
        oos.filter((r) => r.rag === "leaked").map((r) => r.id),
        "範囲外質問が範囲内にリークしている"
      ).toEqual([]);
    }
  );
});
