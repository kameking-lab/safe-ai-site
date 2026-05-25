import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrateLegacyKyRecord } from "@/lib/ky/storage-migration";

const CURRENT_KEY = "ky-record";
const LEGACY_MANUAL_KEY = "safe-ai:ky-instruction-record:v1";

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe("migrateLegacyKyRecord", () => {
  it("ky-record が空で旧キーにデータがあれば引き継ぐ", () => {
    localStorage.setItem(LEGACY_MANUAL_KEY, JSON.stringify({ siteName: "旧現場" }));
    expect(migrateLegacyKyRecord()).toBe(true);
    const migrated = JSON.parse(localStorage.getItem(CURRENT_KEY) ?? "{}");
    expect(migrated.siteName).toBe("旧現場");
  });

  it("ky-record に既存データがあれば触らない（冪等・非破壊）", () => {
    localStorage.setItem(CURRENT_KEY, JSON.stringify({ siteName: "現行" }));
    localStorage.setItem(LEGACY_MANUAL_KEY, JSON.stringify({ siteName: "旧現場" }));
    expect(migrateLegacyKyRecord()).toBe(false);
    const cur = JSON.parse(localStorage.getItem(CURRENT_KEY) ?? "{}");
    expect(cur.siteName).toBe("現行");
  });

  it("旧キーが無ければ何もしない", () => {
    expect(migrateLegacyKyRecord()).toBe(false);
    expect(localStorage.getItem(CURRENT_KEY)).toBeNull();
  });

  it("旧キーが壊れていても安全に false", () => {
    localStorage.setItem(LEGACY_MANUAL_KEY, "not-json{");
    expect(migrateLegacyKyRecord()).toBe(false);
  });
});
