import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("chatbot evaluation disclosure", () => {
  const source = readFileSync(
    join(process.cwd(), "src", "app", "(main)", "about", "chatbot-eval", "page.tsx"),
    "utf8",
  );

  it("does not market the limited machine check as generated-answer accuracy", () => {
    const section = source.slice(source.indexOf("function GenQualitySection"));
    expect(section).toContain("第三者検証なし");
    expect(section).toContain("意味的正確性");
    expect(section).toContain("機械ルール完全一致率");
    expect(section).not.toContain('label="完全正答率"');
    expect(section).not.toContain('label="有用回答率"');
    expect(section).toMatch(/正答.+不具合なし.+意味しません/);
  });
});
