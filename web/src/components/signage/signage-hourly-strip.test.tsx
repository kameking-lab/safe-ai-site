import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SignageHourlyStrip } from "./signage-hourly-strip";

describe("SignageHourlyStrip source time labels", () => {
  it("Open-Meteoの取得時刻と予報対象時刻をJSTで別表示する", () => {
    render(
      <SignageHourlyStrip
        status="success"
        locationLabel="匿名地点"
        fetchedAt="2026-07-23T00:05:00.000Z"
        forecastFrom="2026-07-23T01:00:00.000Z"
        forecastThrough="2026-07-24T14:00:00.000Z"
        hourly={[
          {
            time: "2026-07-23T01:00:00.000Z",
            hourLabel: "10時",
            tempC: 30,
            precipMm: 0,
            windMs: 2,
            weatherLabel: "晴れ",
            weatherCode: 0,
          },
        ]}
      />,
    );
    expect(screen.getByText(/Open-Meteo取得:/).textContent).toContain(
      "予報対象:",
    );
    expect(screen.getByText(/Open-Meteo取得:/).textContent).toContain("JST");
  });

  it("不明な時刻は推測せず不明と表示する", () => {
    render(
      <SignageHourlyStrip
        status="success"
        locationLabel="匿名地点"
        fetchedAt="invalid"
        forecastFrom={null}
        forecastThrough={null}
        hourly={[]}
      />,
    );
    expect(screen.getByText(/Open-Meteo取得:/).textContent).toContain("不明");
  });
});
