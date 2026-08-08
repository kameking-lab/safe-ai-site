import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function filesBelow(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(root, entry.name);
    return entry.isDirectory() ? filesBelow(file) : [file];
  });
}

describe("external generative-AI route inventory", () => {
  it("全Route Handlerが共通preflightを通るか旧routeとして410固定される", () => {
    const root = path.resolve(process.cwd(), "src/app/api");
    const modelCall =
      /GoogleGenAI|generativelanguage\.googleapis\.com|generateContent(?:Stream)?\(|generateHazardsWithGemini\(/;
    const violations = filesBelow(root)
      .filter((file) => file.endsWith("route.ts"))
      .filter((file) => modelCall.test(fs.readFileSync(file, "utf8")))
      .filter((file) => {
        const source = fs.readFileSync(file, "utf8");
        const legacyTombstone =
          file.endsWith(path.join("chat", "route.ts")) &&
          source.includes("status: 410");
        return !legacyTombstone && !source.includes("inspectAiOutbound");
      })
      .map((file) => path.relative(root, file));
    expect(violations).toEqual([]);
  });

  it("repository automation scripts and workflows never call a model provider directly", () => {
    const repositoryRoot = path.resolve(process.cwd(), "..");
    const roots = [
      path.join(repositoryRoot, "scripts"),
      path.join(repositoryRoot, ".github", "workflows"),
    ];
    const providerMarker =
      /generativelanguage\.googleapis\.com|@google\/genai|GoogleGenAI|GEMINI_API_KEY|GOOGLE_API_KEY/;
    const violations = roots.flatMap((root) =>
      filesBelow(root)
        .filter((file) => /\.(?:mjs|cjs|js|ts|tsx|ya?ml)$/.test(file))
        .filter((file) => providerMarker.test(fs.readFileSync(file, "utf8")))
        .map((file) => path.relative(repositoryRoot, file)),
    );
    expect(violations).toEqual([]);
  });

  it("active KY generation performs preflight before approved-corpus retrieval and the sole provider helper", () => {
    const route = path.join("ky", "suggest", "route.ts");
    {
      const source = fs.readFileSync(path.join(process.cwd(), "src/app/api", route), "utf8");
      const gate = source.indexOf("const outboundSafety = inspectAiOutbound");
      const retrieval = source.indexOf("suggestVerifiedKyEvidence({");
      const outbound = source.indexOf("generateHazardsWithGemini(");
      expect(gate, route).toBeGreaterThan(0);
      expect(retrieval, route).toBeGreaterThan(gate);
      expect(outbound, route).toBeGreaterThan(gate);
      expect(outbound, route).toBeGreaterThan(retrieval);
      expect(source).toContain('contextPolicy: "approved-server-corpus"');
    }

    const helperPath = path.join(
      process.cwd(),
      "src/lib/ky/gemini-suggest.ts",
    );
    const helper = fs.readFileSync(helperPath, "utf8");
    expect(helper).toMatch(/GoogleGenAI|generateContent\(/);

    const callSites = filesBelow(path.join(process.cwd(), "src"))
      .filter((file) => /\.(?:ts|tsx)$/.test(file))
      .filter((file) => !/\.test\.tsx?$/.test(file))
      .filter((file) => file !== helperPath)
      .filter((file) =>
        fs.readFileSync(file, "utf8").includes("generateHazardsWithGemini("),
      )
      .map((file) => path.relative(process.cwd(), file).replaceAll("\\", "/"));
    expect(callSites).toEqual(["src/app/api/ky/suggest/route.ts"]);
  });

  it("withheld high-risk routes contain no provider and expose a machine-readable fail-closed status", () => {
    const routes = [
      path.join("meeting", "suggest", "route.ts"),
      path.join("chemical", "sds-extract", "route.ts"),
      path.join("goods-chat", "route.ts"),
      path.join("safety-alert", "route.ts"),
      path.join("translate", "article", "route.ts"),
      path.join("quiz-explain", "route.ts"),
      path.join("law-summary", "route.ts"),
      path.join("accidents", "analyze", "route.ts"),
      path.join("accidents", "trend-summary", "route.ts"),
    ];
    for (const route of routes) {
      const source = fs.readFileSync(
        path.join(process.cwd(), "src/app/api", route),
        "utf8",
      );
      expect(source, route).not.toMatch(
        /GoogleGenAI|generativelanguage\.googleapis\.com|generateContent(?:Stream)?\(/,
      );
      expect(source, route).toContain('"X-AI-Used": "false"');
    }
  });
});
