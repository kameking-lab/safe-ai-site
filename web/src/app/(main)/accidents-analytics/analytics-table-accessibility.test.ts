import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(
    process.cwd(),
    "src/app/(main)/accidents-analytics/AnalyticsDashboardImpl.tsx",
  ),
  "utf8",
);

describe("事故分析の横スクロール表", () => {
  it("キーボードでフォーカスでき、領域の目的と横スクロールを伝える", () => {
    expect(source).toContain('role="region"');
    expect(source).toContain(
      'aria-label="業種と事故型のクロス集計表。横方向にスクロールできます"',
    );
    expect(source).toContain("tabIndex={0}");
    expect(source).toContain("focus-visible:outline");
  });
});
