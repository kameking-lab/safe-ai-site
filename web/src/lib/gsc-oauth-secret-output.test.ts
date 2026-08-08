import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("GSC OAuth初期化の秘密値出力境界", () => {
  it("token値や応答全体を標準出力・標準エラーへ渡さない", () => {
    const source = readFileSync(
      resolve(process.cwd(), "../scripts/etl/gsc-oauth-init.mjs"),
      "utf8",
    );

    expect(source).not.toContain("console.log(tokens.refresh_token)");
    expect(source).not.toContain("console.error(tokens)");
    expect(source).not.toMatch(/console\.(?:log|error)\([^)]*access_token/);
    expect(source).toContain("GSC_OAUTH_OUTPUT_FILE");
    expect(source).toContain("mode: 0o600");
    expect(source).toMatch(/flag:\s*["']wx["']/);
  });
});
