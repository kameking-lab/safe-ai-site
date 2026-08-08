import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const script = readFileSync(
  resolve(process.cwd(), "scripts/audit/search-console-production-operations.mjs"),
  "utf8",
);

describe("Search Console production operations targets", () => {
  it("targets only the canonical production origin", () => {
    expect(script).toContain(
      'const PRODUCTION_ORIGIN = "https://www.anzen-ai-portal.jp";',
    );
    expect(script).toContain("non-production target rejected");
    expect(script).not.toMatch(/vercel\.app/);
  });

  it.each([
    "/",
    "/safety-ai",
    "/services/automation",
    "/chemical-ra",
    "/guides/chemical-ra-create-simple",
    "/ky/paper",
    "/guides/ky-sheet",
    "/guides/safety-signage",
    "/guides/anzeneho-ai-chatbot",
    "/law-search",
    "/accident-news",
  ])("keeps %s in the priority inspection list", (pathname) => {
    const priorityBlock = script.match(
      /const PRIORITY_PATHS = \[([\s\S]*?)\];/,
    )?.[1];

    expect(priorityBlock).toContain(JSON.stringify(pathname));
  });

  it.each([
    "/heat-illness-prevention",
    "/heat-illness-prevention/slides",
    "/heat-illness-prevention/elearning",
  ])("keeps %s in the explicit inspection hold list", (pathname) => {
    const holdBlock = script.match(/const HOLD_PATHS = \[([\s\S]*?)\];/)?.[1];

    expect(holdBlock).toContain(JSON.stringify(pathname));
  });

  it("never submits held heat URLs for inspection", () => {
    expect(script).toContain("heat hold URL inspection boundary violated");
    expect(script).toContain(
      "(path) => `HOLD,${productionUrl(path)},do-not-inspect,true`",
    );
    expect(script).toContain("inspectedHeatUrls: 0");
  });
});
