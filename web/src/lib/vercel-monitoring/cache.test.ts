import { beforeEach, describe, expect, it } from "vitest";
import { clearCache, getCached, getStale, setCached } from "./cache";
import { buildMockSnapshot } from "./mock";

const NOW = new Date("2026-05-20T00:00:00Z").getTime();

describe("vercel-monitoring/cache", () => {
  beforeEach(() => {
    clearCache();
  });

  it("returns a stored snapshot until the TTL expires", () => {
    const snap = buildMockSnapshot(new Date(NOW));
    setCached("k1", snap, 1000, NOW);
    expect(getCached("k1", NOW + 500)).toBe(snap);
    expect(getCached("k1", NOW + 1500)).toBeNull();
  });

  it("returns the stale snapshot via getStale even after expiry", () => {
    const snap = buildMockSnapshot(new Date(NOW));
    setCached("k2", snap, 100, NOW);
    expect(getCached("k2", NOW + 200)).toBeNull();
    expect(getStale("k2")).toBe(snap);
  });

  it("returns null for unknown keys", () => {
    expect(getCached("missing", NOW)).toBeNull();
    expect(getStale("missing")).toBeNull();
  });
});
