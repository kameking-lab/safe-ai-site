import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SEARCH_QUALITY_HOLDOUT_2026_07_31 } from "@/data/search-quality-holdout-2026-07-31";
import { buildSearchIndexWithStatus } from "./search-index";
import { evaluateSearchQuality } from "./search-quality-evaluator";

const HOLDOUT_PATH = resolve(
  process.cwd(),
  "src/data/search-quality-holdout-2026-07-31.ts",
);
const CHECKSUM_PATH = resolve(
  process.cwd(),
  "src/data/search-quality-holdout-2026-07-31.sha256",
);

describe("2026-07-31 独立検索holdout", () => {
  it("実装前に固定したfixtureのchecksumと一次資料着地点を保持する", () => {
    const expected = readFileSync(CHECKSUM_PATH, "utf8").trim().split(/\s+/)[0];
    // Git may materialize text with CRLF on Windows. The immutable fixture
    // checksum is defined over its canonical LF representation.
    const canonicalFixture = readFileSync(HOLDOUT_PATH, "utf8").replace(
      /\r\n/gu,
      "\n",
    );
    const actual = createHash("sha256").update(canonicalFixture).digest("hex");
    expect(actual).toBe(expected);
    expect(SEARCH_QUALITY_HOLDOUT_2026_07_31).toHaveLength(13);
    expect(
      new Set(
        SEARCH_QUALITY_HOLDOUT_2026_07_31.map((item) => item.domain),
      ),
    ).toEqual(
      new Set([
        "law",
        "qualification",
        "education",
        "accident",
        "chemical",
        "ky",
      ]),
    );
    for (const item of SEARCH_QUALITY_HOLDOUT_2026_07_31) {
      expect(item.reviewedAt).toBe("2026-07-31");
      expect(item.officialLanding).toMatch(/^https:\/\//);
      expect(item.officialBasis.length).toBeGreaterThan(3);
    }
  });

  it(
    "固定holdoutを測定し、危険な見逃し・ゼロ件妥当性を独立出力する",
    async () => {
      const build = await buildSearchIndexWithStatus();
      const result = evaluateSearchQuality(
        build.items,
        SEARCH_QUALITY_HOLDOUT_2026_07_31,
        "2026-07-31T00:00:00+09:00",
      );
      const reportPath = process.env.SEARCH_HOLDOUT_REPORT_PATH;
      if (reportPath) {
        mkdirSync(dirname(reportPath), { recursive: true });
        writeFileSync(
          reportPath,
          `${JSON.stringify(
            {
              generatedAt: new Date().toISOString(),
              fixtureChecksum: readFileSync(CHECKSUM_PATH, "utf8")
                .trim()
                .split(/\s+/)[0],
              indexStatus: build.status,
              failedSources: build.failedSources,
              result,
            },
            null,
            2,
          )}\n`,
          "utf8",
        );
      }

      expect(build.status, build.failedSources.join(", ")).toBe("complete");
      expect(result.dangerousMisses).toEqual([]);
      expect(result.zeroResultValidity).toBe(1);
      expect(result.mrr).toBe(1);
      expect(result.officialLandingCoverage).toBe(1);
      expect(
        result.cases
          .filter((item) => !item.zeroExpected)
          .every(
            (item) =>
              item.officialLandingValid === true &&
              item.officialLandingMatched === true &&
              item.officialLandingMatchIds.length > 0 &&
              item.untrustedRelevantIds.length === 0,
          ),
      ).toBe(true);
      expect(Object.keys(result.byDomain)).toContain("education");
      expect(result.precisionAt5).toBe(
        result.eligiblePrecisionCeilingAt5,
      );
      expect(result.precisionAt10).toBe(
        result.eligiblePrecisionCeilingAt10,
      );
      // Two independently frozen relevant IDs point to routes that remain
      // quarantined by the public-content policy. They must not be reintroduced
      // merely to meet a benchmark; report both the mathematical and
      // safety-eligible ceilings without changing the fixture.
      expect(result.precisionCeilingAt5).toBeCloseTo(0.55, 12);
      expect(result.precisionCeilingAt10).toBeCloseTo(0.275, 12);
      expect(result.eligiblePrecisionCeilingAt5).toBeCloseTo(
        0.5166666666666666,
        12,
      );
      expect(result.eligiblePrecisionCeilingAt10).toBeCloseTo(
        0.2583333333333333,
        12,
      );
      expect(result.precisionAt5TargetMet).toBe(false);
      expect(result.precisionAt10TargetMet).toBe(false);
    },
    30_000,
  );
});
