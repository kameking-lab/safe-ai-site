import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const collectTsxFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTsxFiles(path);
    return entry.isFile() && entry.name.endsWith(".tsx") ? [path] : [];
  });

describe("main landmark ownership", () => {
  it("keeps the sole main landmark in AppShell", () => {
    const shell = readFileSync(join(process.cwd(), "src", "components", "app-shell.tsx"), "utf8");
    expect(shell.match(/<main\b/g)).toHaveLength(1);
    expect(shell.match(/<\/main>/g)).toHaveLength(1);
  });

  it("does not nest a second main element anywhere in the (main) route group", () => {
    const routeGroup = join(process.cwd(), "src", "app", "(main)");
    const offenders = collectTsxFiles(routeGroup)
      .filter((path) => /<\/?main\b/u.test(readFileSync(path, "utf8")))
      .map((path) => path.slice(process.cwd().length + 1));

    expect(offenders).toEqual([]);
  });
});
