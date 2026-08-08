import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  path.join(process.cwd(), "src/app/(main)/education/progress/page.tsx"),
  "utf8",
);

describe("organization training progress wording", () => {
  it("fails closed and distinguishes every completion level", () => {
    expect(source).toContain("fail-closed");
    expect(source).toContain("自己確認");
    expect(source).toContain("学習完了");
    expect(source).toContain("社内受講記録");
    expect(source).toContain("正式な修了証ではありません");
  });

  it("exposes site/course progress without claiming anonymous progress is formal", () => {
    expect(source).toContain("本人確認");
    expect(source).toContain("CSV出力");
    expect(source).toContain("端末内進捗は正式な受講記録ではありません");
  });
});
