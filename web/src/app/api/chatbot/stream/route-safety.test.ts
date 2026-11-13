import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "src", "app", "api", "chatbot", "stream", "route.ts"),
  "utf8",
);

describe("chatbot stream verification boundary", () => {
  it("marks provider chunks as provisional and withholds source metadata until validation", () => {
    const providerLoop = source.slice(
      source.indexOf("for await (const chunkResponse"),
      source.indexOf("// Phase 2 Layer 2"),
    );
    expect(providerLoop).toContain('send("text", { chunk: chunkText, provisional: true })');
    expect(providerLoop).not.toContain('send("meta"');
  });

  it("never emits a generated claim solely because citation numbers pass", () => {
    expect(source).toContain("buildServiceFirstLegalAnswer");
    expect(source).toContain('citationLayer2Status = "evidence-only"');
    expect(source).toContain('citationLayer2Status === "evidence-only"');
    expect(source).not.toContain('citationLayer2Status = "passed"');
  });

  it("propagates cancellation into provider iteration", () => {
    expect(source).toContain("request.signal.aborted");
    expect(source).toContain("cancelled = true");
  });
});
