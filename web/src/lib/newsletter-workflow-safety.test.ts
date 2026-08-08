import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(process.cwd(), "..");
const script = readFileSync(resolve(repoRoot, "scripts/send-newsletter.mjs"), "utf8");
const workflow = readFileSync(resolve(repoRoot, ".github/workflows/newsletter.yml"), "utf8");

describe("newsletter operational safeguards", () => {
  it("未検証の固定2024年コンテンツを週次情報として送らない", () => {
    expect(script).not.toContain("2024-04-01");
    expect(script).not.toContain("2024-03-15");
    expect(workflow).not.toMatch(/\bschedule:/);
  });

  it("送信は明示許可・冪等キー・失敗終了を要求する", () => {
    expect(script).toContain('ALLOW_NEWSLETTER_SEND !== "true"');
    expect(script).toContain('"Idempotency-Key"');
    expect(script).toContain("if (failed > 0)");
    expect(workflow).toContain("concurrency:");
  });

  it("dry-runで個別メールアドレスをログ出力しない", () => {
    expect(script).not.toContain("console.log(`  → ${c.email}`)");
    expect(script).not.toContain('?? "dev-newsletter-secret"');
  });
});
