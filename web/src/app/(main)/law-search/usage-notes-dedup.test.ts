import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("/law-search 注意事項の重複防止", () => {
  it("機能内には小さな注意事項リンクを1件だけ置く", () => {
    const page = source("src/app/(main)/law-search/page.tsx");
    const panel = source("src/components/law-search-panel.tsx");
    const footer = source("src/components/footer.tsx");

    expect(page.match(/\/about\/usage-notes/g)).toHaveLength(1);
    expect(panel).not.toContain("UsageNotesLink");
    expect(footer).toContain("/about/usage-notes");
  });
});
