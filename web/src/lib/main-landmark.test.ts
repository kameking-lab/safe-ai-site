import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("main landmark ownership", () => {
  it("keeps the sole main landmark in AppShell", () => {
    const shell = readFileSync(join(process.cwd(), "src", "components", "app-shell.tsx"), "utf8");
    expect(shell.match(/<main\b/g)).toHaveLength(1);
    expect(shell.match(/<\/main>/g)).toHaveLength(1);
  });

  it("does not nest a second main element anywhere in the (main) route group", () => {
    const result = spawnSync(
      "rg",
      ["-l", "<main|</main>", "src/app/(main)", "-g", "*.tsx"],
      { cwd: process.cwd(), encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stdout.trim()).toBe("");
  });
});
