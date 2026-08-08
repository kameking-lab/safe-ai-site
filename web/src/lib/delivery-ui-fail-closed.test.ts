import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("delivery UI fail-closed copy", () => {
  it.each([
    ["notifications", join("notifications", "page.tsx")],
    ["newsletter", join("newsletter", "page.tsx")],
  ])("keeps %s registration behind an operational verification stop", (_name, relative) => {
    const source = readFileSync(join(process.cwd(), "src", "app", "(main)", relative), "utf8");
    expect(source).toContain("運用確認");
    expect(source).toContain("新規");
    expect(source).toContain("一時停止");
  });
});
