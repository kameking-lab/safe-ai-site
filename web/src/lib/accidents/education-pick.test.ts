import { describe, expect, it } from "vitest";
import { pickEducationAccidents } from "@/lib/accidents/education-pick";
import type { AccidentCase } from "@/lib/types/domain";

function makeCase(
  id: string,
  provenance?: AccidentCase["provenance"],
): AccidentCase {
  return {
    id,
    title: `未検証事故 ${id}`,
    occurredOn: "2025-01-01",
    type: "墜落",
    workCategory: "建設業",
    severity: "死亡",
    summary: "足場から墜落したという未検証の説明",
    mainCauses: ["未検証の原因"],
    preventionPoints: ["未検証の対策"],
    provenance,
  };
}

describe("pickEducationAccidents source boundary", () => {
  it("一次資料との個別対応が未確認の事故を朝礼教材へ出さない", () => {
    const records = [
      makeCase("curated-1", "curated"),
      makeCase("synthetic-1", "synthetic"),
      makeCase("preliminary-1", "preliminary"),
    ];

    expect(
      pickEducationAccidents(records, { count: 3, seed: 1 }),
    ).toEqual([]);
  });

  it("mhlwラベルだけでは検証済みと扱わない", () => {
    const relabeled = [
      makeCase("mhlw-12345", "mhlw"),
      makeCase("mhlw-67890", "mhlw"),
    ];

    expect(
      pickEducationAccidents(relabeled, {
        category: "建設業",
        count: 2,
        seed: 5,
      }),
    ).toEqual([]);
  });
});
