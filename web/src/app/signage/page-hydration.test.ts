import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("production remediation: signage hydration", () => {
  it("PR-P2-SIGNAGE-HYDRATION-01: SSR と初回client描画で同じ時刻seedを使う", () => {
    const source = readFileSync(join(process.cwd(), "src/app/signage/page.tsx"), "utf8");

    expect(source).toContain("now={new Date(state.nowMs)}");
    expect(source).not.toContain("<SignageDailyValues\n        now={new Date()}");
  });
});
