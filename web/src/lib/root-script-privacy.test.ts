import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function rootScript(path: string) {
  return readFileSync(resolve(process.cwd(), "../scripts", path), "utf8");
}

describe("root automation script log privacy", () => {
  it("退役した通知バッチは受信者・本文・tokenを読まず送信しない", () => {
    const source = rootScript("notify-pin-users.mjs");
    expect(source).toContain("disabled: signage pins are local-only");
    expect(source).not.toContain("RESEND_API_KEY");
    expect(source).not.toContain("signage-pins.json");
    expect(source).not.toContain("unsubToken");
    expect(source).not.toContain("pin.email");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("console.log(text)");
    expect(source).not.toMatch(/console\.(?:log|info|warn|error)\([^)]*\bto\b/);
  });

  it("Search Console設定スクリプトはサービスアカウント識別子をログへ出さない", () => {
    const source = rootScript("etl/gsc-add-property.mjs");
    expect(source).not.toMatch(/console\.log\([^\n;]*creds\.client_email/);
    expect(source).toContain("service_account: configured");
  });
});
