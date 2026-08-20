import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getAppShellNavigationCategories } from "@/components/app-shell-navigation";

const SMOKE_SOURCE = readFileSync(
  join(
    process.cwd(),
    "scripts",
    "audit",
    "japan-leading-production-smoke.mjs",
  ),
  "utf8",
);

function smokeCompactNavigationPaths(): string[] {
  const literal = SMOKE_SOURCE.match(
    /const compactNavigationPaths = \[([\s\S]*?)\n\];/,
  )?.[1];
  expect(literal, "production smokeのcompact nav契約が見つからない").toBeDefined();
  return [...(literal ?? "").matchAll(/"([^"\n]+)"/g)].map(
    (match) => match[1],
  );
}

describe("japan-leading production smoke IA contract", () => {
  it("現行compact navの厳密16リンクだけをホーム1クリック契約にする", () => {
    const smokePaths = smokeCompactNavigationPaths();
    const currentCompactPaths = getAppShellNavigationCategories("desktop").flatMap(
      (category) => category.items.map((item) => item.href),
    );

    expect(smokePaths).toHaveLength(16);
    expect(new Set(smokePaths).size).toBe(16);
    expect(smokePaths).toEqual(currentCompactPaths);
    expect(smokePaths).not.toContain("/resources");
    expect(SMOKE_SOURCE).not.toContain("flagshipPaths");
  });

  it("/resourcesは機能一覧経由・route・sitemapの別契約で保持する", () => {
    expect(SMOKE_SOURCE).toMatch(
      /const resourceDiscoveryResults = await Promise\.all\(\s*\["\/features"\]/,
    );
    expect(SMOKE_SOURCE).toContain(
      '"resources:discoverable-from-site-navigation"',
    );
    expect(SMOKE_SOURCE).toContain('"sitemap:resources-present"');
    expect(SMOKE_SOURCE).toMatch(
      /const publicRoutes = \[[\s\S]*?"\/resources",[\s\S]*?\];/,
    );
  });
});
