import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { GEMINI_FLASH_MODEL } from "@/lib/gemini-model";

const RUNTIME_ROOTS = [
  join(process.cwd(), "src/app/api"),
  join(process.cwd(), "src/lib"),
  join(process.cwd(), "scripts"),
];
const SOURCE_EXTENSION = /\.(?:[cm]?[jt]s|tsx)$/u;
const GENERATION_CALL =
  /new\s+GoogleGenAI\s*\(|generativelanguage\.googleapis\.com\/[^\n]+:generateContent/u;
const DEPRECATED_CONFIG =
  /["']?(?:temperature|topP|topK|top_p|top_k|candidateCount|candidate_count|thinkingBudget|thinking_budget)["']?\s*:/u;

function runtimeSourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return runtimeSourceFiles(path);
    if (!SOURCE_EXTENSION.test(entry.name)) return [];
    if (/\.(?:test|spec)\.(?:[cm]?[jt]s|tsx)$/u.test(entry.name)) return [];
    return [path];
  });
}

const runtimeFiles = RUNTIME_ROOTS.flatMap(runtimeSourceFiles);
const relativePath = (path: string) =>
  relative(process.cwd(), path).replaceAll("\\", "/");
const generationCallSites = runtimeFiles.filter((path) =>
  GENERATION_CALL.test(readFileSync(path, "utf8")),
);

describe("Gemini production model policy", () => {
  it("pins the latest GA Flash model instead of a hot-swapped alias", () => {
    expect(GEMINI_FLASH_MODEL).toBe("gemini-3.6-flash");
    expect(GEMINI_FLASH_MODEL).not.toContain("latest");
    expect(GEMINI_FLASH_MODEL).not.toContain("preview");
  });

  it("uses only the maintained Google Gen AI SDK", () => {
    const packageSource = readFileSync(join(process.cwd(), "package.json"), "utf8");
    expect(packageSource).toContain('"@google/genai"');
    expect(packageSource).not.toContain('"@google/generative-ai"');

    const legacyReferences = runtimeFiles.flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return /@google\/generative-ai|GoogleGenerativeAI|getGenerativeModel/u.test(
        source,
      )
        ? [relativePath(path)]
        : [];
    });
    expect(legacyReferences).toEqual([]);
  });

  it("routes every active generation call through the shared model constant", () => {
    expect(generationCallSites.map(relativePath).sort()).toEqual(
      [
        "src/app/api/chatbot/route.ts",
        "src/app/api/chatbot/stream/route.ts",
        "src/app/api/construction-calc/route.ts",
        "src/lib/ky/gemini-suggest.ts",
      ].sort(),
    );
    for (const path of generationCallSites) {
      const source = readFileSync(path, "utf8");
      expect(source, relativePath(path)).toContain("GEMINI_FLASH_MODEL");
      expect(source, relativePath(path)).not.toMatch(
        /\bgemini-[0-9][a-z0-9.-]*/u,
      );
      expect(source, relativePath(path)).not.toContain("gemini-flash-latest");
    }
  });

  it("does not send parameters removed by Gemini 3.6 Flash", () => {
    const failures = generationCallSites.flatMap((path) =>
      DEPRECATED_CONFIG.test(readFileSync(path, "utf8"))
        ? [relativePath(path)]
        : [],
    );
    expect(failures).toEqual([]);
  });

  it("never sends a prefilled model turn", () => {
    const failures = generationCallSites.flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return /role\s*:\s*["']model["']/u.test(source)
        ? [relativePath(path)]
        : [];
    });
    expect(failures).toEqual([]);
  });

  it("keeps raw REST credentials out of URLs and probes the pinned model", () => {
    const rawHttpFiles = runtimeFiles.filter((path) =>
      readFileSync(path, "utf8").includes("generativelanguage.googleapis.com"),
    );
    expect(rawHttpFiles.map(relativePath).sort()).toEqual(
      [
        "src/app/api/construction-calc/route.ts",
        "src/lib/external/health.ts",
      ].sort(),
    );
    for (const path of rawHttpFiles) {
      const source = readFileSync(path, "utf8");
      expect(source, relativePath(path)).toContain("x-goog-api-key");
      expect(source, relativePath(path)).not.toMatch(/[?&]key=/u);
      expect(source, relativePath(path)).toContain("GEMINI_FLASH_MODEL");
    }
  });
});
