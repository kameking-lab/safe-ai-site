import { afterEach, describe, expect, it, vi } from "vitest";

// 検証では実DBへ接続しない。本番のDB必須境界は503で確認する。
vi.mock("@/lib/prisma", () => ({ prisma: null }));

describe("POST /api/chemical-ra safety boundary", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("serves bundled acetone GHS without credentials in preview and rejects request 31 in the same process", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "a67ce70120261011");
    vi.stubEnv("SHARED_STATE_HMAC_SECRET", "");
    vi.stubEnv("AUTOMATION_CONSULT_STATE_HASH_SECRET", "");
    vi.stubEnv("DATABASE_URL", "");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-11T00:00:00Z"));
    const { POST } = await import("./route");
    const request = () => new Request("http://localhost/api/chemical-ra", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ chemicalName: "アセトン", casNumber: "67-64-1" }),
    });

    const response = await POST(request());
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.casNumber).toBe("67-64-1");
    expect(result.ghsHazards).toHaveLength(4);
    expect(result.aiStatus).toBe("disabled_for_safety");
    expect(result.assessmentStatus).toBe("unavailable");
    expect(result.createSimple).toBeUndefined();
    for (let count = 2; count <= 30; count++) {
      expect((await POST(request())).status).toBe(200);
    }
    const limited = await POST(request());
    expect(limited.status).toBe(429);
    expect((await limited.json()).error.code).toBe("rate_limited");
  });

  it.each(["", "safe-ai-local-test-shared-state-secret-20260731"])(
    "keeps production stopped without shared storage even with preview option and HMAC fixture %s",
    async (secret) => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("VERCEL_ENV", "production");
      vi.stubEnv("SHARED_STATE_HMAC_SECRET", secret);
      vi.stubEnv("AUTOMATION_CONSULT_STATE_HASH_SECRET", "");
      vi.stubEnv("DATABASE_URL", "");
      const { POST } = await import("./route");
      const response = await POST(new Request("http://localhost/api/chemical-ra", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ chemicalName: "アセトン", casNumber: "67-64-1" }),
      }));
      expect(response.status).toBe(503);
      expect((await response.json()).error.code).toBe("shared_rate_limit_unavailable");
    },
  );

  it("keeps the real acetone CAS and stored NITE GHS classifications without enabling numeric assessment", async () => {
    const { POST } = await import("./route");
    for (const chemicalName of ["アセトン", "67-64-1"]) {
      const response = await POST(new Request("http://localhost/api/chemical-ra", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chemicalName, casNumber: "67-64-1" }),
      }));
      const result = await response.json();
      expect(response.status).toBe(200);
      expect(result.casNumber).toBe("67-64-1");
      expect(result.ghsHazards).toHaveLength(4);
      expect(result.sourceLinks.some((source: { url: string }) => source.url.includes("67-64-1"))).toBe(true);
      expect(result.aiStatus).toBe("disabled_for_safety");
      expect(result.assessmentStatus).toBe("unavailable");
      expect(result.createSimple).toBeUndefined();
      expect(result.exposureLimit).toBeUndefined();
    }
  });

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
