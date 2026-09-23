import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("事故分析ダッシュボードの公開表示", () => {
  it("リード直後に全国速報と収録個票の期間・母数を区別して表示する", () => {
    const source = readSource("src/app/(main)/accidents-analytics/page.tsx");
    const leadIndex = source.indexOf(
      "最新の全国傾向と収録済み死亡災害個票を分け",
    );
    const cautionIndex = source.indexOf("data-analytics-scope-caution");
    const dashboardIndex = source.indexOf("<AnalyticsDashboard");

    expect(leadIndex).toBeGreaterThan(-1);
    expect(cautionIndex).toBeGreaterThan(leadIndex);
    expect(cautionIndex).toBeLessThan(dashboardIndex);
    expect(source).toContain("発生対象 {official.occurredThrough} まで");
    expect(source).toContain("報告締切 {official.reportAsOf}");
    expect(source).toContain("割合の母数は分析項目の値が確認できる件数");
    expect(source).toContain("欠損値を除きます");
    expect(source).toContain("発生率やリスクの高さを示すものではありません");
  });

  it("事故分析への残存導線を現行の名称と12種類表記に統一する", () => {
    const sources = [
      "src/components/accidents-meta-info.tsx",
      "src/components/accidents-reports/industry-report-view.tsx",
      "src/app/(main)/accidents-reports/page.tsx",
      "src/data/seo/keyword-landing.ts",
    ].map(readSource);
    const combined = sources.join("\n");

    expect(combined).not.toContain("事故統計ダッシュボード");
    expect(combined).not.toMatch(/25\s*(?:軸|種類)/u);
    expect(combined).toContain("事故分析ダッシュボード");
    expect(combined).toContain("12種類");
  });

  it("母集団の総件数と現在の絞り込み件数を別の値で表示する", () => {
    const source = readSource(
      "src/app/(main)/accidents-analytics/AnalyticsDashboardImpl.tsx",
    );

    expect(source).toContain(
      "formatNumber(aggregates.meta.datasetCases)",
    );
    expect(source).toContain(
      "formatNumber(aggregates.meta.filteredCases)",
    );
    expect(source).toContain(
      "SOURCE_LABELS[aggregates.meta.filters.source]",
    );
    expect(source).not.toContain(
      "<strong>既定の母集団</strong>は厚労省死亡災害個票",
    );
    expect(source).not.toContain(
      "数値は\n              <Link href=\"/accidents\"",
    );
  });

  it("速報と収録事例を分離し、図をフィルタ直後に置いて履歴復元を可能にする", () => {
    const page = readSource("src/app/(main)/accidents-analytics/page.tsx");
    const dashboard = readSource(
      "src/app/(main)/accidents-analytics/AnalyticsDashboardImpl.tsx",
    );

    expect(page).toContain('firstParam(params.view) === "flash"');
    expect(page).toContain("収録事例の2019〜2024年系列には接続していません");
    expect(dashboard.indexOf("<RiskVisualSummary")).toBeLessThan(
      dashboard.indexOf('title="サマリーKPI"'),
    );
    expect(dashboard).toContain("router.push(");
    expect(dashboard).not.toContain("収録事例中の死亡災害比率");
    expect(dashboard).toContain("事故型条件だけを除いた事例");
  });
});
