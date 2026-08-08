import { describe, expect, it } from "vitest";
import { createEmptyKyDraft } from "./zero-friction-types";
import type { KyWeatherSnapshot } from "./zero-friction-types";
import {
  buildPdfFromJpegPages,
  kyDraftToPdfLines,
  kyPdfFilename,
  kyPdfStateLabel,
} from "./pdf-export";

function completeWeather(
  overrides: Partial<KyWeatherSnapshot> = {},
): KyWeatherSnapshot {
  return {
    areaId: "tokyo-shinjuku",
    areaLabel: "東京都 新宿区",
    resolutionLabel: "東京都区部",
    weather: "晴れ",
    temperatureCelsius: 34,
    relativeHumidityPercent: 70,
    windSpeedMs: 2,
    precipitationMm: 0,
    wbgtCelsius: 29.1,
    wbgtKind: "estimated",
    heatAlert: "inactive",
    specialHeatAlert: "inactive",
    warningStatus: "live",
    warnings: [],
    targetAt: "2026-08-01T03:00:00Z",
    fetchedAt: "2026-08-01T00:05:00Z",
    wbgtTargetAt: "2026-08-01T04:00:00Z",
    wbgtRetrievedAt: "2026-08-01T00:06:00Z",
    providers: ["Open-Meteo（気象グリッド推定）"],
    availability: "estimated",
    stale: false,
    degraded: false,
    manuallyEditedFields: [],
    ...overrides,
  };
}

describe("client-only KY PDF export", () => {
  it("builds a valid PDF header, xref and A4 portrait pages", () => {
    const bytes = buildPdfFromJpegPages([
      { bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), width: 1240, height: 1754 },
      { bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), width: 1240, height: 1754 },
    ]);
    const ascii = new TextDecoder("latin1").decode(bytes);
    expect(ascii.startsWith("%PDF-1.4")).toBe(true);
    expect(ascii).toContain("/Count 2");
    expect(ascii).toContain("/MediaBox [0 0 595.28 841.89]");
    expect(ascii).toContain("/DCTDecode");
    expect(ascii).toContain("startxref");
    expect(ascii.trimEnd().endsWith("%%EOF")).toBe(true);
  });

  it("uses a safe filename with coarse area but never member names", () => {
    const draft = createEmptyKyDraft(new Date("2026-08-01T00:00:00Z"));
    draft.workDate = "2026-08-01";
    draft.areaLabel = "東京都 新宿区";
    draft.selectedMembers = [
      { id: "member-a", displayName: "山田太郎", role: "職長" },
    ];
    const filename = kyPdfFilename(draft);
    expect(filename).toBe("KY_20260801_東京都新宿区.pdf");
    expect(filename).not.toContain("山田");
    expect(filename).not.toMatch(/[\\/:*?"<>|]/u);
  });

  it("sanitizes unexpected area filename characters", () => {
    expect(
      kyPdfFilename({ workDate: "invalid", areaLabel: "地域/../危険:*?" }),
    ).toBe("KY_日付未確認_地域_.._危険___.pdf");
  });

  it("labels every unconfirmed export as draft, never approved", () => {
    const draft = createEmptyKyDraft(new Date("2026-08-01T00:00:00Z"));
    expect(kyPdfStateLabel(draft)).toBe("下書き・未確認");
    expect(kyDraftToPdfLines(draft).map((line) => line.text).join("\n")).toContain(
      "作成状態: 下書き・未確認",
    );
    expect(kyDraftToPdfLines(draft).map((line) => line.text).join("\n")).not.toContain(
      "承認済み",
    );
  });

  it("distinguishes an explicit human confirmation", () => {
    const draft = createEmptyKyDraft(new Date("2026-08-01T00:00:00Z"));
    draft.confirmedAt = "2026-08-01T00:30:00Z";
    draft.reviewerName = "山田／職長";
    draft.locationQuery = "新宿区";
    draft.areaLabel = "東京都 新宿区";
    draft.selectedMembers = [
      { id: "member-a", displayName: "山田", role: "職長" },
    ];
    draft.weather = completeWeather();
    draft.workDescription = "足場上で作業する";
    draft.hazards = [{
      id: "hazard-confirmed",
      candidateId: null,
      title: "墜落・転落",
      originalTitle: "墜落・転落",
      accidentType: "墜落",
      reason: "人が確認",
      origin: "manual",
      sourceLabel: "手入力",
      sourceRef: "local:manual",
      edited: false,
      measures: [{
        id: "measure-confirmed",
        candidateId: null,
        text: "手すりを設置する",
        originalText: "手すりを設置する",
        level: "engineering",
        origin: "manual",
        sourceLabel: "手入力",
        edited: false,
      }],
    }];
    expect(kyPdfStateLabel(draft)).toBe("確認済み");
    draft.hazards[0]!.measures[0]!.text = "";
    expect(kyPdfStateLabel(draft)).toBe("下書き・未確認");
  });

  it("keeps a human-confirmed KY draft-watermarked when weather is unavailable, stale or partial", () => {
    const draft = createEmptyKyDraft(new Date("2026-08-01T00:00:00Z"));
    draft.confirmedAt = "2026-08-01T00:30:00Z";
    draft.reviewerName = "山田／職長";
    draft.locationQuery = "新宿区";
    draft.areaLabel = "東京都 新宿区";
    draft.selectedMembers = [
      { id: "member-a", displayName: "山田", role: "職長" },
    ];
    draft.workDescription = "足場上で作業する";
    draft.hazards = [{
      id: "hazard-a",
      candidateId: null,
      title: "墜落・転落",
      originalTitle: "墜落・転落",
      accidentType: "墜落",
      reason: "人が確認",
      origin: "manual",
      sourceLabel: "手入力",
      sourceRef: "local:manual",
      edited: false,
      measures: [{
        id: "measure-a",
        candidateId: null,
        text: "手すりを設置する",
        originalText: "手すりを設置する",
        level: "engineering",
        origin: "manual",
        sourceLabel: "手入力",
        edited: false,
      }],
    }];
    for (const weather of [
      null,
      completeWeather({ stale: true, availability: "stale" }),
      completeWeather({ degraded: true, availability: "degraded" }),
      completeWeather({ wbgtCelsius: null, wbgtKind: "unavailable" }),
    ]) {
      draft.weather = weather;
      expect(kyPdfStateLabel(draft)).toBe("下書き・未確認");
    }
  });

  it("keeps Japanese work, weather, hazard, measure and provenance in render lines", () => {
    const draft = createEmptyKyDraft(new Date("2026-08-01T00:00:00Z"));
    draft.workDescription = "足場上で外壁パネルを取り付ける";
    draft.hazards = [
      {
        id: "hazard-a",
        candidateId: null,
        title: "墜落・転落",
        originalTitle: "墜落・転落",
        accidentType: "墜落・転落",
        reason: "足場作業のため",
        origin: "manual",
        sourceLabel: "手入力",
        sourceRef: "local:manual",
        edited: false,
        measures: [
          {
            id: "measure-a",
            candidateId: null,
            text: "作業床と手すりを設置する",
            originalText: "作業床と手すりを設置する",
            level: "engineering",
            origin: "manual",
            sourceLabel: "手入力",
            edited: false,
          },
        ],
      },
    ];
    const text = kyDraftToPdfLines(draft).map((line) => line.text).join("\n");
    expect(text).toContain("足場上で外壁パネルを取り付ける");
    expect(text).toContain("墜落・転落");
    expect(text).toContain("作業床と手すりを設置する");
    expect(text).toContain("手入力 / 出典: 手入力");
    expect(text).toContain("気象: 未確認");
    expect(text).toContain("手入力");
    expect(text).toContain("local:manual");
  });

  it("keeps each measure origin and source distinguishable in the PDF", () => {
    const draft = createEmptyKyDraft(new Date("2026-08-01T00:00:00Z"));
    draft.workDescription = "足場作業";
    draft.hazards = [{
      id: "hazard-source",
      candidateId: "fall-scaffold",
      title: "墜落・転落",
      originalTitle: "墜落・転落",
      accidentType: "墜落",
      reason: "足場作業",
      origin: "reviewed-visual-kyt",
      sourceLabel: "reviewed Visual KYT",
      sourceRef: "visual-kyt:vkyt-001",
      edited: false,
      measures: [
        {
          id: "measure-verified",
          candidateId: "fall-guardrail",
          text: "手すり設備を設置する",
          originalText: "手すり設備を設置する",
          level: "engineering",
          origin: "reviewed-visual-kyt",
          sourceLabel: "reviewed Visual KYT（一次資料照合済み）",
          edited: false,
        },
        {
          id: "measure-handoff",
          candidateId: "handoff-control",
          text: "引継ぎ元で選んだ対策",
          originalText: "引継ぎ元で選んだ対策",
          level: "administrative",
          origin: "handoff",
          sourceLabel: "引継ぎ候補（引継ぎ元で選択）",
          edited: false,
        },
      ],
    }];
    const text = kyDraftToPdfLines(draft).map((line) => line.text).join("\n");
    expect(text).toContain(
      "検証済み候補 / 出典: reviewed Visual KYT（一次資料照合済み）",
    );
    expect(text).toContain(
      "引継ぎ候補 / 出典: 引継ぎ候補（引継ぎ元で選択）",
    );
  });

  it("records alert states and separate weather/WBGT timestamps without calling them measured", () => {
    const draft = createEmptyKyDraft(new Date("2026-08-01T00:00:00Z"));
    draft.weather = {
      areaId: "tokyo-shinjuku",
      areaLabel: "東京都 新宿区",
      resolutionLabel: "東京都区部",
      weather: "晴れ",
      temperatureCelsius: 34,
      relativeHumidityPercent: 70,
      windSpeedMs: 2,
      precipitationMm: 0,
      wbgtCelsius: 29.1,
      wbgtKind: "estimated",
      heatAlert: "active",
      specialHeatAlert: "candidate",
      warningStatus: "live",
      warnings: [{ code: "14", status: "発表", level: "advisory" }],
      targetAt: "2026-08-01T03:00:00Z",
      fetchedAt: "2026-08-01T00:05:00Z",
      wbgtTargetAt: "2026-08-01T04:00:00Z",
      wbgtRetrievedAt: "2026-08-01T00:06:00Z",
      providers: ["Open-Meteo（気象グリッド推定）", "環境省 熱中症予防情報サイト"],
      availability: "estimated",
      stale: false,
      degraded: false,
      manuallyEditedFields: [],
    };
    const text = kyDraftToPdfLines(draft).map((line) => line.text).join("\n");
    expect(text).toContain("熱中症警戒アラート: 発表中");
    expect(text).toContain("特別警戒アラート: 発表候補・未確定");
    expect(text).toContain("雷注意報（発表・コード14）");
    expect(text).toContain("気象対象時刻:");
    expect(text).toContain("WBGT取得:");
    expect(text).toContain("WBGT 29.1℃（推定）");
    expect(text).not.toContain("WBGT 29.1℃（実測）");
  });

  it("prints every manually edited weather field and does not relabel it as only estimated", () => {
    const draft = createEmptyKyDraft(new Date("2026-08-01T00:00:00Z"));
    draft.weather = completeWeather({
      weather: "雨",
      temperatureCelsius: 33,
      relativeHumidityPercent: 80,
      manuallyEditedFields: ["weather", "temperature", "humidity"],
    });
    const text = kyDraftToPdfLines(draft).map((line) => line.text).join("\n");
    expect(text).toContain("手動修正あり（天気・気温・湿度）");
    expect(text).toContain("雨（手動修正）");
    expect(text).toContain("気温 33.0℃（手動修正）");
    expect(text).toContain("湿度 80%（手動修正）");
    expect(text).not.toContain("区分: 推定　");
  });
});
