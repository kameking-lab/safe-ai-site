import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("/law-search streaming layout", () => {
  it("通常表示をページ全体のSuspense fallbackへ置き換えない", () => {
    const page = source("src/app/(main)/law-search/page.tsx");

    expect(page).not.toContain('import { Suspense } from "react"');
    expect(page).not.toContain("<Suspense");
    expect(page).not.toContain('aria-label="法令収録条文検索を読み込み中"');
    expect(page).not.toContain("min-h-[70vh]");
    expect(page).toMatch(
      /<div id="law-search-js">\s*<LawSearchPanel[\s\S]*?\/>\s*<\/div>/u,
    );
  });

  it("重い条文コーパスは空検索の初期描画では読み込まない", () => {
    const panel = source("src/components/law-search-panel.tsx");

    expect(panel).toContain("const shouldLoadCorpus = Boolean(");
    expect(panel).toMatch(
      /\{shouldLoadCorpus \? \(\s*<LawSearchResults[\s\S]*?\) : \(\s*<div[\s\S]*?data-law-search-idle/u,
    );
  });
});
