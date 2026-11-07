import { describe, expect, it } from "vitest";
import { CONCENTRATION_LIMITS, getAllMergedChemicals, normalizeCas } from "@/lib/mhlw-chemicals";
import { getAllMergedChemicalsSlim } from "@/lib/mhlw-chemicals-slim";
import { hasChemicalDetail } from "./detail-availability";

describe("化学DB一覧から存在する詳細だけを開く", () => {
  it("全量・軽量索引の全件で、詳細routeの収録有無と一致する", () => {
    for (const chemicals of [getAllMergedChemicals(), getAllMergedChemicalsSlim()]) {
      for (const chemical of chemicals) {
        const exists = Boolean(chemical.cas && CONCENTRATION_LIMITS.substances[normalizeCas(chemical.cas)]);
        expect(hasChemicalDetail(chemical), chemical.cas ?? chemical.primaryName).toBe(exists);
      }
    }
  });

  it.each(["141-90-2", "28553-12-0", "13598-36-2"])("掲載情報だけの%sは検索に残し、空の詳細へ誘導しない", (cas) => {
    const chemical = getAllMergedChemicalsSlim().find((entry) => entry.cas === cas);
    expect(chemical).toBeDefined();
    expect(hasChemicalDetail(chemical!)).toBe(false);
  });
});
