import { describe, expect, it } from "vitest";
import { findAccidentsBySubstance } from "@/lib/chemical/accident-cross-search";
import type { AccidentCase } from "@/lib/types/domain";

function makeCase(
  id: string,
  provenance?: AccidentCase["provenance"],
): AccidentCase {
  return {
    id,
    title: "ジクロロメタン槽の事故という未検証タイトル",
    occurredOn: "2025-01-01",
    type: "有害物等との接触",
    workCategory: "製造業",
    severity: "重傷",
    summary: "トルエンを含むという未検証の説明",
    mainCauses: ["未検証の物質情報"],
    preventionPoints: ["未検証の対策"],
    provenance,
  };
}

describe("findAccidentsBySubstance source boundary", () => {
  it("物質名が一致しても個別出典未確認の事故を表示しない", () => {
    const records = [
      makeCase("curated-1", "curated"),
      makeCase("synthetic-1", "synthetic"),
      makeCase("preliminary-1", "preliminary"),
    ];

    expect(findAccidentsBySubstance("ジクロロメタン", records)).toEqual([]);
    expect(findAccidentsBySubstance("トルエン", records)).toEqual([]);
  });

  it("別名やmhlwラベルで検証境界を迂回できない", () => {
    const relabeled = [makeCase("mhlw-12345", "mhlw")];

    expect(
      findAccidentsBySubstance("塩化メチレン", relabeled, {
        aliases: ["ジクロロメタン"],
      }),
    ).toEqual([]);
  });

  it("空入力と短すぎる入力を受け付けない", () => {
    const records = [makeCase("curated-1", "curated")];
    expect(findAccidentsBySubstance("水", records)).toEqual([]);
    expect(findAccidentsBySubstance("", records)).toEqual([]);
    expect(findAccidentsBySubstance(null, records)).toEqual([]);
  });
});
