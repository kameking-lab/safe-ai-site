import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ArticlesIndexPage from "./page";

describe("記事の確認状態表示", () => {
  it("編集更新・URL取得確認・人手内容確認を混同しない", () => {
    render(<ArticlesIndexPage />);

    expect(screen.getByText(/編集更新日/)).toBeTruthy();
    expect(screen.getAllByText(/編集更新 2026-/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/人手内容確認 未完了/).length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByText(/・最終確認/)).toBeNull();
  });
});
