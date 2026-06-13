import { describe, expect, it } from "vitest";
import type { AllIndustriesSummary } from "@/lib/accident-analysis";
import {
  REPORTS_CSV_FILENAME,
  industriesSummaryToCsv,
  industriesSummaryToText,
} from "./accidents-reports-export";

const SUMMARY: AllIndustriesSummary = {
  totalCombined: 5200,
  totalCurated: 300,
  yearRange: { min: 2019, max: 2024 },
  industries: [
    {
      slug: "construction",
      label: "建設業",
      icon: "🏗",
      tagline: "",
      colorClass: "",
      total: 1800,
      fatal: 240,
      topType: "墜落・転落",
      topTypes: ["墜落・転落"],
      peakMonths: [6, 7, 8],
    },
    {
      slug: "manufacturing",
      label: "製造業",
      icon: "🏭",
      tagline: "",
      colorClass: "",
      total: 1200,
      fatal: 90,
      topType: null,
      topTypes: [],
      peakMonths: [],
    },
  ],
};

describe("industriesSummaryToCsv", () => {
  it("各業種の事例数・死亡数・最多事故型をそのまま出力する", () => {
    const csv = industriesSummaryToCsv(SUMMARY);
    expect(csv).toContain("建設業,1800,240,墜落・転落");
    expect(csv).toContain("製造業,1200,90,—");
  });

  it("見出しに収録期間を含む", () => {
    expect(industriesSummaryToCsv(SUMMARY)).toContain("（2019〜2024年・累計）");
  });

  it("ファイル名は .csv 拡張子", () => {
    expect(REPORTS_CSV_FILENAME.endsWith(".csv")).toBe(true);
  });
});

describe("industriesSummaryToText", () => {
  it("累計件数と業種ごとの内訳を含む", () => {
    const text = industriesSummaryToText(SUMMARY);
    expect(text).toContain("累計 5,200件");
    expect(text).toContain("・建設業：1,800件（うち死亡240人）最多事故型「墜落・転落」");
    expect(text).toContain("最多事故型「—」");
  });
});
