import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ isAuthConfigured: true, signIn: vi.fn() }));
vi.mock("next-auth", () => ({ AuthError: class AuthError extends Error {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: () => undefined }) }));
import SignInPage from "./page";

afterEach(() => vi.unstubAllEnvs());

describe("ログイン画面はボタン2つだけ（Web・アプリ共通）", () => {
  it("Google と Apple のボタンと小さな1行だけを出し、説明枠・安心表示の文は出さない", async () => {
    vi.stubEnv("AUTH_GOOGLE_ID", "id"); vi.stubEnv("AUTH_GOOGLE_SECRET", "s"); vi.stubEnv("AUTH_APPLE_ID", "id"); vi.stubEnv("AUTH_APPLE_SECRET", "s");
    const { container } = render(await SignInPage({ searchParams: Promise.resolve({ callbackUrl: "/api/mobile/v1/auth/authorize?flow=11111111-2222-4333-8444-555555555555&confirmed=1" }) }));
    expect(screen.getAllByRole("button").map((b) => b.textContent?.trim())).toEqual(["Googleでログイン", "Appleでサインイン"]);
    const text = container.textContent ?? "";
    expect(text).not.toContain("Googleから受け取る情報と用途");
    expect(text).not.toContain("不正アクセス対策");
    expect(screen.getByRole("link", { name: "プライバシーポリシー" }).getAttribute("href")).toBe("/privacy");
  });
});
