import { describe, expect, it } from "vitest";
import {
  parseJmaEarthquakeResponse,
  parseJmaForecastResponse,
  parseJmaWarningResponse,
  inspectJmaWarningResponse,
} from "./jma-runtime-schema";

const validWarning = {
  reportDatetime: "2026-07-28T12:00:00+09:00",
  publishingOffice: "気象庁",
  headlineText: "発表警報・注意報はなし",
  areaTypes: [{ areas: [{ code: "130010", warnings: [{ code: "03", status: "なし" }] }] }],
};
const warningReferenceNow = new Date("2026-07-28T04:00:00Z");

const validForecast = [{
  reportDatetime: "2026-07-23T11:00:00+09:00",
  publishingOffice: "気象庁",
  timeSeries: [{
    timeDefines: ["2026-07-23T12:00:00+09:00"],
    areas: [{ area: { code: "130010", name: "東京地方" }, weatherCodes: ["100"], weathers: ["晴れ"] }],
  }],
}];

const validQuake = [{
  eid: "20260723120000",
  rdt: "2026-07-23T12:01:00+09:00",
  at: "2026-07-23T12:00:00+09:00",
  anm: "東京都多摩東部",
  mag: "3.2",
  maxInt: "3",
  ttl: "震源・震度情報",
}];

describe("JMA HTTP 200 runtime schemas", () => {
  it("accepts complete warning, forecast, and earthquake responses", () => {
    expect(parseJmaWarningResponse(validWarning, warningReferenceNow)).not.toBeNull();
    expect(parseJmaForecastResponse(validForecast)).not.toBeNull();
    expect(parseJmaEarthquakeResponse(validQuake)).not.toBeNull();
  });

  it.each([{}, [], "<html>error</html>", null, { reportDatetime: "invalid" }])(
    "rejects malformed warning payload %#",
    (payload) => expect(parseJmaWarningResponse(payload)).toBeNull(),
  );

  it("PF-003: r8の正当な『警報・注意報なし』はcode欠落でも受理する", () => {
    const parsed = parseJmaWarningResponse([
      {
        controlDatetime: "2026-07-28T03:46:26Z",
        reportDatetime: "2026-07-28T12:46:00+09:00",
        publishingOffice: "気象庁",
        headlineText: "注意報を解除します。",
        dataTypeCode: "VPWW56",
        warning: {
          class20Items: [
            {
              areaCode: "1310100",
              kinds: [{ status: "発表警報・注意報はなし" }],
            },
          ],
        },
      },
    ], warningReferenceNow);
    expect(parsed).not.toBeNull();
    expect(parsed?.areaTypes?.[0]?.areas?.[0]?.warnings).toEqual([
      { code: undefined, status: "発表警報・注意報はなし" },
    ]);
  });

  it("PF-003: r8の発表中項目でcodeが欠けるschema不一致は拒否する", () => {
    expect(
      parseJmaWarningResponse([
        {
          controlDatetime: "2026-07-28T03:46:26Z",
          reportDatetime: "2026-07-28T12:46:00+09:00",
          publishingOffice: "気象庁",
          dataTypeCode: "VPWW56",
          warning: {
            class20Items: [
              { areaCode: "1310100", kinds: [{ status: "発表" }] },
            ],
          },
        },
      ], warningReferenceNow),
    ).toBeNull();
  });

  it("2026危険警報の注意報への切替を、code付きの発表継続状態として受理する", () => {
    const parsed = parseJmaWarningResponse([
      {
        controlDatetime: "2026-07-30T14:08:26Z",
        reportDatetime: "2026-07-30T23:08:00+09:00",
        publishingOffice: "新潟地方気象台",
        headlineText: "危険警報を注意報へ切り替えます。",
        dataTypeCode: "VPWW56",
        warning: {
          class20Items: [
            {
              areaCode: "150010",
              kinds: [{ code: "29", status: "危険警報から注意報" }],
            },
          ],
        },
      },
    ], new Date("2026-07-30T14:10:00Z"));
    expect(parsed).not.toBeNull();
    expect(parsed?.areaTypes?.[0]?.areas?.[0]?.warnings).toEqual([
      { code: "29", status: "危険警報から注意報" },
    ]);
  });

  it("PF-003: 上流の未来・異常・stale日時をschema不一致と分けて拒否する", () => {
    const now = new Date("2026-07-28T04:00:00Z");
    expect(
      inspectJmaWarningResponse(
        { ...validWarning, reportDatetime: "2099-01-01T00:00:00Z" },
        now,
      ),
    ).toEqual({ ok: false, issue: "future-datetime" });
    expect(
      inspectJmaWarningResponse(
        { ...validWarning, reportDatetime: "1900-01-01T00:00:00Z" },
        now,
      ),
    ).toEqual({ ok: false, issue: "abnormal-datetime" });
    expect(
      inspectJmaWarningResponse(
        { ...validWarning, reportDatetime: "not-a-date" },
        now,
      ),
    ).toEqual({ ok: false, issue: "abnormal-datetime" });
    expect(
      inspectJmaWarningResponse(
        { ...validWarning, reportDatetime: "2026-01-01T00:00:00Z" },
        now,
      ),
    ).toEqual({ ok: false, issue: "stale" });
    expect(inspectJmaWarningResponse({}, now)).toEqual({
      ok: false,
      issue: "schema-mismatch",
    });
  });

  it("PF-003: 未知status・未知codeは正当な警報なしへ落とさない", () => {
    const now = new Date("2026-07-28T04:00:00Z");
    expect(
      inspectJmaWarningResponse(
        {
          ...validWarning,
          areaTypes: [
            {
              areas: [
                {
                  code: "130010",
                  warnings: [{ code: "03", status: "未確認状態" }],
                },
              ],
            },
          ],
        },
        now,
      ),
    ).toEqual({ ok: false, issue: "schema-mismatch" });
    expect(
      inspectJmaWarningResponse(
        {
          ...validWarning,
          areaTypes: [
            {
              areas: [
                {
                  code: "130010",
                  warnings: [{ code: "99", status: "発表" }],
                },
              ],
            },
          ],
        },
        now,
      ),
    ).toEqual({ ok: false, issue: "schema-mismatch" });
  });

  it("rejects empty/partial forecast and invalid datetime", () => {
    expect(parseJmaForecastResponse([])).toBeNull();
    expect(parseJmaForecastResponse([{ ...validForecast[0], timeSeries: [] }])).toBeNull();
    expect(parseJmaForecastResponse([{ ...validForecast[0], reportDatetime: "not-a-date" }])).toBeNull();
  });

  it("rejects empty/partial earthquake lists", () => {
    expect(parseJmaEarthquakeResponse([])).toBeNull();
    expect(parseJmaEarthquakeResponse([{ ...validQuake[0], at: undefined }])).toBeNull();
  });
});
