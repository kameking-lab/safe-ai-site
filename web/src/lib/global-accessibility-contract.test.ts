import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("global accessibility CSS contract", () => {
  const css = readFileSync(
    resolve(process.cwd(), "src/app/globals.css"),
    "utf8",
  );

  it("supports reduced motion and Windows forced colors", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("@media (forced-colors: active)");
    expect(css).toContain("outline: 4px solid Highlight");
    expect(css).toContain("text-decoration: underline");
  });

  it("provides a global keyboard focus fallback", () => {
    expect(css).toContain("):focus-visible");
    expect(css).toContain("outline: 3px solid #047857");
    expect(css).toContain("outline-offset: 3px");
  });

  it("does not hide horizontal overflow from zoomed page content", () => {
    expect(css).not.toMatch(/overflow-x:\s*hidden/);
    expect(css).toContain("pre {");
    expect(css).toContain("overflow-x: auto");
  });
});
