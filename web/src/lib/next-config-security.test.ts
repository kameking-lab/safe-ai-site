import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "@/lib/security/csp";

describe("production browser security configuration", () => {
  const source = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");
  const productionCsp = buildContentSecurityPolicy({
    nonce: "security-test-nonce",
    development: false,
  });
  const scriptDirective =
    productionCsp
      .split(";")
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith("script-src ")) ?? "";

  it("公開source mapを無効化する", () => {
    expect(source).toContain("productionBrowserSourceMaps: false");
  });

  it("unsafe-evalをproductionのCSPへ入れない", () => {
    expect(productionCsp).not.toContain("'unsafe-eval'");
    expect(scriptDirective).not.toContain("'unsafe-inline'");
  });

  it("inline event handlerを拒否し、Service Workerの生成元を限定する", () => {
    expect(productionCsp).toContain("script-src-attr 'none'");
    expect(productionCsp).toContain("worker-src 'self'");
    expect(productionCsp).toContain("manifest-src 'self'");
  });

  it("server-only AI providerをbrowser connect-srcへ許可しない", () => {
    const connectSource = productionCsp
      .split(/\r?\n/)
      .flatMap((line) => line.split(";"))
      .find((directive) => directive.trim().startsWith("connect-src "));
    expect(connectSource).toBeDefined();
    expect(connectSource).not.toContain("generativelanguage.googleapis.com");
  });

  it("本番でも障害通知用のwarn/errorを保持する", () => {
    expect(source).toContain('{ exclude: ["error", "warn"] }');
  });

  it("JavaScript無効チャットは参照元と共有cacheをpath単位で遮断する", () => {
    const noScriptRule = source.slice(
      source.indexOf('source: "/api/chatbot/no-script"'),
      source.indexOf('...(PREVIEW_SAFETY_MODE'),
    );

    expect(noScriptRule).toContain('{ key: "Referrer-Policy", value: "no-referrer" }');
    expect(noScriptRule).toContain("private, no-store, max-age=0, must-revalidate");
    expect(noScriptRule).toContain("noindex, follow, noarchive");
  });

  it("Previewは全pathをdry-runかつnoindexにする", () => {
    const previewRules = source.slice(source.indexOf("...(PREVIEW_SAFETY_MODE"));
    const globalRule = previewRules.slice(
      previewRules.indexOf('source: "/(.*)"'),
      previewRules.indexOf('source: "/sw.js"'),
    );

    expect(globalRule).toContain('key: "X-Robots-Tag"');
    expect(globalRule).toContain('value: "noindex, nofollow, noarchive"');
    expect(globalRule).toContain('key: "X-Safe-AI-Preview-Mode"');
    expect(globalRule).toContain('value: "dry-run"');
  });
});
