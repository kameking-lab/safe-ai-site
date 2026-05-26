import { describe, expect, it } from "vitest";
import { aggregateMixture, hazardsFromFlags, type MixtureComponentInput } from "@/lib/chemical/mixture-ra";

const c = (over: Partial<MixtureComponentInput>): MixtureComponentInput => ({
  name: over.name ?? "X",
  cas: over.cas ?? "",
  weightPercent: over.weightPercent ?? null,
  lawFamilies: over.lawFamilies ?? [],
  hazards: over.hazards ?? [],
});

describe("aggregateMixture", () => {
  it("規制法ファミリー・有害性を和集合（重複排除）", () => {
    const r = aggregateMixture([
      c({ name: "A", lawFamilies: ["有機則", "化管法"], hazards: ["皮膚等障害のおそれ"] }),
      c({ name: "B", lawFamilies: ["化管法", "毒劇法"], hazards: ["発がんのおそれ"] }),
    ]);
    expect(r.lawFamilies).toEqual(["有機則", "化管法", "毒劇法"]);
    expect(r.hazards).toEqual(["皮膚等障害のおそれ", "発がんのおそれ"]);
    expect(r.hasCarcinogen).toBe(true);
    expect(r.componentCount).toBe(2);
  });

  it("合計%を集計し100超で警告", () => {
    const r = aggregateMixture([
      c({ name: "A", weightPercent: 70 }),
      c({ name: "B", weightPercent: 40 }),
    ]);
    expect(r.totalPercent).toBe(110);
    expect(r.warnings.some((w) => w.includes("100%を超え"))).toBe(true);
  });

  it("合計が100未満（全成分入力済）で残り注記の警告", () => {
    const r = aggregateMixture([
      c({ name: "A", weightPercent: 30 }),
      c({ name: "B", weightPercent: 20 }),
    ]);
    expect(r.warnings.some((w) => w.includes("残り"))).toBe(true);
  });

  it("1成分のみは2成分以上を促す警告", () => {
    const r = aggregateMixture([c({ name: "A", weightPercent: 100 })]);
    expect(r.warnings.some((w) => w.includes("2成分以上"))).toBe(true);
  });

  it("発がん性が無ければ hasCarcinogen=false", () => {
    const r = aggregateMixture([c({ hazards: ["皮膚等障害のおそれ"] })]);
    expect(r.hasCarcinogen).toBe(false);
  });
});

describe("hazardsFromFlags", () => {
  it("flags から有害性ラベルを導出", () => {
    expect(hazardsFromFlags({ carcinogenic: true, skin: true })).toEqual([
      "発がんのおそれ",
      "皮膚等障害のおそれ",
    ]);
    expect(hazardsFromFlags({})).toEqual([]);
  });
});
