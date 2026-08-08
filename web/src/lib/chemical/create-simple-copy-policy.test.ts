import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const forbidden = [
  ["CREATE-SIMPLE", "準拠"].join(""),
  ["CREATE-SIMPLE", "互換"].join(""),
  ["公式", "と同等"].join(""),
  ["そのまま", "提出可能"].join(""),
  ["労基署へ", "そのまま提出"].join(""),
  ["労基へ", "そのまま提出"].join(""),
  ["監査に", "そのまま使用"].join(""),
  ["公的ツール", "代替"].join(""),
  ["そのまま", "提出できます"].join(""),
  ["詳細なばく露モデリング", "の代替として使用"].join(""),
  ["化学物質RA", "でリスク区分を判定"].join(""),
];

function sourceFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(file));
    else if (/\.(?:ts|tsx|json|jsonl)$/.test(entry.name)) {
      out.push(file);
    }
  }
  return out;
}

describe("CREATE-SIMPLE copy policy", () => {
  it("公開本文・metadata・JSON-LD・印刷面に禁止表現を残さない", () => {
    const root = path.resolve(process.cwd(), "src");
    const violations = sourceFiles(root).flatMap((file) => {
      const text = fs.readFileSync(file, "utf8");
      return forbidden
        .filter((phrase) => text.includes(phrase))
        .map((phrase) => `${path.relative(root, file)}: ${phrase}`);
    });
    expect(violations).toEqual([]);
  });
});
