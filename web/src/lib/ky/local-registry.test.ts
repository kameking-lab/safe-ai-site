import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetKyMemoryStorageForTests,
  cleanupKyLocalRecords,
  deleteAllKyMembersLocal,
  deleteKyDraftLocal,
  deleteKyMemberLocal,
  loadKyLocalSnapshot,
  previousMembersFromDrafts,
  saveKyDraftLocal,
  saveKyMemberLocal,
} from "./local-registry";
import {
  KY_MAX_DRAFTS,
  KY_MAX_MEMBERS,
  addDaysIso,
  cloneKyDraftForNewWork,
  createEmptyKyDraft,
  type KyMember,
} from "./zero-friction-types";

const NOW = new Date("2026-08-01T00:00:00.000Z");

function member(id: string, lastUsedAt = NOW.toISOString()): KyMember {
  return {
    id,
    displayName: `member-${id}`,
    role: "作業員",
    createdAt: NOW.toISOString(),
    lastUsedAt,
    expiresAt: addDaysIso(lastUsedAt, 31),
  };
}

describe("local-only KY registry", () => {
  beforeEach(() => __resetKyMemoryStorageForTests());
  afterEach(() => vi.restoreAllMocks());

  it("expires drafts and members at 31 days and cleanup is idempotent", () => {
    const alive = createEmptyKyDraft(new Date("2026-07-01T00:00:01.000Z"));
    const expired = createEmptyKyDraft(new Date("2026-07-01T00:00:00.000Z"));
    const input = {
      drafts: [expired, alive],
      members: [
        member("expired", "2026-07-01T00:00:00.000Z"),
        member("alive", "2026-07-01T00:00:01.000Z"),
      ],
      now: NOW,
    };
    const once = cleanupKyLocalRecords(input);
    const twice = cleanupKyLocalRecords({ ...once, now: NOW });
    expect(once.drafts.map((draft) => draft.id)).toEqual([alive.id]);
    expect(once.members.map((item) => item.id)).toEqual(["alive"]);
    expect(twice).toEqual(once);
  });

  it("enforces bounded record counts with newest records first", () => {
    const drafts = Array.from({ length: KY_MAX_DRAFTS + 5 }, (_, index) => ({
      ...createEmptyKyDraft(NOW),
      id: `draft-${index}`,
      updatedAt: new Date(NOW.getTime() + index * 1_000).toISOString(),
    }));
    const members = Array.from({ length: KY_MAX_MEMBERS + 5 }, (_, index) =>
      member(`member-${index}`, new Date(NOW.getTime() + index * 1_000).toISOString()),
    );
    const cleaned = cleanupKyLocalRecords({ drafts, members, now: NOW });
    expect(cleaned.drafts).toHaveLength(KY_MAX_DRAFTS);
    expect(cleaned.members).toHaveLength(KY_MAX_MEMBERS);
    expect(cleaned.drafts[0]?.id).toBe(`draft-${KY_MAX_DRAFTS + 4}`);
  });

  it("falls back to in-memory creation without any network send", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const draft = { ...createEmptyKyDraft(NOW), workDescription: "足場作業" };
    const write = await saveKyDraftLocal(draft);
    const snapshot = await loadKyLocalSnapshot(NOW);
    expect(write.mode).toBe("memory");
    expect(write.error).toBe("unavailable");
    expect(snapshot.drafts[0]?.workDescription).toBe("足場作業");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("re-evaluates saved historical weather freshness without replacing its values", async () => {
    const draft = createEmptyKyDraft(new Date("2026-07-31T21:00:00.000Z"));
    draft.weather = {
      areaId: "tokyo-shinjuku",
      areaLabel: "東京都 新宿区",
      resolutionLabel: "東京都区部",
      weather: "晴れ",
      temperatureCelsius: 34,
      relativeHumidityPercent: 70,
      windSpeedMs: 2,
      precipitationMm: 0,
      wbgtCelsius: 30,
      wbgtKind: "estimated",
      heatAlert: "active",
      specialHeatAlert: "inactive",
      warningStatus: "live",
      warnings: [],
      targetAt: "2026-07-31T21:00:00.000Z",
      fetchedAt: "2026-07-31T21:00:00.000Z",
      wbgtTargetAt: "2026-07-31T21:00:00.000Z",
      wbgtRetrievedAt: "2026-07-31T21:00:00.000Z",
      providers: ["test"],
      availability: "estimated",
      stale: false,
      degraded: false,
      manuallyEditedFields: [],
    };
    await saveKyDraftLocal(draft);
    const reopened = (await loadKyLocalSnapshot(NOW)).drafts[0]?.weather;
    expect(reopened?.stale).toBe(true);
    expect(reopened?.availability).toBe("stale");
    expect(reopened?.temperatureCelsius).toBe(34);
    expect(reopened?.heatAlert).toBe("active");
  });

  it("adds, selects, deletes one and deletes all members locally", async () => {
    await saveKyMemberLocal(member("a"));
    await saveKyMemberLocal(member("b"));
    expect((await loadKyLocalSnapshot(NOW)).members.map((item) => item.id)).toEqual([
      "a",
      "b",
    ]);
    await deleteKyMemberLocal("a");
    expect((await loadKyLocalSnapshot(NOW)).members.map((item) => item.id)).toEqual([
      "b",
    ]);
    await deleteAllKyMembersLocal();
    expect((await loadKyLocalSnapshot(NOW)).members).toEqual([]);
  });

  it("deletes one draft without affecting another", async () => {
    const first = { ...createEmptyKyDraft(NOW), id: "draft-a" };
    const second = { ...createEmptyKyDraft(NOW), id: "draft-b" };
    await saveKyDraftLocal(first);
    await saveKyDraftLocal(second);
    await deleteKyDraftLocal(first.id);
    expect((await loadKyLocalSnapshot(NOW)).drafts.map((item) => item.id)).toEqual([
      second.id,
    ]);
  });

  it("returns the last-used member group without asking for names again", () => {
    const draft = createEmptyKyDraft(NOW);
    draft.selectedMembers = [
      { id: "a", displayName: "山田", role: "職長" },
      { id: "b", displayName: "佐藤", role: "作業員" },
    ];
    expect(previousMembersFromDrafts([draft])).toEqual(draft.selectedMembers);
  });

  it("duplicates work and members but never reuses old weather as current", () => {
    const original = createEmptyKyDraft(NOW);
    original.areaId = "tokyo-shinjuku";
    original.areaLabel = "東京都 新宿区";
    original.locationQuery = "新宿区";
    original.weather = {
      areaId: "tokyo-shinjuku",
      areaLabel: "東京都 新宿区",
      resolutionLabel: "東京都区部",
      weather: "晴れ",
      temperatureCelsius: 30,
      relativeHumidityPercent: 60,
      windSpeedMs: 2,
      precipitationMm: 0,
      wbgtCelsius: 28,
      wbgtKind: "estimated",
      heatAlert: "inactive",
      specialHeatAlert: "inactive",
      warningStatus: "live",
      warnings: [],
      targetAt: NOW.toISOString(),
      fetchedAt: NOW.toISOString(),
      wbgtTargetAt: NOW.toISOString(),
      wbgtRetrievedAt: NOW.toISOString(),
      providers: ["test"],
      availability: "estimated",
      stale: false,
      degraded: false,
      manuallyEditedFields: [],
    };
    original.workDescription = "足場作業";
    original.confirmedAt = NOW.toISOString();
    const copy = cloneKyDraftForNewWork(original, new Date("2026-08-02T00:00:00Z"));
    expect(copy.workDescription).toBe("足場作業");
    expect(copy.locationQuery).toBe("東京都 新宿区");
    expect(copy.areaId).toBeNull();
    expect(copy.weather).toBeNull();
    expect(copy.confirmedAt).toBeNull();
    expect(copy.handoff?.label).toMatch(/気象.*再確認/u);
  });
});
