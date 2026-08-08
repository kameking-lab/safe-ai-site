import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("home initial client boundary", () => {
  it("旧cockpit・地域辞書・気象/KY実装を初期home import graphへ戻さない", () => {
    const home = source("src/components/home-safety-cockpit/home-safety-cockpit.tsx");
    expect(home).not.toContain("home-effect-first-client");
    expect(home).not.toContain("home-safety-cockpit-client");
    expect(home).not.toContain("area-heat-status");

    const area = source("src/components/home-safety-cockpit/home-area-picker-client.tsx");
    expect(area).not.toMatch(/import\s+\{[^}]+\}\s+from\s+["']@\/lib\/area\/official-area-resolver/);
    expect(area).not.toMatch(/import\s+\{[^}]+\}\s+from\s+["']@\/lib\/area\/coarse-location/);
    expect(area).toContain('import("@/lib/area/official-area-resolver")');

    const chemical = source("src/components/home-safety-cockpit/home-chemical-quick-search.tsx");
    expect(chemical).not.toMatch(/from\s+["']@\/lib\/chemical\/(?:query-safety|search-client)["']/);
    expect(chemical).toContain('import("@/lib/chemical/query-safety")');
    expect(chemical).toContain('import("@/lib/chemical/search-client")');

    const heat = source("src/components/home-safety-cockpit/home-heat-actions-client.tsx");
    expect(heat).toContain('import("@/lib/ky/weather-prefill-v2")');
    expect(heat).toContain('import("@/lib/ky/handoff")');
  });
});
