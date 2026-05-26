import { describe, expect, it } from "vitest";
import {
  upsertRecord,
  mergeRecords,
  type ChemicalRaSavedRecord,
} from "@/lib/chemical/ra-cloud";

const mk = (raId: string, savedAt: string): ChemicalRaSavedRecord => ({
  raId,
  cas: "",
  substance: raId,
  workContent: "",
  exposureBand: "",
  payload: {},
  savedAt,
});

describe("upsertRecord", () => {
  it("新規追加し savedAt 降順", () => {
    let list: ChemicalRaSavedRecord[] = [];
    list = upsertRecord(list, mk("a", "2026-05-01T00:00:00Z"));
    list = upsertRecord(list, mk("b", "2026-05-03T00:00:00Z"));
    expect(list.map((r) => r.raId)).toEqual(["b", "a"]);
  });

  it("同一raIdは上書き（重複しない）", () => {
    let list = [mk("a", "2026-05-01T00:00:00Z")];
    list = upsertRecord(list, mk("a", "2026-05-05T00:00:00Z"));
    expect(list).toHaveLength(1);
    expect(list[0].savedAt).toBe("2026-05-05T00:00:00Z");
  });
});

describe("mergeRecords", () => {
  it("クラウドとローカルをraIdでマージ、新しい方を採用", () => {
    const local = [mk("a", "2026-05-01T00:00:00Z"), mk("b", "2026-05-02T00:00:00Z")];
    const cloud = [mk("a", "2026-05-09T00:00:00Z"), mk("c", "2026-05-03T00:00:00Z")];
    const merged = mergeRecords(local, cloud);
    expect(merged.map((r) => r.raId)).toEqual(["a", "c", "b"]);
    expect(merged.find((r) => r.raId === "a")?.savedAt).toBe("2026-05-09T00:00:00Z"); // cloud新しい
  });

  it("空同士は空", () => {
    expect(mergeRecords([], [])).toEqual([]);
  });
});
