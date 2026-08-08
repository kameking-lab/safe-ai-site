import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/app/(main)/accident-news/page.tsx"),
  "utf8",
);
const filterSource = readFileSync(
  resolve(process.cwd(), "src/app/(main)/accident-news/accident-news-filter.tsx"),
  "utf8",
);
const browserSource = readFileSync(
  resolve(process.cwd(), "src/app/(main)/accident-news/accident-news-browser.tsx"),
  "utf8",
);

describe("/accident-news brand and no-JavaScript entry", () => {
  it("通常表示は検索結果までserver HTMLで返し、計測用streamだけ境界を使う", () => {
    const shellStart = source.indexOf("export default async function AccidentNewsPage");
    const headerStart = source.indexOf("<header", shellStart);
    const resultsStart = source.indexOf("async function AccidentNewsResults");

    expect(shellStart).toBeGreaterThanOrEqual(0);
    expect(source).toContain("const resolvedSearchParams = await searchParams");
    expect(headerStart).toBeGreaterThan(shellStart);
    expect(resultsStart).toBeGreaterThan(headerStart);
    expect(source).toContain("<Suspense fallback={<AccidentNewsResultsFallback />}>");
    expect(source).toContain("await AccidentNewsResults({");
    expect(source).toContain(">重大災害事例を検索</h1>");
    expect(source).toContain("<AccidentNewsBrowser");
    expect(browserSource).toContain("<AccidentNewsFilter");
    expect(filterSource).toContain('data-primary-action="true"');
    expect(filterSource).toContain('action="/accident-news"');
    expect(filterSource).toContain('name="industry"');
    expect(filterSource).toContain('name="type"');
    expect(filterSource).toContain('name="year"');
    expect(filterSource).toContain("<noscript>");
    expect(filterSource).not.toContain('params.set("q"');
    expect(source).not.toContain("<TaskPageIntro");
  });

  it("公式データと集約した注意事項だけを短く案内する", () => {
    expect(source).toContain("SERIOUS_CASES_META.sourceUrl");
    expect(source).toContain("<UsageNotesLink");
    expect(source).not.toContain("公式検索への自動引継ぎ: 停止中");
    expect(source).not.toContain("出典・公式データ・取り扱い");
  });
});
