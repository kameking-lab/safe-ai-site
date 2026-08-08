import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("KY paper no-JavaScript fallback", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/app/(main)/ky/paper/page.tsx"),
    "utf8",
  );

  it("入力できないHTMLセルを画面上で記入できるとは案内しない", () => {
    expect(source).toContain("印刷後に空欄を手書きしてください");
    expect(source).not.toContain("次の空欄を記入し、ブラウザーの印刷からPDF保存");
  });
});
