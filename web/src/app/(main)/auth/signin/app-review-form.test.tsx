import { render, screen } from "@testing-library/react";
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ isAuthConfigured: true, signIn: vi.fn() }));
// The form only needs the AuthError class; the real package needs the Next server runtime.
vi.mock("next-auth", () => ({ AuthError: class AuthError extends Error {} }));
import SignInPage from "./page";

const FLOW = "/api/mobile/v1/auth/authorize?flow=0f8fad5b-d9cb-469f-a165-70867728950e&confirmed=1";

afterEach(() => vi.unstubAllEnvs());

function enableReview() {
  vi.stubEnv("APP_REVIEW_LOGIN_ENABLED", "true");
  vi.stubEnv("APP_REVIEW_CODE_SHA256", createHash("sha256").update("synthetic").digest("hex"));
  vi.stubEnv("APP_REVIEW_EXPIRES_AT", "2999-01-01T00:00:00Z");
  vi.stubEnv("AUTH_SECRET", "synthetic");
}

describe("App Review sign-in form", () => {
  it("is reachable from the native app's authorize flow even before Apple sign-in is configured", async () => {
    enableReview();
    vi.stubEnv("AUTH_APPLE_ID", ""); vi.stubEnv("AUTH_GOOGLE_ID", "");
    render(await SignInPage({ searchParams: Promise.resolve({ callbackUrl: FLOW }) }));
    expect(screen.getByText(/App Store審査用ログイン/)).toBeTruthy();
    expect(screen.getByLabelText(/Username/)).toBeTruthy();
    expect(screen.getByLabelText(/Password/).getAttribute("type")).toBe("password");
    expect(screen.queryByRole("button", { name: "Googleでログイン" })).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows a generic failure message after a rejected attempt", async () => {
    enableReview();
    render(await SignInPage({ searchParams: Promise.resolve({ callbackUrl: FLOW, reviewError: "1" }) }));
    expect(screen.getByRole("alert").textContent).toContain("ログインできませんでした");
  });

  it("is hidden while disabled or expired", async () => {
    enableReview();
    vi.stubEnv("APP_REVIEW_EXPIRES_AT", "2000-01-01T00:00:00Z");
    render(await SignInPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByText(/App Store審査用ログイン/)).toBeNull();
  });
});
