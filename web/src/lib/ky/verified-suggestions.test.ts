import { describe, expect, it } from "vitest";
import type { KyWeatherSnapshot } from "./zero-friction-types";
import {
  dedupeHazardCandidates,
  hasDuplicateHazardText,
  measuresForHazardText,
  suggestVerifiedHazards,
  verifiedHazardById,
} from "./verified-suggestions";

function ids(work: string, weather: KyWeatherSnapshot | null = null) {
  return suggestVerifiedHazards(work, weather).map((candidate) => candidate.id);
}

function weather(
  overrides: Partial<KyWeatherSnapshot> = {},
): KyWeatherSnapshot {
  return {
    areaId: "tokyo-shinjuku",
    areaLabel: "東京都 新宿区",
    resolutionLabel: "新宿区 → 東京都区部の情報",
    weather: "晴れ",
    temperatureCelsius: 31,
    relativeHumidityPercent: 65,
    windSpeedMs: 2,
    precipitationMm: 0,
    wbgtCelsius: 27,
    wbgtKind: "estimated",
    heatAlert: "inactive",
    specialHeatAlert: "inactive",
    warningStatus: "live",
    warnings: [],
    targetAt: "2026-08-01T12:00:00+09:00",
    fetchedAt: "2026-08-01T08:05:00+09:00",
    wbgtTargetAt: "2026-08-01T12:00:00+09:00",
    wbgtRetrievedAt: "2026-08-01T08:05:00+09:00",
    providers: ["Open-Meteo（気象グリッド推定）"],
    availability: "estimated",
    stale: false,
    degraded: false,
    manuallyEditedFields: [],
    ...overrides,
  };
}

describe("verified KY hazard suggestions", () => {
  it("suggests fall and falling-object controls for scaffold panel work", () => {
    const suggestions = suggestVerifiedHazards("足場上で外壁パネルを取り付ける");
    expect(suggestions.map((item) => item.id)).toEqual(
      expect.arrayContaining(["fall-scaffold", "falling-object", "wind-panel"]),
    );
    const fall = suggestions.find((item) => item.id === "fall-scaffold");
    expect(fall?.measures.map((item) => item.level)).toEqual([
      "elimination",
      "engineering",
      "engineering",
      "administrative",
      "ppe",
    ]);
    expect(fall?.measures[0]?.text).not.toMatch(/^注意する|^声を掛ける/u);
  });

  it("suggests vehicle separation and load controls for forklift unloading", () => {
    expect(ids("フォークリフトで資材を荷下ろしする")).toEqual(
      expect.arrayContaining(["vehicle-collision", "forklift-load"]),
    );
  });

  it("suggests exposure and splash controls for organic solvent work", () => {
    const suggestions = suggestVerifiedHazards("屋内で有機溶剤を使用する");
    expect(suggestions.map((item) => item.id)).toContain("chemical-exposure");
    expect(
      suggestions.find((item) => item.id === "chemical-exposure")?.measures,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "chemical-substitute" }),
        expect.objectContaining({ id: "chemical-local-exhaust" }),
      ]),
    );
  });

  it("suggests heat illness for hot paving work", () => {
    expect(ids("炎天下で舗装作業を行う")).toContain("heat-illness");
  });

  it("adds weather candidates without selecting them", () => {
    const suggestions = suggestVerifiedHazards(
      "雨天にトラックから荷物を搬入する",
      weather({
        weather: "雷雨",
        precipitationMm: 12,
        windSpeedMs: 12,
        wbgtCelsius: 29,
      }),
    );
    expect(suggestions.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "slip-wet",
        "wind-panel",
        "lightning-outdoor",
        "heat-illness",
      ]),
    );
    expect(suggestions.filter((item) => item.origin === "weather").length).toBeGreaterThan(0);
    expect(suggestions.every((item) => !("selected" in item))).toBe(true);
  });

  it("does not use stale high WBGT as a heat candidate", () => {
    const suggestions = suggestVerifiedHazards(
      "倉庫で仕分け作業を行う",
      weather({ wbgtCelsius: 31, stale: true, availability: "stale" }),
    );
    expect(
      suggestions.some(
        (item) => item.id === "heat-illness" && item.origin === "weather",
      ),
    ).toBe(false);
  });

  it("uses an active heat alert as an unselected weather candidate even before high WBGT", () => {
    const suggestions = suggestVerifiedHazards(
      "倉庫で仕分け作業を行う",
      weather({ wbgtCelsius: 25, heatAlert: "active" }),
    );
    const heat = suggestions.find(
      (item) => item.id === "heat-illness" && item.origin === "weather",
    );
    expect(heat?.reason).toMatch(/熱中症警戒アラートが発表中/u);
    expect(heat).not.toHaveProperty("selected");
  });

  it("labels hazards derived from manually overridden weather fields as manual", () => {
    const suggestions = suggestVerifiedHazards(
      "倉庫で仕分け作業を行う",
      weather({
        weather: "雷雨",
        precipitationMm: 0,
        wbgtCelsius: 32,
        manuallyEditedFields: ["weather", "wbgt"],
      }),
    );
    const heat = suggestions.find((item) => item.id === "heat-illness");
    const lightning = suggestions.find(
      (item) => item.id === "lightning-outdoor",
    );
    expect(heat).toMatchObject({ sourceLabel: "手動修正値からの候補" });
    expect(heat?.reason).toContain("手動修正値");
    expect(heat?.reason).not.toContain("推定WBGT");
    expect(lightning?.sourceLabel).toBe("手動修正値からの候補");
  });

  it("keeps an active official alert distinct from a manual WBGT override", () => {
    const heat = suggestVerifiedHazards(
      "倉庫で仕分け作業を行う",
      weather({
        wbgtCelsius: 32,
        heatAlert: "active",
        manuallyEditedFields: ["wbgt"],
      }),
    ).find((item) => item.id === "heat-illness");
    expect(heat?.reason).toContain("熱中症警戒アラートが発表中");
    expect(heat?.sourceLabel).toContain("気象からの候補");
  });

  it("does not reuse a stale active heat alert as a current candidate", () => {
    const suggestions = suggestVerifiedHazards(
      "倉庫で仕分け作業を行う",
      weather({
        wbgtCelsius: 25,
        heatAlert: "active",
        stale: true,
        availability: "stale",
      }),
    );
    expect(
      suggestions.some(
        (item) => item.id === "heat-illness" && item.origin === "weather",
      ),
    ).toBe(false);
  });

  it("does not turn stale rain, wind or lightning into current weather hazards", () => {
    const suggestions = suggestVerifiedHazards(
      "倉庫で仕分け作業を行う",
      weather({
        weather: "雷雨",
        precipitationMm: 10,
        windSpeedMs: 15,
        stale: true,
        availability: "stale",
      }),
    );
    expect(suggestions.filter((item) => item.origin === "weather")).toEqual([]);
  });

  it("works with external AI entirely off", () => {
    const originalFetch = globalThis.fetch;
    const suggestions = suggestVerifiedHazards("脚立で照明器具を交換する");
    expect(suggestions.length).toBeGreaterThan(0);
    expect(globalThis.fetch).toBe(originalFetch);
    expect(suggestions.every((item) => item.sourceRef.length > 0)).toBe(true);
  });

  it("does not generate candidates before four normalized characters", () => {
    expect(suggestVerifiedHazards("足場")).toEqual([]);
  });

  it("deduplicates hazards but never deletes the user's manual text helper input", () => {
    const fall = verifiedHazardById("fall-scaffold");
    expect(fall).not.toBeNull();
    expect(dedupeHazardCandidates([fall!, { ...fall!, relevance: 1 }])).toHaveLength(1);
    expect(hasDuplicateHazardText(["墜落・転落"], " 墜落・転落 ")).toBe(true);
    expect(hasDuplicateHazardText(["墜落・転落"], "工具の落下")).toBe(false);
  });

  it("offers verified measures for a manually entered matching hazard", () => {
    const measures = measuresForHazardText("足場から墜落する危険");
    expect(measures.length).toBeGreaterThan(0);
    expect(measures.find((item) => item.id === "fall-change-method")?.origin).toBe(
      "reviewed-visual-kyt",
    );
    expect(measures.find((item) => item.id === "fall-access")?.origin).toBe(
      "official-guidance",
    );
    expect(measuresForHazardText("独自の現場固有危険")).toEqual([]);
  });

  it("keeps each measure provenance independent from its parent hazard", () => {
    const fall = verifiedHazardById("fall-scaffold");
    expect(fall?.origin).toBe("reviewed-visual-kyt");
    expect(fall?.measures.find((item) => item.id === "fall-access")).toMatchObject({
      sourceRef: "mhlw:fall-prevention",
      origin: "official-guidance",
    });
    const fallingObject = verifiedHazardById("falling-object");
    expect(
      fallingObject?.measures.find((item) => item.id === "drop-zone"),
    ).toMatchObject({
      sourceRef: "accident-type:falling-object",
      origin: "accident-classification",
    });
  });
});
