import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

function scriptDirective(policy: string): string {
  return (
    policy
      .split(";")
      .map((value) => value.trim())
      .find((value) => value.startsWith("script-src ")) ?? ""
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Proxy CSP boundary", () => {
  it("production defaults to strict Report-Only until framework nonce coverage is verified", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("CSP_STRICT_ENFORCEMENT_VERIFIED", "");
    const first = proxy(new NextRequest("https://example.test/search?q=safe"));
    const second = proxy(new NextRequest("https://example.test/search?q=safe"));
    const firstPolicy =
      first.headers.get("content-security-policy-report-only") ?? "";
    const secondPolicy =
      second.headers.get("content-security-policy-report-only") ?? "";

    expect(scriptDirective(firstPolicy)).not.toContain("'unsafe-inline'");
    expect(scriptDirective(firstPolicy)).toContain("'strict-dynamic'");
    expect(firstPolicy).not.toBe(secondPolicy);
    expect(
      scriptDirective(first.headers.get("content-security-policy") ?? ""),
    ).toContain("'unsafe-inline'");
  });

  it("allows strict production enforcement only after an explicit verified gate", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("CSP_STRICT_ENFORCEMENT_VERIFIED", "true");
    const response = proxy(new NextRequest("https://example.test/search"));
    const enforced = response.headers.get("content-security-policy") ?? "";

    expect(scriptDirective(enforced)).not.toContain("'unsafe-inline'");
    expect(scriptDirective(enforced)).toContain("'strict-dynamic'");
    expect(
      response.headers.get("content-security-policy-report-only"),
    ).toBeNull();
  });

  it("enforces the self-contained no-script chatbot boundary in every runtime", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "development");
    const response = proxy(
      new NextRequest("http://localhost/api/chatbot/no-script", {
        method: "POST",
      }),
    );
    const policy = response.headers.get("content-security-policy") ?? "";

    expect(policy).toBe(
      "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    );
    expect(policy).not.toContain("script-src");
    expect(
      response.headers.get("content-security-policy-report-only"),
    ).toBeNull();
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-robots-tag")).toBe(
      "noindex, follow, noarchive",
    );
  });

  it("Preview keeps compatibility enforcement and reports the strict policy", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("CSP_STRICT_ENFORCEMENT_CANDIDATE", "");
    const response = proxy(new NextRequest("https://example.test/search"));
    const enforced = response.headers.get("content-security-policy") ?? "";
    const reportOnly =
      response.headers.get("content-security-policy-report-only") ?? "";

    expect(scriptDirective(enforced)).toContain("'unsafe-inline'");
    expect(scriptDirective(reportOnly)).not.toContain("'unsafe-inline'");
    expect(scriptDirective(reportOnly)).toContain("'strict-dynamic'");
  });

  it("allows strict Preview enforcement only for the explicit candidate gate", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("CSP_STRICT_ENFORCEMENT_CANDIDATE", "true");
    vi.stubEnv("CSP_STRICT_ENFORCEMENT_VERIFIED", "true");
    const response = proxy(new NextRequest("https://example.test/chatbot"));
    const enforced = response.headers.get("content-security-policy") ?? "";

    expect(scriptDirective(enforced)).not.toContain("'unsafe-inline'");
    expect(scriptDirective(enforced)).toContain("'strict-dynamic'");
    expect(
      response.headers.get("content-security-policy-report-only"),
    ).toBeNull();
  });

  it("ignores the Preview candidate gate in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("CSP_STRICT_ENFORCEMENT_CANDIDATE", "true");
    vi.stubEnv("CSP_STRICT_ENFORCEMENT_VERIFIED", "");
    const response = proxy(new NextRequest("https://example.test/laws"));

    expect(
      scriptDirective(response.headers.get("content-security-policy") ?? ""),
    ).toContain("'unsafe-inline'");
    expect(
      scriptDirective(
        response.headers.get("content-security-policy-report-only") ?? "",
      ),
    ).toContain("'strict-dynamic'");
  });

  it("ignores the production verified gate in Preview", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("CSP_STRICT_ENFORCEMENT_CANDIDATE", "");
    vi.stubEnv("CSP_STRICT_ENFORCEMENT_VERIFIED", "true");
    const response = proxy(new NextRequest("https://example.test/laws"));

    expect(
      scriptDirective(response.headers.get("content-security-policy") ?? ""),
    ).toContain("'unsafe-inline'");
    expect(response.headers.get("content-security-policy-report-only")).toBeTruthy();
  });

  it("CSP Report-Onlyをquery・token・PII付きcollectorへ保存しない", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    const response = proxy(
      new NextRequest(
        "https://example.test/search?q=作業本文&token=secret&email=user%40example.test",
      ),
    );
    const reportOnly =
      response.headers.get("content-security-policy-report-only") ?? "";

    expect(reportOnly).not.toMatch(/report-uri|report-to/i);
    expect(response.headers.get("reporting-endpoints")).toBeNull();
    expect(response.headers.get("report-to")).toBeNull();
    expect(response.headers.get("nel")).toBeNull();
    expect(reportOnly).not.toMatch(/作業本文|secret|user%40|user@/i);
  });

  it("Preview side-effect blocks retain CSP and noindex headers", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    const response = proxy(
      new NextRequest("https://example.test/api/admin/change", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("x-robots-tag")).toBe(
      "noindex, nofollow, noarchive",
    );
    expect(response.headers.get("content-security-policy")).toBeTruthy();
    expect(
      response.headers.get("content-security-policy-report-only"),
    ).toBeTruthy();
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "preview_side_effect_blocked" },
    });
  });

  it("forces dry-run and noindex on ordinary Preview paths", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");

    for (const pathname of ["/", "/chatbot", "/law-search", "/unknown-path"]) {
      const response = proxy(new NextRequest(`https://example.test${pathname}`));
      expect(response.headers.get("x-safe-ai-preview-mode")).toBe("dry-run");
      expect(response.headers.get("x-robots-tag")).toBe(
        "noindex, nofollow, noarchive",
      );
    }
  });

  it("strips query and token material from auth presentation pages", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    const response = proxy(
      new NextRequest(
        "https://example.test/auth/error?error=AccessDenied&token=secret",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://example.test/auth/error",
    );
    expect(response.headers.get("location")).not.toContain("token");
    expect(response.headers.get("content-security-policy")).toBeTruthy();
  });

  it("uses the actual Next runtime mode when a dev server carries a deployment label", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("CSP_STRICT_ENFORCEMENT_VERIFIED", "true");
    vi.stubEnv("CSP_STRICT_ENFORCEMENT_CANDIDATE", "true");
    const response = proxy(new NextRequest("https://example.test/laws"));
    const script = scriptDirective(
      response.headers.get("content-security-policy") ?? "",
    );

    expect(script).toContain("'unsafe-inline'");
    expect(script).toContain("'unsafe-eval'");
    expect(script).not.toContain("'strict-dynamic'");
  });
});
