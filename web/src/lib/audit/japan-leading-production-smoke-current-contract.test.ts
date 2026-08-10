import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const smokeSource = readFileSync(
  join(
    process.cwd(),
    "scripts",
    "audit",
    "japan-leading-production-smoke.mjs",
  ),
  "utf8",
);

describe("current production smoke contracts", () => {
  it("廃止した学習進捗routeは永続redirectとして検証し、旧scope画面を要求しない", () => {
    const protectedGovernanceBlock = smokeSource.match(
      /const protectedGovernanceRoutes = \[([\s\S]*?)\n\];/,
    )?.[1];

    expect(protectedGovernanceBlock).toBeDefined();
    expect(protectedGovernanceBlock).not.toContain("/education/progress");
    expect(smokeSource).toContain(
      'const retiredProgressRoute = await request("/education/progress")',
    );
    expect(smokeSource).toContain(
      'retiredProgressRoute.headers.location === "/e-learning"',
    );
    expect(smokeSource).toContain("retiredProgressRoute.status === 308");
  });

  it("不一致feedbackはReact更新とfocus移動の完了を待って検証する", () => {
    expect(smokeSource).toMatch(
      /getByRole\("button", \{ name: "違う" \}\)\.click\(\);[\s\S]*?waitForFunction\([\s\S]*?composer === document\.activeElement[\s\S]*?data-chatbot-quick-reply/,
    );
  });
});
