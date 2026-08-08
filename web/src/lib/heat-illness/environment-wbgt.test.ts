import { describe, expect, it, vi } from "vitest";
import { getSignageLocationById } from "@/data/signage-locations";
import {
  loadEnvironmentWbgtStatus,
  parseEnvironmentActualCsv,
  parseEnvironmentAlertCsv,
  parseEnvironmentForecastCsv,
} from "./environment-wbgt";

const NOW = Date.parse("2026-07-31T03:40:00.000Z"); // 12:40 JST

describe("Environment Ministry WBGT parsing", () => {
  it("uses the latest non-future row and labels the prefecture maximum", () => {
    const result = parseEnvironmentActualCsv(
      [
        "Date,Time,44046,44056,44071",
        "2026/7/31,11:00,29.1,30.2,---",
        "2026/7/31,12:00,30.0,31.4,30.7",
        "2026/7/31,13:00,35.0,35.0,35.0",
      ].join("\n"),
      NOW,
    );
    expect(result).toEqual({
      valueCelsius: 31.4,
      targetAt: "2026-07-31T03:00:00.000Z",
      createdAt: null,
      stationCount: 3,
      expectedStationCount: 3,
    });
  });

  it("parses tenths from the first usable forecast target", () => {
    const result = parseEnvironmentForecastCsv(
      [
        ",,2026073112,2026073115,2026073118",
        "44046,2026/07/31 11:25,300,270,250",
        "44056,2026/07/31 11:25,290,330,280",
      ].join("\n"),
      NOW,
    );
    expect(result?.valueCelsius).toBe(33);
    expect(result?.targetAt).toBe("2026-07-31T06:00:00.000Z");
    expect(result?.stationCount).toBe(2);
    expect(result?.expectedStationCount).toBe(2);
  });

  it("keeps heat alert, special alert, candidate, and unavailable distinct", () => {
    const base = [
      "ReportDate,2026/07/31",
      "ReportTime,05:00:00",
      "TargetDate1,2026/07/31",
      "府県予報区,番号,サブ,区域コード,都道府県名,都道府県コード,TargetDate1フラグ",
    ];
    expect(
      parseEnvironmentAlertCsv(
        [...base, "東京都,44,0,130000,東京,13,1"].join("\n"),
        "JP-13",
        "2026-07-31",
      ),
    ).toMatchObject({
      heatAlert: "active",
      specialHeatAlert: "inactive",
    });
    expect(
      parseEnvironmentAlertCsv(
        [...base, "東京都,44,0,130000,東京,13,2"].join("\n"),
        "JP-13",
        "2026-07-31",
      ),
    ).toMatchObject({
      heatAlert: "inactive",
      specialHeatAlert: "candidate",
    });
    expect(
      parseEnvironmentAlertCsv(
        [...base, "東京都,44,0,130000,東京,13,3"].join("\n"),
        "JP-13",
        "2026-07-31",
      ),
    ).toMatchObject({
      heatAlert: "inactive",
      specialHeatAlert: "active",
    });
    expect(
      parseEnvironmentAlertCsv(
        [...base, "東京都,44,0,130000,東京,13,9"].join("\n"),
        "JP-13",
        "2026-07-31",
      ),
    ).toMatchObject({
      heatAlert: "unavailable",
      specialHeatAlert: "unavailable",
    });
  });

  it("does not reuse an alert file whose target date is not today", () => {
    const result = parseEnvironmentAlertCsv(
      [
        "ReportDate,2026/07/30",
        "ReportTime,17:00:00",
        "TargetDate1,2026/07/30",
        "東京都,44,0,130000,東京,13,0",
      ].join("\n"),
      "JP-13",
      "2026-07-31",
    );
    expect(result).toMatchObject({
      heatAlert: "unavailable",
      specialHeatAlert: "unavailable",
    });
  });
});

describe("Environment Ministry WBGT fail-closed status", () => {
  it("uses the official estimated-current feed without calling it a site measurement", async () => {
    const location = getSignageLocationById("tokyo-shinjuku");
    expect(location).toBeDefined();
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/est15WG/")) {
        return new Response(
          [
            "Date,Time,44046,44056",
            "2026/7/31,12:00,30.0,31.4",
          ].join("\n"),
          { status: 200 },
        );
      }
      if (url.includes("/prev15WG/")) {
        return new Response(
          [
            ",,2026073115",
            "44046,2026/07/31 11:25,320",
          ].join("\n"),
          { status: 200 },
        );
      }
      if (url.includes("/alert/")) {
        return new Response(
          [
            "ReportDate,2026/07/31",
            "ReportTime,05:00:00",
            "TargetDate1,2026/07/31",
            "東京都,44,0,130000,東京,13,1",
          ].join("\n"),
          { status: 200 },
        );
      }
      return new Response("", { status: 404 });
    }) as unknown as typeof fetch;

    const result = await loadEnvironmentWbgtStatus({
      location: location!,
      now: new Date(NOW),
      fetchImpl,
    });
    expect(result.wbgt).toMatchObject({
      status: "estimated",
      mode: "official-estimated-current",
      valueCelsius: 31.4,
      stale: false,
    });
    expect(result.wbgt.label).toContain("実況推定");
    expect(result.scopeLabel).toContain("作業地点");
    expect(result.alerts.heatAlert).toBe("active");
  });

  it("reports unavailable and degraded instead of a low-risk value", async () => {
    const location = getSignageLocationById("tokyo-shinjuku");
    const fetchImpl = vi.fn(async () => new Response("", { status: 503 })) as unknown as typeof fetch;
    const result = await loadEnvironmentWbgtStatus({
      location: location!,
      now: new Date(NOW),
      fetchImpl,
    });
    expect(result.wbgt.status).toBe("unavailable");
    expect(result.wbgt.valueCelsius).toBeNull();
    expect(result.alerts.heatAlert).toBe("unavailable");
    expect(result.degraded).toBe(true);
  });

  it("marks a partial station row degraded and labels only the values actually obtained", async () => {
    const location = getSignageLocationById("tokyo-shinjuku");
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/est15WG/")) {
        return new Response(
          [
            "Date,Time,44046,44056,44071",
            "2026/7/31,12:00,31.4,---,30.7",
          ].join("\n"),
          { status: 200 },
        );
      }
      if (url.includes("/prev15WG/")) return new Response("", { status: 404 });
      return new Response(
        [
          "ReportDate,2026/07/31",
          "ReportTime,10:00:00",
          "TargetDate1,2026/07/31",
          "東京都,44,0,130000,東京,13,0",
        ].join("\n"),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    const result = await loadEnvironmentWbgtStatus({
      location: location!,
      now: new Date(NOW),
      fetchImpl,
    });

    expect(result.wbgt.stationCount).toBe(2);
    expect(result.wbgt.expectedStationCount).toBe(3);
    expect(result.wbgt.label).toContain("一部欠測");
    expect(result.scopeLabel).toContain("2/3地点");
    expect(result.degraded).toBe(true);
  });

  it("uses the newest available alert release instead of stopping at the 05 release", async () => {
    const location = getSignageLocationById("tokyo-shinjuku");
    const requestedUrls: string[] = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      requestedUrls.push(url);
      if (url.includes("/est15WG/")) {
        return new Response(
          ["Date,Time,44046", "2026/7/31,12:00,31.4"].join("\n"),
          { status: 200 },
        );
      }
      if (url.includes("/prev15WG/")) {
        return new Response("", { status: 404 });
      }
      if (url.includes("_10.csv")) {
        return new Response(
          [
            "ReportDate,2026/07/31",
            "ReportTime,10:00:00",
            "TargetDate1,2026/07/31",
            "東京都,44,0,130000,東京,13,1",
          ].join("\n"),
          { status: 200 },
        );
      }
      if (url.includes("_05.csv")) {
        return new Response(
          [
            "ReportDate,2026/07/31",
            "ReportTime,05:00:00",
            "TargetDate1,2026/07/31",
            "東京都,44,0,130000,東京,13,0",
          ].join("\n"),
          { status: 200 },
        );
      }
      return new Response("", { status: 404 });
    }) as unknown as typeof fetch;

    const result = await loadEnvironmentWbgtStatus({
      location: location!,
      now: new Date(NOW),
      fetchImpl,
    });

    expect(result.alerts.heatAlert).toBe("active");
    expect(result.alerts.reportAt).toBe("2026-07-31T01:00:00.000Z");
    expect(requestedUrls.some((url) => url.includes("_10.csv"))).toBe(true);
    expect(requestedUrls.some((url) => url.includes("_17.csv"))).toBe(false);
    expect(requestedUrls.some((url) => url.includes("_14.csv"))).toBe(false);
    expect(requestedUrls.some((url) => url.includes("_05.csv"))).toBe(false);
  });

  it("does not fall back to an older alert release when the expected latest release fails", async () => {
    const location = getSignageLocationById("tokyo-shinjuku");
    const requestedUrls: string[] = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      requestedUrls.push(url);
      if (url.includes("/est15WG/")) {
        return new Response(
          ["Date,Time,44046", "2026/7/31,12:00,31.4"].join("\n"),
          { status: 200 },
        );
      }
      if (url.includes("/prev15WG/")) return new Response("", { status: 404 });
      if (url.includes("_10.csv")) return new Response("", { status: 503 });
      if (url.includes("_05.csv")) {
        return new Response(
          [
            "ReportDate,2026/07/31",
            "ReportTime,05:00:00",
            "TargetDate1,2026/07/31",
            "東京都,44,0,130000,東京,13,0",
          ].join("\n"),
          { status: 200 },
        );
      }
      return new Response("", { status: 404 });
    }) as unknown as typeof fetch;

    const result = await loadEnvironmentWbgtStatus({
      location: location!,
      now: new Date(NOW),
      fetchImpl,
    });

    expect(result.alerts.heatAlert).toBe("unavailable");
    expect(result.degraded).toBe(true);
    expect(requestedUrls.some((url) => url.includes("_10.csv"))).toBe(true);
    expect(requestedUrls.some((url) => url.includes("_05.csv"))).toBe(false);
  });
});
