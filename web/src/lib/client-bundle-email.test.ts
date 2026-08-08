import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";

const SOURCE_ROOT = resolve(process.cwd(), "src");
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"] as const;
const EMAIL_PATTERN =
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu;

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = resolve(directory, name);
    const stats = statSync(path);
    if (stats.isDirectory()) return listSourceFiles(path);
    if (!SOURCE_EXTENSIONS.includes(extname(path) as (typeof SOURCE_EXTENSIONS)[number])) {
      return [];
    }
    if (/\.(?:test|spec)\.[jt]sx?$/.test(path)) return [];
    return [path];
  });
}

function resolveSourceImport(from: string, specifier: string): string | null {
  if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return null;
  const base = specifier.startsWith("@/")
    ? resolve(SOURCE_ROOT, specifier.slice(2))
    : resolve(dirname(from), specifier);
  const candidates = [
    base,
    ...SOURCE_EXTENSIONS.map((extension) => `${base}${extension}`),
    ...SOURCE_EXTENSIONS.map((extension) => resolve(base, `index${extension}`)),
  ];
  return candidates.find((candidate) => {
    try {
      return statSync(candidate).isFile();
    } catch {
      return false;
    }
  }) ?? null;
}

describe("client bundle email privacy boundary", () => {
  it("does not place an email-address literal in a client root or its source imports", () => {
    const files = listSourceFiles(SOURCE_ROOT);
    const textByFile = new Map(
      files.map((file) => [file, readFileSync(file, "utf8")]),
    );
    const queue = files.filter((file) =>
      /^\s*["']use client["'];/u.test(textByFile.get(file) ?? ""),
    );
    const clientGraph = new Set<string>();

    while (queue.length > 0) {
      const file = queue.shift();
      if (!file || clientGraph.has(file)) continue;
      clientGraph.add(file);
      const source = textByFile.get(file) ?? "";
      const runtimeImportsOnly = source
        .replace(/import\s+type[\s\S]*?;\s*/gu, "")
        .replace(/export\s+type[\s\S]*?;\s*/gu, "");
      for (const match of runtimeImportsOnly.matchAll(
        /(?:from\s*|import\s*\()\s*["']([^"']+)["']/gu,
      )) {
        const imported = resolveSourceImport(file, match[1] ?? "");
        if (imported && !clientGraph.has(imported)) queue.push(imported);
      }
    }

    const findings = [...clientGraph].flatMap((file) => {
      const source = textByFile.get(file) ?? "";
      return source.split(/\r?\n/u).flatMap((line, index) =>
        EMAIL_PATTERN.test(line)
          ? [
              {
                file: relative(process.cwd(), file).replaceAll("\\", "/"),
                line: index + 1,
              },
            ]
          : [],
      );
    });

    expect(
      findings,
      `クライアント到達ソースにメールアドレス文字列があります: ${JSON.stringify(findings)}`,
    ).toEqual([]);
  });
});
