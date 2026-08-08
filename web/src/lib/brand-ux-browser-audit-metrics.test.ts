import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "scripts/audit/brand-ux-browser-audit.mjs"),
  "utf8",
);
const darkContrastSource = readFileSync(
  resolve(process.cwd(), "scripts/audit/brand-ux-dark-contrast-audit.mjs"),
  "utf8",
);

describe("brand UX browser audit measurement contract", () => {
  it("counts visible semantic content without counting the fixed mobile nav", () => {
    expect(source).toContain("main [data-content-density-text]");
    expect(source).toContain('!element.closest("[data-mobile-nav]")');
    expect(source).toContain('details:not([open])');
  });

  it("requires horizontal and vertical viewport intersection", () => {
    expect(source).toContain("rect.bottom > 0");
    expect(source).toContain("rect.top < viewport.height");
    expect(source).toContain("rect.right > 0");
    expect(source).toContain("rect.left < viewport.width");
  });

  it("uses browser-zoom-equivalent reflow widths for 200 and 400 percent", () => {
    expect(source).toContain("for (const scale of [2, 4])");
    expect(source).toContain("width: Math.round(1280 / scale)");
    expect(source).toContain('name: `${scale * 100}-percent`');
    expect(source).toContain('method: "1280px-browser-zoom-reflow-equivalent"');
  });

  it("audits every target route in the real system-dark theme", () => {
    expect(darkContrastSource).toContain('colorScheme: "dark"');
    expect(darkContrastSource).toContain(
      '{ name: "mobile", width: 390, height: 844 }',
    );
    expect(darkContrastSource).toContain(
      '{ name: "desktop", width: 1440, height: 900 }',
    );
    expect(darkContrastSource).toContain('localStorage.removeItem("anzen-theme")');
    expect(darkContrastSource).toContain(
      'values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]',
    );
    expect(darkContrastSource).toContain("contrastNodeCount");
    expect(darkContrastSource).toContain('["/brand-ux-not-found-probe", 404]');
  });
});
