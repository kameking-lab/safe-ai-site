import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  buildPreviewEnforcedContentSecurityPolicy,
  createCspNonce,
} from "./csp";

function directive(policy: string, name: string): string {
  return (
    policy
      .split(";")
      .map((value) => value.trim())
      .find((value) => value.startsWith(`${name} `)) ?? ""
  );
}

describe("request-scoped Content Security Policy", () => {
  it("production script-src has nonce/strict-dynamic and no unsafe execution", () => {
    const policy = buildContentSecurityPolicy({
      nonce: "fixed-test-nonce",
      development: false,
    });
    const script = directive(policy, "script-src");

    expect(script).toContain("'nonce-fixed-test-nonce'");
    expect(script).toContain("'strict-dynamic'");
    expect(script).not.toContain("'unsafe-inline'");
    expect(script).not.toContain("'unsafe-eval'");
    expect(policy).toContain("script-src-attr 'none'");
    expect(policy).toContain("upgrade-insecure-requests");
  });

  it("development framework exceptions stay development-only and style debt is isolated", () => {
    const policy = buildContentSecurityPolicy({
      nonce: "dev-test-nonce",
      development: true,
    });

    expect(directive(policy, "script-src")).toContain("'unsafe-eval'");
    expect(directive(policy, "script-src")).toContain("'unsafe-inline'");
    expect(directive(policy, "script-src")).not.toContain("'strict-dynamic'");
    expect(directive(policy, "style-src")).toContain("'unsafe-inline'");
    expect(directive(policy, "style-src-attr")).toContain("'unsafe-inline'");
  });

  it("omits the HTTPS upgrade directive on local HTTP without weakening script policy", () => {
    const policy = buildContentSecurityPolicy({
      nonce: "http-test-nonce",
      development: false,
      secureTransport: false,
    });

    expect(policy).not.toContain("upgrade-insecure-requests");
    expect(directive(policy, "script-src")).toContain("'strict-dynamic'");
    expect(directive(policy, "script-src")).not.toContain("'unsafe-inline'");
    expect(
      buildPreviewEnforcedContentSecurityPolicy(false, false),
    ).not.toContain("upgrade-insecure-requests");
  });

  it("Preview compatibility policy is separate from the strict Report-Only policy", () => {
    const compatibility = buildPreviewEnforcedContentSecurityPolicy(false);
    expect(directive(compatibility, "script-src")).toContain("'unsafe-inline'");
    expect(directive(compatibility, "script-src")).not.toContain("'strict-dynamic'");
    expect(directive(compatibility, "script-src")).not.toContain("'nonce-");
  });

  it("creates a fresh base64 nonce", () => {
    const first = createCspNonce();
    const second = createCspNonce();
    expect(first).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(second).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(first).not.toBe(second);
  });
});
