import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  path.join(process.cwd(), "src/app/signage/manage/page.tsx"),
  "utf8",
);

describe("signage fleet operational wording", () => {
  it("does not present mock or unconnected devices as operational", () => {
    expect(source).toContain("端末未登録");
    expect(source).toContain("接続未確認");
    expect(source).toContain("mockは本番端末数に含めません");
    expect(source).not.toContain("デモ端末");
  });

  it("shows heartbeat, staged rollout, acknowledgement and rollback boundaries", () => {
    expect(source).toContain("heartbeat");
    expect(source).toContain("acknowledgement");
    expect(source).toContain("canary");
    expect(source).toContain("rollback");
  });
});
