import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ isAuthConfigured: false, signIn: vi.fn() }));
import SignInPage from "./page";

describe("SignInPage fail-closed state", () => {
  it("認証設定が無いと壊れたOAuthボタンを出さず端末内保存を案内する", () => {
    render(<SignInPage />);
    expect(screen.getByRole("status").textContent).toContain("ログイン機能は準備中");
    expect(screen.getByRole("status").textContent).toContain("クラウド同期は行われません");
    expect(screen.queryByRole("button", { name: "Googleでログイン" })).toBeNull();
  });
});
