import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE_ROOT = join(process.cwd(), "src");
const DIRECT_SCRIPT_ALLOWLIST = new Set([
  "app/layout.tsx",
  "components/json-ld-client.tsx",
]);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (!entry.name.endsWith(".tsx") || entry.name.includes(".test.")) return [];
    return [path];
  });
}

describe("inline script inventory", () => {
  it("keeps every direct script element inside a nonce-aware boundary", () => {
    const directScriptFiles = sourceFiles(SOURCE_ROOT)
      .filter((path) => /<script(?:\s|>)/.test(readFileSync(path, "utf8")))
      .map((path) => relative(SOURCE_ROOT, path).replaceAll("\\", "/"))
      .sort();

    expect(directScriptFiles).toEqual([...DIRECT_SCRIPT_ALLOWLIST].sort());
    expect(directScriptFiles).toHaveLength(2);
  });

  it("does not reintroduce a static CSP that competes with Proxy", () => {
    const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
    expect(config).not.toContain('key: "Content-Security-Policy"');
    expect(config).not.toContain("script-src 'self' 'unsafe-inline'");
  });
});
