import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SecurityPage from "./page";

describe("security page implementation alignment", () => {
  it("AI学習・ログ削除・DB事業者を実装以上に断定しない", () => {
    const { container } = render(<SecurityPage />);
    const text = container.textContent ?? "";
    expect(text).toContain("一律に保証しません");
    expect(text).toContain("永続ログへ保存しません");
    expect(text).toContain("最大24時間キャッシュ");
    expect(text).toContain("Supabase");
    expect(text).not.toContain("30日で自動削除");
    expect(text).not.toContain("モデルの学習には利用されません");
    expect(text).not.toContain("Vercel Postgres（Neon）Singapore");
  });

  it("認証は公開確認時点で未提供と明示し、JSON-LDを重複しない", () => {
    const { container } = render(<SecurityPage />);
    expect(screen.getByText(/公開確認では認証エンドポイントが利用できませんでした/)).toBeTruthy();
    expect(container.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1);
  });
});
