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

describe("JMA runtime fail-closed fallback", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("synthetic outage")));
  });

  afterEach(() => vi.unstubAllGlobals());

  it("全面警報取得失敗時は新しい『警報なし』を作らず既知snapshotを保持する", async () => {
    const result = await fetchWarningsLive();
    expect(result.fetchedAt).toBe(warningsFallback.fetchedAt);
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
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(new Response("[]", { status: 200 }))
      .mockResolvedValue(new Response(JSON.stringify("<html>error</html>"), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const warnings = await fetchWarningsLive();
    expect(warnings.quality).toMatchObject({ status: "fallback", succeeded: 0 });
  });

  it("全地域が同じ空応答ならスキーマ通過後でもliveにしない", async () => {
    const empty = {
      reportDatetime: new Date().toISOString(),
      publishingOffice: "気象庁",
      headlineText: "",
      areaTypes: [{ areas: [{ code: "130010", warnings: [] }] }],
    };
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(
      new Response(JSON.stringify(empty), { status: 200, headers: { "content-type": "application/json" } }),
    )));
    const warnings = await fetchWarningsLive();
    expect(warnings.quality).toMatchObject({ status: "fallback", succeeded: 0 });
    expect(warnings.quality?.issues).toContain("unverified");
  });

  it("PF-003: 未来・異常・staleなreport日時をlive/警報なしにせず理由付きfallbackへ伝播する", async () => {
    for (const [reportDatetime, issue] of [
      ["2099-01-01T00:00:00Z", "future-datetime"],
      ["1900-01-01T00:00:00Z", "abnormal-datetime"],
      ["2026-01-01T00:00:00Z", "stale"],
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
          new Response(JSON.stringify(response), {
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
      return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
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
              new Response(JSON.stringify(tokyoWarning), {
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
