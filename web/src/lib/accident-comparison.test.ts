import { describe, expect, test } from "vitest";
import {
  DEFAULT_COMPARE_INDUSTRIES,
  MAX_COMPARE_INDUSTRIES,
  MIN_COMPARE_INDUSTRIES,
  buildAccidentTypeMatrix,
  buildComparisonDataset,
  buildDangerFactorMatrix,
  buildDifferentialHighlights,
  buildLeaderboard,
  buildMonthlyOverlay,
  canonicalIndustryKey,
  parseIndustryParam,
  type ComparisonRow,
} from "./accident-comparison";

describe("parseIndustryParam", () => {
  test("undefined → falls back to the 5 defaults", () => {
    const out = parseIndustryParam(undefined);
    expect(out).toEqual([...DEFAULT_COMPARE_INDUSTRIES]);
  });

  test("single slug under MIN → falls back to defaults", () => {
    const out = parseIndustryParam("construction");
    expect(out.length).toBeGreaterThanOrEqual(MIN_COMPARE_INDUSTRIES);
  });

  test("two valid slugs are preserved in order", () => {
    const out = parseIndustryParam("manufacturing,construction");
    expect(out).toEqual(["manufacturing", "construction"]);
  });

  test("unknown slugs are silently dropped", () => {
    const out = parseIndustryParam("construction,not-a-slug,healthcare");
    expect(out).toEqual(["construction", "healthcare"]);
  });

  test("duplicates are de-duped, first occurrence wins", () => {
    const out = parseIndustryParam("transport,transport,construction");
    expect(out).toEqual(["transport", "construction"]);
  });

  test("more than MAX entries are truncated", () => {
    const raw =
      "construction,manufacturing,transport,healthcare,service,construction";
    const out = parseIndustryParam(raw);
    expect(out.length).toBeLessThanOrEqual(MAX_COMPARE_INDUSTRIES);
  });

  test("array input is joined and parsed", () => {
    const out = parseIndustryParam(["construction", "healthcare"]);
    expect(out).toEqual(["construction", "healthcare"]);
  });
});

describe("canonicalIndustryKey", () => {
  test("sorts slugs alphabetically", () => {
    expect(canonicalIndustryKey(["transport", "construction"])).toBe(
      "construction,transport",
    );
  });

  test("identical input sets produce the same key regardless of order", () => {
    const a = canonicalIndustryKey([
      "construction",
      "manufacturing",
      "healthcare",
    ]);
    const b = canonicalIndustryKey([
      "healthcare",
      "construction",
      "manufacturing",
    ]);
    expect(a).toBe(b);
  });
});

describe("buildComparisonDataset", () => {
  test("returns one row per requested slug, in order", () => {
    const ds = buildComparisonDataset(["construction", "healthcare"]);
    expect(ds.rows.map((r) => r.slug)).toEqual(["construction", "healthcare"]);
  });

  test("populates per-row fatalRate and lostWorkdayRate as [0,1]", () => {
    const ds = buildComparisonDataset(["construction", "manufacturing"]);
    for (const r of ds.rows) {
      expect(r.fatalRate).toBeGreaterThanOrEqual(0);
      expect(r.fatalRate).toBeLessThanOrEqual(1);
      expect(r.lostWorkdayRate).toBeGreaterThanOrEqual(0);
      expect(r.lostWorkdayRate).toBeLessThanOrEqual(1);
    }
  });

  test("totalCases equals the sum of per-industry totals", () => {
    const ds = buildComparisonDataset([
      "construction",
      "manufacturing",
      "transport",
    ]);
    const sum = ds.rows.reduce((s, r) => s + r.report.stats.total, 0);
    expect(ds.totalCases).toBe(sum);
  });

  test("monthlyOverlay always returns 12 points covering Jan-Dec", () => {
    const ds = buildComparisonDataset(["construction", "healthcare"]);
    expect(ds.monthlyOverlay.points).toHaveLength(12);
    expect(ds.monthlyOverlay.points[0].month).toBe(1);
    expect(ds.monthlyOverlay.points[11].month).toBe(12);
  });

  test("matrices are length-5 by default", () => {
    const ds = buildComparisonDataset(["construction", "manufacturing"]);
    expect(ds.accidentTypeMatrix).toHaveLength(5);
    expect(ds.causeMatrix).toHaveLength(5);
    expect(ds.dangerFactorMatrix).toHaveLength(5);
  });

  test("leaderboard contains the 6 documented metrics", () => {
    const ds = buildComparisonDataset(["construction", "service"]);
    const keys = ds.leaderboard.map((e) => e.key);
    expect(keys).toEqual([
      "total",
      "fatal",
      "fatalRate",
      "lostWorkday",
      "lostWorkdayRate",
      "yoyGrowth",
    ]);
  });
});

describe("buildDifferentialHighlights", () => {
  test("returns empty list when comparison has fewer than 2 rows", () => {
    const out = buildDifferentialHighlights([]);
    expect(out).toEqual([]);
  });

  test("real datasets surface at least one highlight for the 5-bucket case", () => {
    const ds = buildComparisonDataset([...DEFAULT_COMPARE_INDUSTRIES]);
    expect(ds.highlights.length).toBeGreaterThan(0);
    for (const h of ds.highlights) {
      expect(h.sentence).toMatch(/^[^\s]/);
      expect(["rose", "amber", "emerald", "slate"]).toContain(h.tone);
    }
  });

  test("output is capped at 5 highlights", () => {
    const ds = buildComparisonDataset([...DEFAULT_COMPARE_INDUSTRIES]);
    expect(ds.highlights.length).toBeLessThanOrEqual(5);
  });
});

describe("buildLeaderboard", () => {
  test("best and worst are different slugs when spread > 0", () => {
    const ds = buildComparisonDataset([...DEFAULT_COMPARE_INDUSTRIES]);
    const board = buildLeaderboard(ds.rows);
    const totalEntry = board.find((e) => e.key === "total");
    expect(totalEntry?.best).toBeTruthy();
    expect(totalEntry?.worst).toBeTruthy();
    expect(totalEntry?.best?.slug).not.toBe(totalEntry?.worst?.slug);
  });
});

describe("buildAccidentTypeMatrix / buildDangerFactorMatrix", () => {
  test("matrix shape matches requested topN and row count", () => {
    const ds = buildComparisonDataset([
      "construction",
      "manufacturing",
      "healthcare",
    ]);
    const m = buildAccidentTypeMatrix(ds.rows, 3);
    expect(m).toHaveLength(3);
    for (const row of m) {
      expect(Object.keys(row.cells).sort()).toEqual([
        "construction",
        "healthcare",
        "manufacturing",
      ]);
    }
  });

  test("danger factor matrix includes hint text on populated cells", () => {
    const ds = buildComparisonDataset(["construction", "manufacturing"]);
    const m = buildDangerFactorMatrix(ds.rows, 5);
    for (const row of m) {
      for (const r of ds.rows) {
        const cell = row.cells[r.slug];
        if (cell) {
          expect(typeof cell.hint).toBe("string");
          expect(cell.hint.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe("buildMonthlyOverlay", () => {
  test("each point exposes a numeric value per industry slug", () => {
    const ds = buildComparisonDataset(["construction", "healthcare"]);
    const overlay = buildMonthlyOverlay(ds.rows);
    expect(overlay.slugs).toEqual(["construction", "healthcare"]);
    for (const p of overlay.points) {
      expect(typeof p.construction).toBe("number");
      expect(typeof p.healthcare).toBe("number");
    }
  });

  test("empty rows produce 12 zero points", () => {
    const overlay = buildMonthlyOverlay([] as ComparisonRow[]);
    expect(overlay.points).toHaveLength(12);
    expect(overlay.slugs).toEqual([]);
  });
});
