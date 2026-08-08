import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("paper-stage print isolation", () => {
  it("hides the interactive canvas so the formal print sheet is not duplicated", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "components", "ky-paper", "paper-stage.tsx"),
      "utf8",
    );
    expect(source).toContain("bg-slate-200 print:hidden");
  });

  it("removes viewport minimum heights that otherwise create a blank second page", () => {
    const css = readFileSync(
      join(process.cwd(), "public", "print.css"),
      "utf8",
    );
    const printRules = css.slice(css.indexOf("@media print"));
    expect(printRules).toMatch(/\.min-h-full,\s*\.min-h-screen\s*\{[\s\S]*?min-height:\s*0\s*!important/);
  });

  it("loads print rules only for print media", () => {
    const layout = readFileSync(
      join(process.cwd(), "src", "app", "layout.tsx"),
      "utf8",
    );
    expect(layout).toContain(
      '<link rel="stylesheet" href="/print.css" media="print" />',
    );
  });

  it("limits generated utilities to application sources", () => {
    const css = readFileSync(
      join(process.cwd(), "src", "app", "globals.css"),
      "utf8",
    );
    expect(css).toContain('@import "tailwindcss" source(none);');
    expect(css).toContain('@source "../";');
    expect(css).toContain('@source not "../**/*.test.*";');
    expect(css).toContain('@source not "../**/*.spec.*";');
    expect(css).toContain(
      '@import "./tailwind-route-source-exclusions.css";',
    );
    const exclusions = readFileSync(
      join(process.cwd(), "src", "app", "tailwind-route-source-exclusions.css"),
      "utf8",
    );
    expect(exclusions).toContain(
      '@source not "../components/home-safety-cockpit/home-effect-first-client.tsx";',
    );
    expect(exclusions).toContain(
      '@source not "../components/home-safety-cockpit/home-safety-cockpit-client.tsx";',
    );
    expect(exclusions).toContain(
      '@source not "../components/ky-paper/ky-paper-view.tsx";',
    );
    expect(css).not.toContain("@media print");

    const homePage = readFileSync(
      join(process.cwd(), "src", "app", "(main)", "page.tsx"),
      "utf8",
    );
    const kyPage = readFileSync(
      join(process.cwd(), "src", "app", "(main)", "ky", "paper", "page.tsx"),
      "utf8",
    );
    expect(homePage).not.toMatch(
      /home-effect-first-client|home-safety-cockpit-client/,
    );
    expect(kyPage).not.toContain("ky-paper-view");
  });
});
