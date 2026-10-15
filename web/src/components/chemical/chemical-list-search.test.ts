import { describe, expect, it, vi } from "vitest";
import { getAllMergedChemicalsSlim } from "@/lib/mhlw-chemicals-slim";
import {
  consumeChemicalListSnapshot,
  rankChemicalMatches,
  rankMergedChemicals,
  stageChemicalListSnapshot,
  type ChemicalListSnapshot,
} from "./chemical-list-search";

const catalog = getAllMergedChemicalsSlim();

function snapshot(query: string): ChemicalListSnapshot {
  return {
    sourcePathAndSearch: "/chemical-database",
    mode: "mhlw", query, category: "", skinOnly: false,
    selectedTags: ["yuki-1"], tagMatchMode: "or", constructionOnly: true,
    scrollY: 720,
  };
}

describe("chemical list relevance", () => {
  it("puts the real toluene identity ahead of earlier partial name matches", () => {
    const matches = rankMergedChemicals(catalog, "トルエン");
    expect(matches[0]?.cas).toBe("108-88-3");
    expect(matches.some((item) => item.cas === "98-87-3")).toBe(true);
    expect(rankMergedChemicals(catalog, "108-88-3")[0]?.primaryName).toBe("トルエン");
  });

  it("uses stored aliases as exact identities and preserves order within a tier", () => {
    const matches = rankMergedChemicals(catalog, "メタクリル酸アリル");
    expect(matches[0]?.cas).toBe("96-05-9");
    expect(rankChemicalMatches(["クロロトルエンA", "トルエン類A", "トルエン", "クロロトルエンB", "トルエン類B"], "トルエン", (name) => [name])).toEqual([
      "トルエン", "トルエン類A", "トルエン類B", "クロロトルエンA", "クロロトルエンB",
    ]);
  });
});

describe("chemical list return state", () => {
  it("keeps query and filters in tab memory only and consumes them once", () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    const pushState = vi.spyOn(window.history, "pushState");
    const localWrite = vi.spyOn(Storage.prototype, "setItem");
    const beforeUrl = window.location.href;
    const value = snapshot("トルエン 任意の検索語");
    stageChemicalListSnapshot(value);
    expect(consumeChemicalListSnapshot()).toEqual(value);
    expect(consumeChemicalListSnapshot()).toBeNull();
    expect(window.location.href).toBe(beforeUrl);
    expect(replaceState).not.toHaveBeenCalled();
    expect(pushState).not.toHaveBeenCalled();
    expect(localWrite).not.toHaveBeenCalled();
    replaceState.mockRestore();
    pushState.mockRestore();
    localWrite.mockRestore();
  });
});
