import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("認証ログのPII境界", () => {
  it("永続ユーザーIDとraw例外をconsoleへ渡さない", () => {
    const source = readFileSync(resolve(process.cwd(), "src/auth.ts"), "utf8");
    const consoleCalls = [
      ...source.matchAll(/console\.error\(([\s\S]*?)\);/g),
    ].map((match) => match[1]);

    expect(consoleCalls.length).toBeGreaterThan(0);
    for (const call of consoleCalls) {
      expect(call).not.toContain("user.id");
      expect(call).not.toMatch(/,\s*err\b/);
      expect(call).not.toMatch(/,\s*error\b/);
    }
  });
});
