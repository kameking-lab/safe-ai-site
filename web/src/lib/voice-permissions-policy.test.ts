import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("音声入力のPermissions-Policy契約", () => {
  it("同一オリジンのマイクだけを許可し、カメラ・位置情報は拒否する", () => {
    const config = readFileSync(
      resolve(process.cwd(), "next.config.ts"),
      "utf8",
    );

    expect(config).toContain("microphone=(self)");
    expect(config).toContain("camera=()");
    expect(config).toContain("geolocation=(self)");
    expect(config).not.toContain("microphone=()");
    expect(config).not.toContain("microphone=*");
  });
});
