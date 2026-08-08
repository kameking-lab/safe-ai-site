import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  diagnosticControlsEnabled,
  resolveDiagnosticDelay,
  resolveDiagnosticError,
} from "./diagnostic-controls";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("diagnostic controls", () => {
  it("production ignores caller-controlled errors and delays", () => {
    vi.stubEnv("NODE_ENV", "production");
    const request = new NextRequest("https://example.test/api/revisions?forceError=5xx&delayMs=999999", {
      headers: { "x-force-error": "timeout" },
    });

    expect(diagnosticControlsEnabled()).toBe(false);
    expect(resolveDiagnosticError(request)).toBeNull();
    expect(resolveDiagnosticDelay(request.nextUrl.searchParams.get("delayMs"), 650)).toBe(0);
  });

  it("Vercel production also disables diagnostics when a test bundle fixes NODE_ENV", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VERCEL_ENV", "production");
    const request = new NextRequest(
      "https://example.test/api/chat?forceError=5xx&delayMs=999999",
    );

    expect(diagnosticControlsEnabled()).toBe(false);
    expect(resolveDiagnosticError(request)).toBeNull();
    expect(resolveDiagnosticDelay("999999")).toBe(0);
  });

  it("non-production supports bounded failure injection for E2E", () => {
    vi.stubEnv("NODE_ENV", "test");
    const request = new NextRequest("https://example.test/api/revisions?forceError=validation");

    expect(resolveDiagnosticError(request)).toBe("validation");
    expect(resolveDiagnosticDelay("999999")).toBe(10_000);
  });
});
