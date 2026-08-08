import { afterEach, describe, expect, it, vi } from "vitest";

describe("POST /api/chemical-ra safety boundary", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("fails closed for an unknown substance instead of returning a toluene demo", async () => {
    vi.stubEnv("GEMINI_API_KEY", "dummy");
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/chemical-ra", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chemicalName: "監査用未収録物質-XYZ-987654",
          ventilation: "none",
          amount: "large",
          durationHours: 8,
        }),
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(422);
    expect(json.error.code).toBe("NOT_FOUND");
    expect(JSON.stringify(json)).not.toContain("トルエン");
    expect(JSON.stringify(json)).not.toContain("50ppm");
  });

  it("suppresses an untraceable concentration value and never invents a CREATE-SIMPLE score", async () => {
    vi.stubEnv("GEMINI_API_KEY", "dummy");
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/chemical-ra", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chemicalName: "トルエン",
          ventilation: "none",
          amount: "large",
          durationHours: 8,
        }),
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.casNumber).toBe("108-88-3");
    expect(json.createSimple).toBeUndefined();
    expect(json.assessmentStatus).toBe("unavailable");
    expect(json.aiStatus).toBe("disabled_for_safety");
    expect(json.exposureLimit).toBeUndefined();
    expect(JSON.stringify(json.relatedHazards)).not.toContain("20 ppm");
    expect(
      json.sourceLinks.some(
        (source: { label?: string }) =>
          source.label ===
          "厚生労働省 濃度基準値等の公表資料（製品SDSではありません）",
      ),
    ).toBe(false);
    expect(JSON.stringify(json)).not.toContain("職場のあんぜんサイト SDS");
    expect(JSON.stringify(json)).not.toContain("参考値（50ppm）");
  });

  it("shows concentration values only with an allowlisted MHLW source URL", async () => {
    const { buildOfficialResponse } = await import(
      "@/lib/chemical/official-ra-response"
    );
    const base = {
      cas: "34590-94-8",
      primaryName: "監査用物質",
      aliases: [],
      flags: { carcinogenic: false, concentration: true, skin: false, label_sds: true },
      appliedDates: {},
      notes: [],
      entryCount: 1,
      details: {
        limit8h: "50 ppm",
        limits: {
          mhlwSdsUrl:
            "https://anzeninfo.mhlw.go.jp/user/anzen/kag/pdf/noudo/34590-94-8.pdf",
        },
      },
    };

    const linked = buildOfficialResponse(base);
    expect(linked.exposureLimit).toContain("50 ppm");
    expect(linked.sourceLinks).toContainEqual({
      label: "厚生労働省 濃度基準値等の公表資料（製品SDSではありません）",
      url: "https://anzeninfo.mhlw.go.jp/user/anzen/kag/pdf/noudo/34590-94-8.pdf",
    });

    const untrusted = buildOfficialResponse({
      ...base,
      details: {
        ...base.details,
        limits: { mhlwSdsUrl: "https://mhlw.go.jp.evil.example/value.pdf" },
      },
    });
    expect(untrusted.exposureLimit).toBeUndefined();
    expect(JSON.stringify(untrusted.sourceLinks)).not.toContain("evil.example");
  });

  it("does not fuzzy-match a partial chemical name", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/chemical-ra", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chemicalName: "トル" }),
      }),
    );
    expect(response.status).toBe(422);
  });

  it("does not choose the first same-name xylene record without CAS", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/chemical-ra", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chemicalName: "キシレン" }),
    }));
    const json = await response.json();
    expect(response.status).toBe(422);
    expect(json.error.code).toBe("AMBIGUOUS");
    expect(json.error.message).toContain("CAS番号");
  });

  it.each([
    "95-47-6",
    "106-42-3",
    "108-38-3",
    "1330-20-7",
  ])("continues only for a uniquely verified xylene CAS: %s", async (casNumber) => {
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/chemical-ra", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chemicalName: "キシレン", casNumber }),
    }));
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.casNumber).toBe(casNumber);
  });

  it("rejects a CAS/name mismatch", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/chemical-ra", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chemicalName: "トルエン", casNumber: "1330-20-7" }),
    }));
    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("CAS_MISMATCH");
  });

  it("rejects unknown and invalid CAS numbers", async () => {
    const { POST } = await import("./route");
    for (const [casNumber, code] of [["123-45-6", "INVALID_CAS"], ["9999999-99-5", "NOT_FOUND"]]) {
      const response = await POST(new Request("http://localhost/api/chemical-ra", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chemicalName: "キシレン", casNumber }),
      }));
      expect(response.status).toBe(422);
      expect((await response.json()).error.code).toBe(code);
    }
  });

  it("fails closed for duplicate CAS records and missing verification sources", async () => {
    const { resolveExactChemical } = await import(
      "@/lib/chemical/official-ra-response"
    );
    const base = {
      cas: "108-88-3",
      primaryName: "試験物質",
      aliases: [],
      flags: { carcinogenic: false, concentration: false, skin: false, label_sds: true },
      appliedDates: {},
      notes: [],
      entryCount: 1,
    };
    expect(resolveExactChemical("試験物質", "108-88-3", [
      { ...base, details: { link: "https://example.invalid/sds" } },
      { ...base, primaryName: "試験物質別レコード", details: { link: "https://example.invalid/sds2" } },
    ])).toMatchObject({ ok: false, code: "DUPLICATE" });
    expect(resolveExactChemical("試験物質", "108-88-3", [base])).toMatchObject({
      ok: false,
      code: "SDS_INSUFFICIENT",
    });
  });
});
