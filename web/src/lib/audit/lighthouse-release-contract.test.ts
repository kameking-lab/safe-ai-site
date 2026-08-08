import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const runner = readFileSync(
  resolve(process.cwd(), "scripts/audit/best-in-class-lighthouse.mjs"),
  "utf8",
);

describe("Lighthouse release contract", () => {
  it("enforces the requested mobile score, CLS and TBT budgets", () => {
    expect(runner).toContain('summary.performance < 90');
    expect(runner).toContain('summary.cls > 0.1');
    expect(runner).toContain('summary.tbtMs > 200');
    expect(runner).toContain('performance: profile === "mobile" ? 90 : null');
  });

  it("records simulated LCP as diagnosis without replacing the score gate", () => {
    expect(runner).toContain("lcpAdvisoryMs:");
    expect(runner).not.toContain(
      "summary.lanternSimulatedLcpMs > page.mobileLcpTargetMs",
    );
  });
});
