import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, normalize, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const PROJECT_ROOT = process.cwd();
const SRC_ROOT = join(PROJECT_ROOT, "src");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolute);
    if (!/\.tsx?$/.test(entry.name) || /\.(test|spec)\.tsx?$/.test(entry.name)) {
      return [];
    }
    return [normalize(absolute)];
  });
}

function resolveLocalImport(
  fromFile: string,
  specifier: string,
  knownFiles: ReadonlySet<string>,
): string | null {
  const base = specifier.startsWith("@/")
    ? join(SRC_ROOT, specifier.slice(2))
    : specifier.startsWith(".")
      ? resolve(dirname(fromFile), specifier)
      : null;
  if (!base) return null;
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ]) {
    const normalized = normalize(candidate);
    if (knownFiles.has(normalized)) return normalized;
  }
  return null;
}

function reachableRouteSources(files: readonly string[]): Set<string> {
  const knownFiles = new Set(files);
  const dependencies = new Map<string, Set<string>>();
  for (const file of files) {
    const imports = ts.preProcessFile(
      readFileSync(file, "utf8"),
      true,
      true,
    ).importedFiles;
    dependencies.set(
      file,
      new Set(
        imports.flatMap(({ fileName }) => {
          const resolved = resolveLocalImport(file, fileName, knownFiles);
          return resolved ? [resolved] : [];
        }),
      ),
    );
  }

  const roots = files.filter((file) => {
    const sourcePath = relative(SRC_ROOT, file).replaceAll("\\", "/");
    return (
      sourcePath.startsWith("app/") ||
      [
        "proxy.ts",
        "middleware.ts",
        "instrumentation.ts",
        "instrumentation-client.ts",
      ].includes(sourcePath)
    );
  });
  const reachable = new Set<string>();
  const pending = [...roots];
  while (pending.length > 0) {
    const file = pending.pop();
    if (!file || reachable.has(file)) continue;
    reachable.add(file);
    for (const dependency of dependencies.get(file) ?? []) {
      pending.push(dependency);
    }
  }
  return reachable;
}

describe("Tailwind route source exclusions", () => {
  it("excludes only existing components unreachable from every shipped route", () => {
    const files = sourceFiles(SRC_ROOT);
    const reachable = reachableRouteSources(files);
    const manifest = readFileSync(
      join(SRC_ROOT, "app", "tailwind-route-source-exclusions.css"),
      "utf8",
    );
    const excluded = Array.from(
      manifest.matchAll(/@source not "\.\.\/(components\/[^"\n]+)";/g),
      (match) => match[1],
    );

    expect(excluded.length).toBeGreaterThanOrEqual(90);
    expect(new Set(excluded).size).toBe(excluded.length);
    const missing = excluded.filter(
      (sourcePath) => !statSync(join(SRC_ROOT, sourcePath), { throwIfNoEntry: false }),
    );
    expect(missing, `削除済みsourceを除外表から除いてください: ${missing.join(", ")}`).toEqual(
      [],
    );
    const reachableExcluded = excluded.filter((sourcePath) =>
      reachable.has(normalize(join(SRC_ROOT, sourcePath))),
    );
    expect(
      reachableExcluded,
      `routeから到達するsourceは除外できません: ${reachableExcluded.join(", ")}`,
    ).toEqual([]);
  });

  it("keeps admin utilities in their protected route layouts", () => {
    const globals = readFileSync(join(SRC_ROOT, "app", "globals.css"), "utf8");
    expect(globals).toContain('@source not "../app/admin";');
    expect(globals).toContain('@source not "../app/(main)/admin";');

    for (const directory of [
      join(SRC_ROOT, "app", "admin"),
      join(SRC_ROOT, "app", "(main)", "admin"),
    ]) {
      const layout = readFileSync(join(directory, "layout.tsx"), "utf8");
      const css = readFileSync(join(directory, "admin.css"), "utf8");
      expect(layout).toContain('import "./admin.css";');
      expect(css).toContain('@source "./";');
      expect(css).toContain('@reference "tailwindcss/theme.css";');
      expect(css).toContain("@custom-variant dark");
    }
  });
});
