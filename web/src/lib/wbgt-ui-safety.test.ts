import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("WBGT reference calculator safety boundary", () => {
  const source = readFileSync(
    resolve(
      process.cwd(),
      "src/app/(main)/heat-illness-prevention/wbgt-calculator/wbgt-calculator-client.tsx",
    ),
    "utf8",
  );

  it("推定値を実測記録や一律の作業中止・補水処方へ転記しない", () => {
    expect(source).toContain("参考推定値（実測WBGTではありません）");
    expect(source).toContain("作業判断にはJIS適合のWBGT計");
    expect(source).not.toContain("putHeatLogDraft");
    expect(source).not.toContain("日次記録簿に追加");
    expect(source).not.toContain("fluidIntakeMlPerHour");
    expect(source).not.toContain("原則 作業中止");
  });
});
