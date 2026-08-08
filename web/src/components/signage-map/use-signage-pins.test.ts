import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("サイネージピンのプライバシー境界", () => {
  it("クライアントはピンをAPIへ送信せず、メール値を保存しない", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/signage-map/use-signage-pins.ts"),
      "utf8",
    );

    expect(source).not.toContain('fetch("/api/signage/pins');
    expect(source).not.toContain("x-browser-token");
    expect(source).not.toContain("input.email");
    expect(source).toContain("localStorage");
  });
});
