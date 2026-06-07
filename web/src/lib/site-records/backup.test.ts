import { describe, it, expect } from "vitest";
import {
  serializeBackup,
  parseBackup,
  isBackupKey,
  BACKUP_VERSION,
} from "./backup";

describe("isBackupKey", () => {
  it("safe-ai: 名前空間のみ true", () => {
    expect(isBackupKey("safe-ai:patrol-list:v1")).toBe(true);
    expect(isBackupKey("theme")).toBe(false);
    expect(isBackupKey("evil")).toBe(false);
  });
});

describe("serializeBackup / parseBackup", () => {
  it("round-trip でデータが保持される", () => {
    const data = { "safe-ai:patrol-list:v1": "[1,2,3]", "safe-ai:near": "x" };
    const json = serializeBackup(data, "2026-07-01T00:00:00.000Z");
    const parsed = parseBackup(json);
    expect(parsed).not.toBeNull();
    expect(parsed!.version).toBe(BACKUP_VERSION);
    expect(parsed!.data).toEqual(data);
  });

  it("不正JSONは null", () => {
    expect(parseBackup("{not json")).toBeNull();
    expect(parseBackup("123")).toBeNull();
    expect(parseBackup("null")).toBeNull();
  });

  it("data欠落・配列は null", () => {
    expect(parseBackup(JSON.stringify({ version: 1 }))).toBeNull();
    expect(parseBackup(JSON.stringify({ version: 1, data: [] }))).toBeNull();
  });

  it("文字列でない値は除外して取り込む", () => {
    const parsed = parseBackup(JSON.stringify({ version: 1, data: { a: "ok", b: 5, c: "x" } }));
    expect(parsed!.data).toEqual({ a: "ok", c: "x" });
  });
});
