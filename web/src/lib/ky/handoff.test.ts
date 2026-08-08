import { beforeEach, describe, expect, it } from "vitest";
import {
  KY_HANDOFF_STORAGE_KEY,
  createKyHandoffPayload,
  parseKyHandoffFromLocation,
  readKyHandoff,
  safeKyHandoffHref,
  validateKyHandoffPayload,
  writeKyHandoff,
} from "./handoff";

describe("privacy-preserving KY handoff", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("puts only allowlisted enum/public IDs in the URL", () => {
    const href = safeKyHandoffHref({
      source: "accident",
      accidentId: "mhlw-123",
      accidentType: "fall",
      workCategory: "construction",
    });
    expect(href).toBe(
      "/ky/paper?source=accident&fromAccident=mhlw-123&accidentType=fall&workCategory=construction",
    );
    expect(href).not.toMatch(/title|summary|member|note|workDraft/u);
  });

  it("keeps work text and reviewed measure text only in one-shot module memory", () => {
    const rawWork = "密閉設備内でトルエンを洗浄に使用する";
    const payload = createKyHandoffPayload({
      source: "chemical-ra",
      chemicalId: "cas:108-88-3",
      cas: "108-88-3",
      workCategory: "chemical",
      workDraft: rawWork,
      hazardIds: ["chemical-exposure"],
      measureDrafts: [
        {
          id: "measure-reviewed-1",
          text: "局所排気を有効な位置で使用する",
          level: "engineering",
        },
      ],
    });
    expect(writeKyHandoff(payload)).toBe(true);
    expect(window.sessionStorage.getItem(KY_HANDOFF_STORAGE_KEY)).toBeNull();
    const href = safeKyHandoffHref({
      source: payload.source,
      chemicalId: payload.chemicalId,
      cas: payload.cas,
    });
    expect(href).not.toContain(encodeURIComponent(rawWork));
    expect(href).not.toContain(rawWork);
    const parsed = parseKyHandoffFromLocation("");
    expect(parsed?.workDraft).toBe(rawWork);
    expect(parsed?.measureDrafts[0]).toMatchObject({
      text: "局所排気を有効な位置で使用する",
      level: "engineering",
    });
    expect(parsed?.workCategory).toBe("chemical");
    expect(window.sessionStorage.getItem(KY_HANDOFF_STORAGE_KEY)).toBeNull();
    expect(parseKyHandoffFromLocation("")).toBeNull();
  });

  it("keeps engineering-meeting work, hazards and measures out of the URL", () => {
    const payload = createKyHandoffPayload({
      source: "meeting",
      workDraft: "足場上で外壁パネルを取り付ける",
      hazardDrafts: [{ id: "meeting-hazard-1", title: "足場端部から墜落する" }],
      measureDrafts: [
        {
          id: "meeting-measure-1",
          text: "作業床と手すりを先行設置する",
          level: "engineering",
        },
      ],
    });
    expect(writeKyHandoff(payload)).toBe(true);
    expect(window.sessionStorage.getItem(KY_HANDOFF_STORAGE_KEY)).toBeNull();
    const href = safeKyHandoffHref({ source: "meeting" });
    expect(href).toBe("/ky/paper?source=meeting");
    expect(href).not.toMatch(/足場|墜落|手すり|payload/u);
    const parsed = parseKyHandoffFromLocation("");
    expect(parsed?.workDraft).toBe("足場上で外壁パネルを取り付ける");
    expect(parsed?.hazardDrafts[0]?.title).toBe("足場端部から墜落する");
    expect(parsed?.measureDrafts[0]?.text).toBe("作業床と手すりを先行設置する");
  });

  it("maps a reviewed Visual KYT public ID to candidates without confirmation", () => {
    const parsed = parseKyHandoffFromLocation(
      "?import=visual-kyt&scenario=vkyt-001",
    );
    expect(parsed?.hazardIds).toEqual(
      expect.arrayContaining(["fall-scaffold", "falling-object"]),
    );
    expect(parsed?.label).toMatch(/候補/u);
    expect(parsed).not.toHaveProperty("confirmedAt");
  });

  it("rejects raw accident text and incomplete accident context", () => {
    expect(
      parseKyHandoffFromLocation(
        "?fromAccident=%E4%BD%9C%E6%A5%AD%E8%80%85A&accidentType=raw-text&workCategory=construction",
      ),
    ).toBeNull();
    expect(parseKyHandoffFromLocation("?source=accident")).toBeNull();
    expect(
      parseKyHandoffFromLocation(
        "?source=accident&fromAccident=mhlw-123&accidentType=fall&workCategory=construction",
      ),
    ).toBeNull();
    expect(
      parseKyHandoffFromLocation(
        "?source=chemical-ra&chemical=cas%3A108-88-3&cas=108-88-3",
      ),
    ).toBeNull();
  });

  it("never reuses a same-source session for a different public ID", () => {
    expect(
      writeKyHandoff(
        createKyHandoffPayload({
          source: "visual-kyt",
          scenarioId: "vkyt-001",
          workDraft: "古い問題の作業",
          hazardDrafts: [{ id: "haz-old", title: "古い危険" }],
        }),
      ),
    ).toBe(true);
    const parsed = parseKyHandoffFromLocation(
      "?source=visual-kyt&scenario=vkyt-015",
    );
    expect(parsed?.sourceId).toBe("vkyt-015");
    expect(parsed?.workDraft).toBeNull();
    expect(parsed?.hazardDrafts).toEqual([]);
    expect(window.sessionStorage.getItem(KY_HANDOFF_STORAGE_KEY)).toBeNull();
  });

  it("does not accept an ambiguous/raw area as canonical", () => {
    const payload = createKyHandoffPayload({
      source: "heat",
      areaId: "中央区",
      hazardIds: ["heat-illness"],
    });
    const validated = validateKyHandoffPayload(payload);
    expect(validated?.areaId).toBeUndefined();
    expect(safeKyHandoffHref({ source: "heat", areaId: "中央区" })).toBe(
      "/ky/paper?source=heat",
    );
  });

  it("expires temporary handoff after 15 minutes", () => {
    const now = new Date("2026-08-01T00:00:00Z");
    const payload = createKyHandoffPayload(
      { source: "heat", areaId: "tokyo-shinjuku" },
      now,
    );
    expect(validateKyHandoffPayload(payload, now.getTime())).not.toBeNull();
    expect(
      validateKyHandoffPayload(payload, now.getTime() + 15 * 60_000 + 1),
    ).toBeNull();
  });

  it("removes expired session payload rather than silently reusing it", () => {
    window.sessionStorage.setItem(
      KY_HANDOFF_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        source: "heat",
        createdAt: "2020-01-01T00:00:00Z",
        expiresAt: "2020-01-01T00:15:00Z",
      }),
    );
    expect(readKyHandoff()).toBeNull();
    expect(window.sessionStorage.getItem(KY_HANDOFF_STORAGE_KEY)).toBeNull();
  });
});
