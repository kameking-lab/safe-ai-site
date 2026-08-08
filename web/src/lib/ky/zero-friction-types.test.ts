import { describe, expect, it } from "vitest";
import {
  addDaysIso,
  createEmptyKyDraft,
  deriveKyDraftState,
  invalidateKyConfirmation,
  isKyDraftContentConfirmable,
  jstDateTimeParts,
  markKyPdfExportedIfUnchanged,
  revalidateKyWeatherStaleness,
} from "./zero-friction-types";

describe("KY draft state and JST defaults", () => {
  it("prefills work date and start time in JST", () => {
    const utc = new Date("2026-07-31T15:05:00.000Z");
    expect(jstDateTimeParts(utc)).toEqual({ date: "2026-08-01", time: "00:05" });
    const draft = createEmptyKyDraft(utc);
    expect(draft.workDate).toBe("2026-08-01");
    expect(draft.workStartTime).toBe("00:05");
    expect(draft.createdAt).toBe(utc.toISOString());
  });

  it("sets an exact 31-day retention boundary", () => {
    expect(addDaysIso("2026-08-01T00:00:00Z", 31)).toBe(
      "2026-09-01T00:00:00.000Z",
    );
  });

  it("never turns suggestions or selections into automatic approval", () => {
    const draft = createEmptyKyDraft(new Date("2026-08-01T00:00:00Z"));
    draft.workDescription = "足場作業";
    expect(deriveKyDraftState(draft, 6)).toBe("needs-review");
    expect(draft.confirmedAt).toBeNull();
    expect(draft.pdfExportedAt).toBeNull();
  });

  it("invalidates human confirmation after any content edit", () => {
    const draft = createEmptyKyDraft(new Date("2026-08-01T00:00:00Z"));
    draft.workDescription = "足場作業";
    draft.confirmedAt = "2026-08-01T00:10:00Z";
    draft.pdfExportedAt = "2026-08-01T00:11:00Z";
    const changed = invalidateKyConfirmation(draft);
    expect(changed.confirmedAt).toBeNull();
    expect(changed.pdfExportedAt).toBeNull();
    expect(changed.state).toBe("needs-review");
  });

  it("rejects empty hazard/measure text and duplicate hazards at confirmation", () => {
    const draft = createEmptyKyDraft(new Date("2026-08-01T00:00:00Z"));
    draft.workDescription = "足場上で作業する";
    const hazard = {
      id: "hazard-a",
      candidateId: null,
      title: "墜落・転落",
      originalTitle: "墜落・転落",
      accidentType: "墜落",
      reason: "手入力",
      origin: "manual" as const,
      sourceLabel: "手入力",
      sourceRef: "local:manual",
      edited: false,
      measures: [{
        id: "measure-a",
        candidateId: null,
        text: "手すりを設置する",
        originalText: "手すりを設置する",
        level: "engineering" as const,
        origin: "manual" as const,
        sourceLabel: "手入力",
        edited: false,
      }],
    };
    draft.hazards = [hazard];
    expect(isKyDraftContentConfirmable(draft)).toBe(true);
    draft.hazards[0]!.title = "   ";
    expect(isKyDraftContentConfirmable(draft)).toBe(false);
    draft.hazards[0]!.title = "墜落・転落";
    draft.hazards[0]!.measures[0]!.text = "";
    expect(isKyDraftContentConfirmable(draft)).toBe(false);
    draft.hazards[0]!.measures[0]!.text = "手すりを設置する";
    draft.hazards.push({ ...hazard, id: "hazard-b", title: " 墜落・転落 " });
    expect(isKyDraftContentConfirmable(draft)).toBe(false);
  });

  it("preserves historical weather values but marks them stale when reopened", () => {
    const draft = createEmptyKyDraft(new Date("2026-08-01T00:00:00Z"));
    const weather = {
      areaId: "tokyo-shinjuku",
      areaLabel: "東京都 新宿区",
      resolutionLabel: "東京都区部",
      weather: "晴れ",
      temperatureCelsius: 35,
      relativeHumidityPercent: 60,
      windSpeedMs: 2,
      precipitationMm: 0,
      wbgtCelsius: 30,
      wbgtKind: "estimated" as const,
      heatAlert: "active" as const,
      specialHeatAlert: "inactive" as const,
      warningStatus: "live" as const,
      warnings: [],
      targetAt: "2026-08-01T00:00:00Z",
      fetchedAt: "2026-08-01T00:00:00Z",
      wbgtTargetAt: "2026-08-01T00:00:00Z",
      wbgtRetrievedAt: "2026-08-01T00:00:00Z",
      providers: ["test"],
      availability: "estimated" as const,
      stale: false,
      degraded: false,
      manuallyEditedFields: [],
    };
    const reopened = revalidateKyWeatherStaleness(
      weather,
      new Date("2026-08-01T03:00:01Z"),
    );
    expect(reopened.stale).toBe(true);
    expect(reopened.availability).toBe("stale");
    expect(reopened.wbgtCelsius).toBe(30);
    expect(reopened.heatAlert).toBe("active");
    expect(draft.weather).toBeNull();
  });

  it("does not mark a newer revision PDF-exported when generation used old content", () => {
    const exportedDraft = createEmptyKyDraft(
      new Date("2026-08-01T00:00:00Z"),
    );
    exportedDraft.workDescription = "PDFへ出した内容";
    const latest = {
      ...exportedDraft,
      workDescription: "生成中に変更した内容",
      updatedAt: "2026-08-01T00:00:01.000Z",
    };
    const result = markKyPdfExportedIfUnchanged({
      latest,
      exportedDraft,
      exportedAt: "2026-08-01T00:00:02.000Z",
    });
    expect(result.applied).toBe(false);
    expect(result.draft.workDescription).toBe("生成中に変更した内容");
    expect(result.draft.pdfExportedAt).toBeNull();
  });

  it("marks only the exact exported revision as PDF-exported", () => {
    const exportedDraft = createEmptyKyDraft(
      new Date("2026-08-01T00:00:00Z"),
    );
    const result = markKyPdfExportedIfUnchanged({
      latest: exportedDraft,
      exportedDraft,
      exportedAt: "2026-08-01T00:00:02.000Z",
    });
    expect(result.applied).toBe(true);
    expect(result.draft.state).toBe("pdf-exported");
    expect(result.draft.pdfExportedAt).toBe("2026-08-01T00:00:02.000Z");
  });
});
