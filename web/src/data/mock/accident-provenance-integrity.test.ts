import { describe, expect, it } from "vitest";
import {
  getAccidentCasesDataset,
  getAccidentProvenanceCounts,
} from "./accident-cases";
import { resolveAccidentProvenance } from "@/lib/accident-source";

describe("accident provenance integrity", () => {
  it("一次資料照合済み100620だけをmhlwとし、他の宣言はcuratedへ降格する", () => {
    const dataset = getAccidentCasesDataset();
    const counts = getAccidentProvenanceCounts();
    const verified = dataset.filter(
      (accident) => accident.provenance === "mhlw",
    );

    expect(verified.map((accident) => accident.id)).toEqual(["mhlw-100620"]);
    expect(counts.mhlw).toBe(1);
    expect(
      dataset
        .filter((accident) => accident.id !== "mhlw-100620")
        .some((accident) => accident.provenance === "mhlw"),
    ).toBe(false);
    expect(
      counts.mhlw +
        counts.curated +
        counts.preliminary +
        counts.synthetic,
    ).toBe(dataset.length);
  });

  it("synthetic/preliminaryレコードは公式機関を示すIDを使わない", () => {
    const misleading = getAccidentCasesDataset().filter((accident) => {
      const provenance = resolveAccidentProvenance(accident);
      return (
        (provenance === "synthetic" || provenance === "preliminary") &&
        /^mhlw[-_]/i.test(accident.id)
      );
    });

    expect(misleading.map((accident) => accident.id)).toEqual([]);
  });

  it("syntheticレコードは実在事故でないことを本文で明示する", () => {
    for (const accident of getAccidentCasesDataset().filter(
      (entry) => resolveAccidentProvenance(entry) === "synthetic",
    )) {
      expect(`${accident.title} ${accident.summary}`).toMatch(
        /架空|仮想|実在する個別事故ではありません|合成/,
      );
    }
  });
});
