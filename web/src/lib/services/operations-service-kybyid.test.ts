import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createOperationsService, normalizeKyInstructionRecord } from "@/lib/services/operations-service";

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe("operations-service: 過去KY by-id ストア（P0-A）", () => {
  it("保存した各KYを id で full record として取り出せる", async () => {
    const ops = createOperationsService();
    vi.setSystemTime(new Date("2026-05-20T00:00:00Z"));
    await ops.saveKyInstructionRecord(normalizeKyInstructionRecord({ siteName: "現場1" }));
    vi.setSystemTime(new Date("2026-05-21T00:00:00Z"));
    await ops.saveKyInstructionRecord(normalizeKyInstructionRecord({ siteName: "現場2" }));

    const list = await ops.getKyRecordList();
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.data).toHaveLength(2);
    for (const s of list.data) {
      const got = await ops.getKyRecordById(s.id);
      expect(got.ok).toBe(true);
      if (got.ok) expect(got.data?.siteName).toBe(s.siteName);
    }
  });

  it("削除で一覧と by-id の両方から消える", async () => {
    const ops = createOperationsService();
    vi.setSystemTime(new Date("2026-05-20T00:00:00Z"));
    await ops.saveKyInstructionRecord(normalizeKyInstructionRecord({ siteName: "X" }));
    const list = await ops.getKyRecordList();
    if (!list.ok) throw new Error("list failed");
    const id = list.data[0].id;
    await ops.deleteKyRecord(id);
    const got = await ops.getKyRecordById(id);
    expect(got.ok && got.data).toBeNull();
    const after = await ops.getKyRecordList();
    expect(after.ok && after.data).toHaveLength(0);
  });

  it("存在しない id は null", async () => {
    const ops = createOperationsService();
    const got = await ops.getKyRecordById("does-not-exist");
    expect(got.ok && got.data).toBeNull();
  });

  it("projectName がサマリーに含まれる", async () => {
    const ops = createOperationsService();
    await ops.saveKyInstructionRecord(normalizeKyInstructionRecord({ siteName: "S", projectName: "3工区" }));
    const list = await ops.getKyRecordList();
    expect(list.ok && list.data[0].projectName).toBe("3工区");
  });
});
