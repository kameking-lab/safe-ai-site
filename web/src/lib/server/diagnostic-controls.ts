import "server-only";

import type { NextRequest } from "next/server";

export type DiagnosticError = "5xx" | "timeout" | "validation";

const MAX_DIAGNOSTIC_DELAY_MS = 10_000;

/**
 * Failure and latency injection is a local/E2E aid. It must never be
 * controlled by an unauthenticated production request.
 */
export function diagnosticControlsEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.VERCEL_ENV !== "production"
  );
}

export function resolveDiagnosticDelay(value: string | null, fallbackMs = 0): number {
  if (!diagnosticControlsEnabled()) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallbackMs;
  return Math.min(parsed, MAX_DIAGNOSTIC_DELAY_MS);
}

export function resolveDiagnosticError(request: NextRequest | Request): DiagnosticError | null {
  if (!diagnosticControlsEnabled()) return null;
  const url = new URL(request.url);
  const value = url.searchParams.get("forceError") ?? request.headers.get("x-force-error");
  return value === "5xx" || value === "timeout" || value === "validation" ? value : null;
}
