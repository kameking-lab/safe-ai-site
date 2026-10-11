import { warningOfficeAreas } from './warning-areas.mjs';
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import warningsFallback from "@/data/jma/warnings.json";
import weatherFallback from "@/data/jma/weather.json";
import earthquakesFallback from "@/data/jma/earthquakes.json";

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

import {
  fetchEarthquakesLive,
  fetchWarningsLive,
  fetchWeatherLive,
} from "./fetch-jma-runtime";
import {
  jmaWarningJsonCodesForIso2,
  jmaWarningJsonUrl,
} from "./jma-warning-codes";

function warningResponse(body: string, init: ResponseInit = {}) {
  return new Response(body, {...init, headers: {date: new Date().toUTCString(), "content-type": "application/json", ...init.headers}});
}

function r8(payload: {reportDatetime: string; publishingOffice: string; headlineText: string; areaTypes: Array<{areas: Array<{code: string; warnings: Array<{code?: string; status: string}>}>}>}) {
  return [{controlDatetime: payload.reportDatetime, reportDatetime: payload.reportDatetime, publishingOffice: payload.publishingOffice, headlineText: payload.headlineText, dataTypeCode: "VPWW55", warning: {class10Items: warningOfficeAreas["130000"].class10.map(areaCode=>({areaCode,kinds:payload.areaTypes[0].areas[0].warnings.length ? payload.areaTypes[0].areas[0].warnings : [{status:"発表警報・注意報はなし"}]})), class20Items: payload.areaTypes.flatMap(t=>t.areas.map(a=>({areaCode:a.code, kinds:a.warnings.length ? a.warnings : [{status:"発表警報・注意報はなし"}]})))}}];
}

describe("JMA runtime fail-closed fallback", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("synthetic outage")));
  });

  afterEach(() => vi.unstubAllGlobals());

  it("全面警報取得失敗時は新しい『警報なし』を作らず既知snapshotを保持する", async () => {
    const result = await fetchWarningsLive();
    expect(result.fetchedAt).toBe(warningsFallback.fetchedAt);
    expect(vi.mocked(fetch).mock.calls.every(([, options]) => options?.cache === "no-store")).toBe(true);
    expect(Object.keys(result.byIso)).toEqual(Object.keys(warningsFallback.byIso));
    for (const [iso, fallbackEntry] of Object.entries(warningsFallback.byIso)) {
      expect(result.byIso[iso]).toMatchObject({
        ...fallbackEntry,
        sourceStatus: "fallback",
        sourceFetchedAt: warningsFallback.fetchedAt,
        sourceIssue: "fetch-failed",
      });
    }
    expect(result.quality).toMatchObject({ status: "fallback", succeeded: 0 });
  });

  it("天気・地震も全面失敗時にlast-known-good時刻を保持する", async () => {
    const weather = await fetchWeatherLive();
    const earthquakes = await fetchEarthquakesLive();
    expect(weather.fetchedAt).toBe(weatherFallback.fetchedAt);
    expect(weather.quality?.status).toBe("fallback");
    expect(earthquakes.fetchedAt).toBe(earthquakesFallback.fetchedAt);
    expect(earthquakes.quality?.status).toBe("fallback");
  });

  it("HTTP 200でも空・型違い・必須欠落は成功数に入れない", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(warningResponse("{}", { status: 200 }))
      .mockResolvedValueOnce(warningResponse("[]", { status: 200 }))
      .mockResolvedValue(warningResponse(JSON.stringify("<html>error</html>"), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const warnings = await fetchWarningsLive();
    expect(warnings.quality).toMatchObject({ status: "fallback", succeeded: 0 });
  });

  it("同一予報区の応答を全地域の警報なしとして扱わない", async () => {
    const empty = {
      reportDatetime: new Date().toISOString(),
      publishingOffice: "気象庁",
      headlineText: "",
      areaTypes: [{ areas: [{ code: "130010", warnings: [] }] }],
    };
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(
      warningResponse(JSON.stringify(r8(empty)), { status: 200, headers: { "content-type": "application/json" } }),
    )));
    const warnings = await fetchWarningsLive();
    expect(warnings.quality).toMatchObject({ status: "degraded", succeeded: 1 });
    expect(warnings.byIso["JP-04"].sourceStatus).toBe("fallback");
    expect(warnings.quality?.issues).toContain("schema-mismatch");
  });

  it("PF-003: 未来・異常なreport日時をlive/警報なしにせず理由付きfallbackへ伝播する", async () => {
    for (const [reportDatetime, issue] of [
      ["2099-01-01T00:00:00Z", "future-datetime"],
      ["1900-01-01T00:00:00Z", "abnormal-datetime"],
          ] as const) {
      const response = {
        reportDatetime,
        publishingOffice: "気象庁",
        headlineText: "発表警報・注意報はなし",
        areaTypes: [
          {
            areas: [
              {
                code: "130010",
                warnings: [{ status: "発表警報・注意報はなし" }],
              },
            ],
          },
        ],
      };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(() => Promise.resolve(
          warningResponse(JSON.stringify(r8(response)), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        )),
      );
      const warnings = await fetchWarningsLive();
      expect(warnings.quality).toMatchObject({
        status: "fallback",
        succeeded: 0,
      });
      expect(warnings.quality?.issues).toContain(issue);
      expect(warnings.byIso["JP-13"]?.sourceIssue).toBe(issue);
    }
  });

  it("天気{}と地震[]のHTTP 200をliveにしない", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      const body = url.includes("quake") ? [] : {};
      return Promise.resolve(warningResponse(JSON.stringify(body), { status: 200 }));
    }));
    const weather = await fetchWeatherLive();
    const earthquakes = await fetchEarthquakesLive();
    expect(weather.quality).toMatchObject({ status: "fallback", succeeded: 0 });
    expect(earthquakes.quality).toMatchObject({ status: "fallback", succeeded: 0 });
  });

  it("部分障害時は都道府県単位のlive/fallback provenanceを保持する", async () => {
    const tokyoUrls = new Set(
      jmaWarningJsonCodesForIso2("JP-13").map(jmaWarningJsonUrl),
    );
    const tokyoWarning = {
      reportDatetime: new Date().toISOString(),
      publishingOffice: "気象庁",
      headlineText: "東京都に大雨警報",
      areaTypes: [
        {
          areas: [
            {
              code: "1310410",
              warnings: [{ code: "03", status: "発表" }],
            },
          ],
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        tokyoUrls.has(url)
          ? Promise.resolve(
              warningResponse(JSON.stringify(r8(tokyoWarning)), {
                status: 200,
                headers: { "content-type": "application/json" },
              }),
            )
          : Promise.reject(new Error("synthetic regional outage")),
      ),
    );

    const warnings = await fetchWarningsLive();
    expect(warnings.quality?.status).toBe("degraded");
    expect(warnings.byIso["JP-13"]).toMatchObject({
      sourceStatus: "live",
      sourceFetchedAt: expect.any(String),
      level: "warning",
    });
    expect(warnings.byIso["JP-01"]).toMatchObject({
      sourceStatus: "fallback",
      sourceFetchedAt: warningsFallback.fetchedAt,
    });
  });
});

describe('JMA current snapshot and transport freshness',()=>{
  afterEach(()=>vi.unstubAllGlobals());
  it('古い発表時刻を保持した新鮮なR8取得で正常な現在状態を返す',async()=>{
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      const code = url.split('/').at(-1)!.slice(0, 2);
      const data = r8({reportDatetime:'2026-05-28T01:16:00Z', publishingOffice:url, headlineText:'', areaTypes:[{areas:[{code:code+'10400',warnings:[{status:'発表警報・注意報はなし'}]}]}]});
      const office = warningOfficeAreas[url.split('/').at(-1)!.slice(0,6)];
      data[0].warning.class10Items = office.class10.map(areaCode=>({areaCode,kinds:[{status:'発表警報・注意報はなし'}]}));
      data[0].warning.class20Items[0].areaCode = office.class20[0] ?? code+'10400';
      return Promise.resolve(warningResponse(JSON.stringify(data)));
    }));
    const result=await fetchWarningsLive();
    expect(result.quality).toMatchObject({status:'live',attempted:57,succeeded:57});
    expect(result.byIso['JP-01'].entries.map(e=>e.sourceCode)).toContain('014100');
    expect(result.byIso['JP-13'].entries[0].reportDatetime).toBe('2026-05-28T01:16:00Z');
    expect(result.byIso['JP-13'].sourceFetchedAt).not.toBe('2026-05-28T01:16:00Z');
  });
  it.each([{date:new Date().toUTCString(),age:'901'}, {date:'Thu, 01 Jan 2026 00:00:00 GMT'}, {}] as Array<Record<string,string>>)('古いまたは検証できないHTTP取得は停止する %#',async headers=>{
    vi.stubGlobal('fetch',vi.fn(()=>Promise.resolve(new Response('[]',{status:200,headers}))));
    const result=await fetchWarningsLive();
    expect(result.quality?.status).toBe('fallback');
    expect(result.byIso['JP-13'].sourceFetchedAt).toBe(warningsFallback.fetchedAt);
    expect(result.byIso['JP-13'].sourceIssue).toBe(headers.date ? 'stale' : 'unverified');
  });
});
