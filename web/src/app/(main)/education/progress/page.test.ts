import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  path.join(process.cwd(), "src/app/(main)/education/progress/page.tsx"),
  "utf8",
);

describe("retired persistent learning progress route", () => {
  it("permanently redirects to the non-persistent learning hub", () => {
    expect(source).toContain('import { permanentRedirect } from "next/navigation"');
    expect(source).toContain('permanentRedirect("/e-learning")');
    expect(source).not.toMatch(/本人確認|CSV出力|累積学習時間|最終学習日|学習履歴/);
  });

  it("does not read, write, clear, or migrate browser learning records", () => {
    expect(source).not.toMatch(/localStorage|sessionStorage|removeItem|\.clear\(/);
    expect(source).not.toMatch(/study[_-]?time|streak|study[_-]?history/i);
  });
});
