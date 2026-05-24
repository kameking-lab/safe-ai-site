import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  loadKySuggestionHistory,
  recordKySuggestionUsage,
  suggestKyByIndustryAndWork,
} from "./ky-suggestion";
import { KY_EXAMPLES } from "@/data/ky-examples";
import type { KyExample } from "@/types/ky-example";

describe("suggestKyByIndustryAndWork", () => {
  it("returns empty array when no signal is provided", () => {
    const result = suggestKyByIndustryAndWork({});
    expect(result).toEqual([]);
  });

  it("filters strictly by industry when only industry is provided", () => {
    const result = suggestKyByIndustryAndWork({ industry: "construction" });
    expect(result.length).toBeGreaterThan(0);
    for (const r of result) {
      expect(r.example.industry).toBe("construction");
      expect(r.matchedOn).toContain("industry");
    }
  });

  it("filters strictly by both industry and workType together", () => {
    const result = suggestKyByIndustryAndWork({
      industry: "construction",
      workType: "fall-work",
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(12);
    for (const r of result) {
      expect(r.example.industry).toBe("construction");
      expect(r.example.workType).toBe("fall-work");
    }
  });

  it("boosts results when keywords match the example text", () => {
    const result = suggestKyByIndustryAndWork({
      industry: "construction",
      workType: "fall-work",
      freeText: "鉄骨 親綱",
    });
    expect(result.length).toBeGreaterThan(0);
    const top = result[0];
    expect(top.matchedOn).toContain("keyword");
    expect(top.example.id).toBe("ct-fall-001");
  });

  it("ranks history-used examples higher when scores tie", () => {
    const baseline = suggestKyByIndustryAndWork({
      industry: "manufacturing",
      workType: "machine",
    });
    expect(baseline.length).toBeGreaterThan(1);

    const lastEx = baseline[baseline.length - 1].example.id;
    const withHistory = suggestKyByIndustryAndWork({
      industry: "manufacturing",
      workType: "machine",
      history: [{ exampleId: lastEx, at: Date.now() }],
    });

    const baselineRank = baseline.findIndex((r) => r.example.id === lastEx);
    const historyRank = withHistory.findIndex((r) => r.example.id === lastEx);
    expect(historyRank).toBeLessThan(baselineRank);
  });

  it("respects the limit option", () => {
    const result = suggestKyByIndustryAndWork({
      industry: "construction",
      limit: 5,
    });
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("returns Recall@5 >= 0.6 against canonical industry+workType queries", () => {
    // Synthesize ground truth: each example is the canonical "best match" for
    // its own (industry, workType, title) triple. We pick a small sample of
    // queries and check that the original example appears in the top-5 result.
    const samples: KyExample[] = pickSamples(KY_EXAMPLES, 30);
    let hits = 0;
    for (const ex of samples) {
      const result = suggestKyByIndustryAndWork({
        industry: ex.industry,
        workType: ex.workType,
        freeText: ex.title,
        limit: 5,
      });
      if (result.slice(0, 5).some((r) => r.example.id === ex.id)) hits++;
    }
    const recall = hits / samples.length;
    expect(recall).toBeGreaterThanOrEqual(0.6);
  });
});

// Regression: /ky used to crash with React error #185 (Maximum update depth
// exceeded) for new users because loadKySuggestionHistory returned a fresh
// array reference on every call. useSyncExternalStore's getSnapshot must
// return a stable reference when the underlying data has not changed.
describe("loadKySuggestionHistory snapshot stability", () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    const stub: Storage = {
      get length() {
        return Object.keys(storage).length;
      },
      clear() {
        storage = {};
      },
      getItem(key: string) {
        return key in storage ? storage[key] : null;
      },
      key(i: number) {
        return Object.keys(storage)[i] ?? null;
      },
      removeItem(key: string) {
        delete storage[key];
      },
      setItem(key: string, value: string) {
        storage[key] = value;
      },
    };
    vi.stubGlobal("window", {
      localStorage: stub,
      dispatchEvent: vi.fn(() => true),
    });
    // First call after stub reset must read the fresh state, not a leftover
    // cached snapshot from a previous test.
    loadKySuggestionHistory();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the same reference across calls when localStorage is empty", () => {
    const a = loadKySuggestionHistory();
    const b = loadKySuggestionHistory();
    const c = loadKySuggestionHistory();
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(a).toEqual([]);
  });

  it("returns the same reference across calls when localStorage has data", () => {
    recordKySuggestionUsage("ct-fall-001");
    const a = loadKySuggestionHistory();
    const b = loadKySuggestionHistory();
    expect(a).toBe(b);
    expect(a.length).toBe(1);
    expect(a[0].exampleId).toBe("ct-fall-001");
  });

  it("returns a new reference after recordKySuggestionUsage updates storage", () => {
    const before = loadKySuggestionHistory();
    recordKySuggestionUsage("ct-fall-001");
    const after = loadKySuggestionHistory();
    expect(after).not.toBe(before);
    expect(after.length).toBe(1);
  });

  it("returns a stable empty reference when localStorage contains malformed JSON", () => {
    storage["ky-suggestion-history-v1"] = "{not valid json";
    const a = loadKySuggestionHistory();
    const b = loadKySuggestionHistory();
    expect(a).toBe(b);
    expect(a).toEqual([]);
  });

  it("returns a stable empty reference when localStorage contains non-array JSON", () => {
    storage["ky-suggestion-history-v1"] = JSON.stringify({ unexpected: true });
    const a = loadKySuggestionHistory();
    const b = loadKySuggestionHistory();
    expect(a).toBe(b);
    expect(a).toEqual([]);
  });
});

function pickSamples<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return [...arr];
  const step = Math.floor(arr.length / n);
  const out: T[] = [];
  for (let i = 0; i < arr.length && out.length < n; i += step) {
    out.push(arr[i]);
  }
  return out;
}
