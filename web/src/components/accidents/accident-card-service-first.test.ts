import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
  path.join(process.cwd(), "src/components/accident-database-panel.tsx"),
  "utf8",
);

describe("事故カードの操作密度", () => {
  it("通常表示を詳細・出典・折りたたみの3操作以内に保つ", () => {
    expect(source).toContain("詳細・関連事故");
    expect(source).toContain("原因・対策と関連操作");
    expect(source).not.toContain("setExpandedId");
    expect(source.indexOf("<details")).toBeLessThan(
      source.indexOf("<AccidentActionBar"),
    );
    expect(source.indexOf("<details")).toBeLessThan(
      source.indexOf("日誌に記録"),
    );
  });
});
