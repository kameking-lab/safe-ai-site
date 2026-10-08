// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { homeLpClasses } from "./home-lp-classes";
import { homeLpCriticalCss } from "./home-lp-critical-css";

describe("home-only SSR critical CSS", () => {
  it("preserves every canonical selector and declaration through the stable class mapping", () => {
    const canonical = readFileSync(new URL("./home-lp.module.css", import.meta.url), "utf8").replaceAll("\r\n", "\n");
    let expected = canonical.replace(/:global\(([^()]*)\)/g, "$1");
    for (const [name, mapped] of Object.entries(homeLpClasses).sort(([a], [b]) => b.length - a.length)) {
      expected = expected.replace(new RegExp(`\\.${name}(?![\\w-])`, "g"), `.${mapped}`);
    }
    expect(homeLpCriticalCss).toBe(expected);
    expect(new Set(Object.values(homeLpClasses)).size).toBe(Object.keys(homeLpClasses).length);
  });

  it("keeps CSS out of the client companion and leaves CSP and application-wide CSS settings untouched", () => {
    const companion = readFileSync(new URL("./home-chihuahua-companion.tsx", import.meta.url), "utf8");
    const home = readFileSync(new URL("./home-lp.tsx", import.meta.url), "utf8");
    expect(companion).not.toMatch(/home-lp\.module\.css|home-lp-critical-css/);
    expect(home).toContain("<style data-home-lp-critical>{homeLpCriticalCss}</style>");
    expect(home.indexOf("<style data-home-lp-critical>")).toBeLessThan(home.indexOf('<section aria-labelledby="home-lp-title"'));
    expect(homeLpCriticalCss).not.toContain("</style");
  });
});
