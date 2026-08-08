import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { SEARCH_QUALITY_GOLD_2026_07_24 } from "@/data/search-quality-gold-2026-07-24";
import { buildSearchIndexWithStatus } from "./search-index";
import { evaluateSearchQuality } from "./search-quality-evaluator";

describe("人手作成の横断検索ゴールド評価", () => {
  it(
    "6分野を独立fixtureで測定し、危険な見逃しと不当なゼロ件を検知する",
    async () => {
      const build = await buildSearchIndexWithStatus();
      const result = evaluateSearchQuality(
        build.items,
        SEARCH_QUALITY_GOLD_2026_07_24,
        "2026-07-24T00:00:00+09:00",
      );
      const reportPath = process.env.SEARCH_QUALITY_REPORT_PATH;
      if (reportPath) {
        mkdirSync(dirname(reportPath), { recursive: true });
        writeFileSync(
          reportPath,
          `${JSON.stringify(
            {
              generatedAt: new Date().toISOString(),
              indexStatus: build.status,
              failedSources: build.failedSources,
              goldSetReviewedAt: "2026-07-24",
              result,
            },
            null,
            2,
          )}\n`,
          "utf8",
        );
      }

      expect(build.status, `failed sources: ${build.failedSources.join(", ")}`).toBe(
        "complete",
      );
      expect(Object.keys(result.byDomain).sort()).toEqual(
        ["accident", "chemical", "guide", "ky", "law", "qualification"].sort(),
      );
      expect(result.dangerousMisses).toEqual([]);
      expect(
        result.zeroResultValidity,
        `invalid zero cases: ${result.cases
          .filter((item) => item.zeroExpected && !item.zeroValid)
          .map((item) => `${item.id}=${item.returnedIds.join("|")}`)
          .join(", ")}`,
      ).toBe(1);
      expect(result.mrr).toBeGreaterThanOrEqual(0.8);
      expect(result.precisionAt5).toBeGreaterThanOrEqual(
        0.41666666666666674,
      );
      expect(result.precisionAt10).toBeGreaterThan(
        0.21666666666666667,
      );
      for (const [domain, metrics] of Object.entries(result.byDomain)) {
        expect(metrics.cases, `${domain} gold cases`).toBeGreaterThanOrEqual(2);
      }
    },
    30_000,
  );

  it("ゴールド値を検索結果から生成するフィールドを持たない", () => {
    for (const goldCase of SEARCH_QUALITY_GOLD_2026_07_24) {
      expect(goldCase.reviewedAt).toBe("2026-07-24");
      expect("expectedFromSearch" in goldCase).toBe(false);
      if (goldCase.dangerousIfMissing) {
        expect(goldCase.primaryRequiredIds?.length).toBeGreaterThan(0);
        expect(
          goldCase.primaryRequiredIds?.every((id) =>
            goldCase.relevantIds.includes(id),
          ),
        ).toBe(true);
      }
    }
  });
});
