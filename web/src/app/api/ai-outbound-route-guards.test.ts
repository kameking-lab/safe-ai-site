import { beforeEach, describe, expect, it, vi } from "vitest";

const modelSpies = vi.hoisted(() => ({
  generateHazards: vi.fn(),
  generateContent: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@/lib/ky/gemini-suggest", () => ({
  generateHazardsWithGemini: modelSpies.generateHazards,
  fallbackHazardSuggestions: () => [],
  isGeminiConfigured: () => true,
  KY_SUGGEST_DISCLAIMER: "人による確認が必要です。",
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: modelSpies.generateContent };

    constructor() {
      modelSpies.createClient();
    }
  },
}));

import { POST as postKy } from "@/app/api/ky/suggest/route";
import { POST as postMeeting } from "@/app/api/meeting/suggest/route";
import { POST as postSds } from "@/app/api/chemical/sds-extract/route";

function jsonRequest(pathname: string, body: unknown, ip: string) {
  return new Request(`http://localhost${pathname}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

const kyConditions = {
  workContent: "足場上で資材を運搬する",
  workLocation: "屋外作業区域",
  peopleCount: "3名",
  weather: "晴れ",
  equipment: "足場と台車",
  heavyEquipment: "なし",
  simultaneousWork: "荷揚げ作業",
  changes: "通常と異なる点はない",
  newEntrants: "1名",
  nightWork: "なし",
  chemicals: "なし",
  heatStress: "WBGT 28℃",
};

describe("AI outbound route guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("GEMINI_API_KEY", "test-only-key");
  });

  it("KYは同意がなければRAG・モデル呼び出し前にfail-closedとなる", async () => {
    const response = await postKy(
      jsonRequest("/api/ky/suggest", kyConditions, "198.51.100.11")
    );
    expect(response.status).toBe(428);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      reason: "consent_required",
    });
    expect(modelSpies.generateHazards).not.toHaveBeenCalled();
  });

  it("KYの個人情報は同意済みでもモデルへ送らない", async () => {
    const response = await postKy(
      jsonRequest(
        "/api/ky/suggest",
        {
          ...kyConditions,
          workContent: "担当者のメールは worker@example.com",
          aiProviderConsent: true,
        },
        "198.51.100.12"
      )
    );
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      reason: "sensitive_data",
    });
    expect(modelSpies.generateHazards).not.toHaveBeenCalled();
  });

  it("PF-004: authoritative context全項目をpreflightとAI promptへ渡す", async () => {
    modelSpies.generateHazards.mockResolvedValueOnce([]);
    const context = {
      workLocation: "屋外作業区域",
      equipment: "足場と台車",
      heavyEquipment: "25tラフター",
      plannedPeopleCount: "3名",
      weather: "晴れ",
      simultaneousWork: "荷揚げ作業",
      changes: "搬入経路変更",
      newEntrants: "1名",
      nightWork: "なし",
      chemicals: "なし",
      heatStress: "WBGT 28℃",
      reviewerName: "モデルへ送ってはいけない氏名",
      reviewedAt: "2026-07-28T04:00:00Z",
    };
    const response = await postKy(
      jsonRequest(
        "/api/ky/suggest",
        {
          workContent: "足場上で資材を運搬する",
          context,
          aiProviderConsent: true,
        },
        "198.51.100.16",
      ),
    );
    expect(response.status).toBe(200);
    expect(modelSpies.generateHazards).toHaveBeenCalledTimes(1);
    const prompt = String(modelSpies.generateHazards.mock.calls[0]?.[0]);
    for (const value of [
      context.workLocation,
      context.equipment,
      context.heavyEquipment,
      context.plannedPeopleCount,
      context.weather,
      context.simultaneousWork,
      context.changes,
      context.newEntrants,
      context.nightWork,
      context.chemicals,
      context.heatStress,
    ]) {
      expect(prompt).toContain(value);
    }
    expect(prompt).not.toContain(context.reviewerName);
    expect(prompt).not.toContain(context.reviewedAt);
  });

  it("工程打合せ書の緊急文は縮退候補より先に遮断しproviderへ送らない", async () => {
    const response = await postMeeting(
      jsonRequest(
        "/api/meeting/suggest",
        {
          workContent: "作業員が倒れて意識がない",
          workLocation: kyConditions.workLocation,
          plannedCount: kyConditions.peopleCount,
          weather: kyConditions.weather,
          machines: kyConditions.equipment,
          changes: kyConditions.changes,
          workDate: "2026-07-23",
          aiProviderConsent: true,
        },
        "198.51.100.13"
      )
    );
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      reason: "emergency",
      requiresHumanReview: true,
    });
    expect(modelSpies.generateHazards).not.toHaveBeenCalled();
  });

  it("工程打合せ書の通常入力も根拠未整備時は候補を生成せずproviderへ送らない", async () => {
    const response = await postMeeting(
      jsonRequest(
        "/api/meeting/suggest",
        {
          workContent: "足場の組立て作業",
          workLocation: kyConditions.workLocation,
          plannedCount: kyConditions.peopleCount,
          weather: kyConditions.weather,
          machines: kyConditions.equipment,
          changes: kyConditions.changes,
          workDate: "2026-07-23",
          aiProviderConsent: true,
        },
        "198.51.100.15"
      )
    );
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: "suggestion_provenance_unavailable",
      source: "withheld",
      suggestions: [],
      aiUsed: false,
    });
    expect(modelSpies.generateHazards).not.toHaveBeenCalled();
  });

  it("SDSの未検査バイナリはSDKを含まない経路で常に遮断する", async () => {
    const response = await postSds(
      jsonRequest(
        "/api/chemical/sds-extract",
        {
          pdfBase64: "dGVzdA==",
          mimeType: "application/pdf",
          aiProviderConsent: true,
        },
        "198.51.100.14"
      )
    );
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      reason: "uninspectable_binary",
    });
    expect(modelSpies.createClient).not.toHaveBeenCalled();
    expect(modelSpies.generateContent).not.toHaveBeenCalled();
  });
});
