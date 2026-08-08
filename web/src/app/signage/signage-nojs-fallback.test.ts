import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("signage no-JavaScript boundary", () => {
  it("取得中表示を盤面に固定せず、取得不能と公式確認先を返す", () => {
    const source = readFileSync(resolve(process.cwd(), "src/app/signage/page.tsx"), "utf8");
    expect(source).toContain("<noscript>");
    expect(source).toContain("最新情報を取得できません");
    expect(source).toContain("https://www.jma.go.jp/bosai/warning/");
    expect(source).toContain('data-signage-live=""');
    expect(source).not.toContain("表示開始までの3ステップ");
  });
});
