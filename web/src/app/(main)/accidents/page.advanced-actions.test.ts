import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  resolve(process.cwd(), "src/app/(main)/accidents/page.tsx"),
  "utf8",
);
const homeScreenSource = readFileSync(
  resolve(process.cwd(), "src/components/home-screen.tsx"),
  "utf8",
);

describe("/accidents auxiliary actions", () => {
  it("JavaScript無効時の実件数・公式事例をnoscript内へ統合する", () => {
    const noScriptStart = pageSource.indexOf("<noscript>");
    const fallback = pageSource.indexOf("<AccidentsNoScriptFallback", noScriptStart);
    const noScriptEnd = pageSource.indexOf("</noscript>", fallback);

    expect(noScriptStart).toBeGreaterThanOrEqual(0);
    expect(fallback).toBeGreaterThan(noScriptStart);
    expect(noScriptEnd).toBeGreaterThan(fallback);
  });

  it("通常表示では事故DBを先に置き、報道・プロファイル・集計を閉じた詳細へ移す", () => {
    const results = homeScreenSource.indexOf("data-accident-results-first");
    const database = homeScreenSource.indexOf("<AccidentDatabasePanel", results);
    const supporting = homeScreenSource.indexOf("data-accidents-supporting-info", database);
    const extras = homeScreenSource.indexOf("<AccidentExtrasPanel", supporting);
    const supplement = homeScreenSource.indexOf("{accidentSupplement}", supporting);
    const supportingTag = homeScreenSource.slice(
      homeScreenSource.lastIndexOf("<details", supporting),
      supporting,
    );

    expect(results).toBeGreaterThanOrEqual(0);
    expect(homeScreenSource).toContain("data-accidents-client-only");
    expect(database).toBeGreaterThan(results);
    expect(supporting).toBeGreaterThan(database);
    expect(extras).toBeGreaterThan(supporting);
    expect(supplement).toBeGreaterThan(extras);
    expect(supportingTag).not.toMatch(/\sopen(?:\s|>)/);
    expect(pageSource).toContain("accidentSupplement={<NewsFeedSection />}");
  });

  it("出力などの高度な操作は会話型検索領域の後ろにある閉じた詳細へ集約する", () => {
    const homeScreenEnd = pageSource.indexOf("</HomeScreen>");
    const details = pageSource.indexOf("data-accidents-advanced-actions");
    const exports = pageSource.indexOf("<DataExportToolbar", details);

    expect(homeScreenEnd).toBeGreaterThanOrEqual(0);
    expect(details).toBeGreaterThan(homeScreenEnd);
    expect(exports).toBeGreaterThan(details);
    expect(pageSource).toContain("詳しい検索・出力");
  });
});
