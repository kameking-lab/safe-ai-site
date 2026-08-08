import { describe, expect, it } from "vitest";
import { getVisualKyScenarioById } from "@/data/visual-ky";
import {
  getJstDateKey,
  getSeasonalWeight,
  selectDailyVisualKy,
} from "./daily";

describe("visual KY daily JST selection", () => {
  it("uses the JST date boundary", () => {
    expect(getJstDateKey(new Date("2026-07-30T14:59:59.000Z"))).toBe(
      "2026-07-30",
    );
    expect(getJstDateKey(new Date("2026-07-30T15:00:00.000Z"))).toBe(
      "2026-07-31",
    );
  });

  it("returns the same problem for the same date without user tracking", () => {
    const first = selectDailyVisualKy({
      date: new Date("2026-07-30T03:00:00.000Z"),
    });
    const second = selectDailyVisualKy({
      date: new Date("2026-07-30T14:30:00.000Z"),
    });
    expect(first.dateKey).toBe("2026-07-30");
    expect(second.dateKey).toBe("2026-07-30");
    expect(first.scenario.id).toBe(second.scenario.id);
    expect(first.selectionMode).toBe("calendar-seasonal");
  });

  it("does not repeat a scenario inside the seven-day cooldown", () => {
    const selected: string[] = [];
    for (let day = 1; day <= 28; day += 1) {
      const date = new Date(
        `2026-04-${String(day).padStart(2, "0")}T03:00:00.000Z`,
      );
      selected.push(selectDailyVisualKy({ date }).scenario.id);
    }
    for (let index = 0; index < selected.length; index += 1) {
      expect(
        selected.slice(Math.max(0, index - 7), index),
      ).not.toContain(selected[index]);
    }
  });

  it("raises heat and wet-weather weights seasonally", () => {
    const heat = getVisualKyScenarioById("vkyt-010");
    const rain = getVisualKyScenarioById("vkyt-015");
    expect(heat).toBeDefined();
    expect(rain).toBeDefined();
    expect(getSeasonalWeight(heat!, "2026-07-15")).toBeGreaterThan(
      getSeasonalWeight(heat!, "2026-01-15"),
    );
    expect(getSeasonalWeight(rain!, "2026-07-15")).toBeGreaterThan(
      getSeasonalWeight(rain!, "2026-04-15"),
    );
  });

  it("falls back to the calendar rotation when weather data is unavailable", () => {
    const date = new Date("2026-09-02T03:00:00.000Z");
    const normal = selectDailyVisualKy({ date });
    const fallback = selectDailyVisualKy({
      date,
      weatherSignal: "wind",
      weatherDataAvailable: false,
    });
    expect(fallback.weatherFallback).toBe(true);
    expect(fallback.selectionMode).toBe("calendar-seasonal");
    expect(fallback.scenario.id).toBe(normal.scenario.id);
  });

  it("can accept a coarse weather signal without changing the URL or storing a user ID", () => {
    const selection = selectDailyVisualKy({
      date: new Date("2026-08-22T03:00:00.000Z"),
      weatherSignal: "wind",
      weatherDataAvailable: true,
    });
    expect(selection.selectionMode).toBe("weather-assisted");
    expect(selection.dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(selection).not.toHaveProperty("userId");
    expect(selection).not.toHaveProperty("url");
  });
});
