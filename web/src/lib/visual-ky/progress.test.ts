import { describe, expect, it } from "vitest";
import {
  completeVisualKyScenario,
  EMPTY_VISUAL_KY_PROGRESS,
  readVisualKyProgress,
  resetVisualKyProgress,
  VISUAL_KY_PROGRESS_KEY,
  writeVisualKyProgress,
} from "./progress";

function memoryStorage(options?: { failRead?: boolean; failWrite?: boolean }) {
  const values = new Map<string, string>();
  return {
    values,
    getItem(key: string) {
      if (options?.failRead) throw new Error("storage unavailable");
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      if (options?.failWrite) throw new Error("quota");
      values.set(key, value);
    },
    removeItem(key: string) {
      if (options?.failWrite) throw new Error("blocked");
      values.delete(key);
    },
  };
}

const catalog = [
  { id: "vkyt-001", categoryTags: ["fall", "scaffold"] },
  { id: "vkyt-007", categoryTags: ["electrical"] },
  { id: "vkyt-010", categoryTags: ["heat"] },
] as const;

describe("visual KY local-only progress", () => {
  it("stores only coarse, allow-listed progress fields", () => {
    const storage = memoryStorage();
    const progress = completeVisualKyScenario({
      progress: EMPTY_VISUAL_KY_PROGRESS,
      scenarioId: "vkyt-001",
      selectedHazardCount: 2,
      totalHazardCount: 4,
      dateKey: "2026-07-30",
      catalog,
    });
    expect(writeVisualKyProgress(progress, storage)).toBe(true);
    const raw = storage.values.get(VISUAL_KY_PROGRESS_KEY) ?? "";
    expect(raw).not.toMatch(/name|email|company|answerText|siteName|health/i);
    expect(readVisualKyProgress(storage)).toEqual({
      progress,
      available: true,
    });
    expect(progress.coarseResults["vkyt-001"]).toBe("partial");
    expect(progress.badgeIds).toContain("first");
    expect(progress.badgeIds).toContain("fall");
  });

  it("calculates a local streak and non-certificate badges", () => {
    let progress = { ...EMPTY_VISUAL_KY_PROGRESS };
    for (let day = 24; day <= 30; day += 1) {
      progress = completeVisualKyScenario({
        progress,
        scenarioId:
          day % 3 === 0
            ? "vkyt-010"
            : day % 2 === 0
              ? "vkyt-007"
              : "vkyt-001",
        selectedHazardCount: 1,
        totalHazardCount: 4,
        dateKey: `2026-07-${day}`,
        catalog,
      });
    }
    expect(progress.streakDays).toBe(7);
    expect(progress.badgeIds).toContain("streak-seven");
    expect(progress.badgeIds).toContain("three-categories");
    expect(progress.badgeIds).toContain("heat");
  });

  it("continues learning when localStorage is unavailable", () => {
    const unavailable = memoryStorage({ failRead: true, failWrite: true });
    expect(readVisualKyProgress(unavailable).available).toBe(false);
    expect(
      writeVisualKyProgress(EMPTY_VISUAL_KY_PROGRESS, unavailable),
    ).toBe(false);
    expect(resetVisualKyProgress(unavailable)).toBe(false);
  });

  it("resets saved progress", () => {
    const storage = memoryStorage();
    storage.setItem(VISUAL_KY_PROGRESS_KEY, JSON.stringify({ version: 1 }));
    expect(resetVisualKyProgress(storage)).toBe(true);
    expect(storage.values.has(VISUAL_KY_PROGRESS_KEY)).toBe(false);
  });

  it("rejects unexpected or identifying fields on read", () => {
    const storage = memoryStorage();
    storage.setItem(
      VISUAL_KY_PROGRESS_KEY,
      JSON.stringify({
        version: 1,
        completedScenarioIds: ["vkyt-001", "customer-123"],
        coarseResults: {
          "vkyt-001": "all",
          "customer-123": "full private answer",
        },
        email: "privacy-marker@example.test",
        name: "privacy marker",
        lastUsedDate: "2026-07-30",
        streakDays: 9999,
        badgeIds: ["first", "official-certificate"],
      }),
    );
    const { progress } = readVisualKyProgress(storage);
    expect(JSON.stringify(progress)).not.toContain("privacy-marker");
    expect(progress.completedScenarioIds).toEqual(["vkyt-001"]);
    expect(progress.streakDays).toBe(366);
    expect(progress.badgeIds).toEqual(["first"]);
  });
});
