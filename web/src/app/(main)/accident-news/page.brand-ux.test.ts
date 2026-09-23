import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/app/(main)/accident-news/page.tsx"),
  "utf8",
);
const fatalSource = readFileSync(
  resolve(process.cwd(), "src/app/(main)/fatal-accidents/page.tsx"),
  "utf8",
);
const filterSource = readFileSync(
  resolve(process.cwd(), "src/app/(main)/fatal-accidents/fatal-accidents-filter.tsx"),
  "utf8",
);
const browserSource = readFileSync(
  resolve(process.cwd(), "src/app/(main)/fatal-accidents/fatal-accidents-browser.tsx"),
  "utf8",
);

describe("事故速報と死亡事故データベースの役割分離", () => {
  it("/accident-news は報道ベース速報をserver renderし、媒体と確認状態を表示する", () => {
    expect(source).toContain("buildLegacyFatalAccidentsRedirect(await searchParams)");
    expect(source).toContain("permanentRedirect(legacyRedirect)");
    expect(source).toContain("await loadHomeLatestAccidentNews()");
    expect(source).toContain("国内の死亡事故速報");
    expect(source).toContain("report.publishedAt");
    expect(source).toContain("report.publisher");
    expect(source).toContain("報道・内容未確認");
    expect(source).toContain('href="/fatal-accidents"');
    expect(source).not.toContain("SERIOUS_CASES_META");
  });

  it("/fatal-accidents は死亡災害検索をserver HTMLで返す", () => {
    expect(fatalSource).toContain("const resolvedSearchParams = await searchParams");
    expect(fatalSource).toContain("<Suspense fallback={<FatalAccidentsResultsFallback />}>");
    expect(fatalSource).toContain("await FatalAccidentResults({");
    expect(fatalSource).toContain("死亡事故データベース");
    expect(fatalSource).toContain("<FatalAccidentsBrowser");
    expect(browserSource).toContain("<FatalAccidentsFilter");
    expect(filterSource).toContain('data-primary-action="true"');
    expect(filterSource).toContain('action="/fatal-accidents"');
    expect(filterSource).toContain('name="industry"');
    expect(filterSource).toContain('name="type"');
    expect(filterSource).toContain('name="year"');
    expect(filterSource).toContain("<noscript>");
    expect(filterSource).not.toContain('params.set("q"');
    expect(fatalSource).not.toContain("<TaskPageIntro");
  });

  it("公式データと集約した注意事項だけを短く案内する", () => {
    expect(fatalSource).toContain("SERIOUS_CASES_META.sourceUrl");
    expect(fatalSource).toContain("<UsageNotesLink");
    expect(fatalSource).not.toContain("公式検索への自動引継ぎ: 停止中");
    expect(fatalSource).not.toContain("出典・公式データ・取り扱い");
  });
});
