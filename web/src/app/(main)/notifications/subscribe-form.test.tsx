import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SubscribeForm } from "./subscribe-form";

describe("/notifications 気象警報メール登録フォーム", () => {
  it("メールアドレス入力が 44px タップ標的を満たす", () => {
    render(<SubscribeForm />);
    const email = screen.getByLabelText(/メールアドレス/);
    expect(email.className).toContain("min-h-[44px]");
    // 40px相当の py-2.5 へ退行していないこと
    expect(email.className).not.toContain("py-2.5");
  });

  it("対象地域セレクトが 44px タップ標的を満たす", () => {
    render(<SubscribeForm />);
    const select = screen.getByLabelText(/対象地域/);
    expect(select.className).toContain("min-h-[44px]");
    expect(select.className).not.toContain("py-2.5");
  });

  it("登録ボタンが 44px タップ標的を満たす", () => {
    render(<SubscribeForm />);
    const submit = screen.getByRole("button", { name: /気象警報通知を登録する/ });
    expect(submit.className).toContain("min-h-[44px]");
  });
});
