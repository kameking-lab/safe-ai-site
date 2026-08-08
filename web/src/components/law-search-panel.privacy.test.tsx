import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LawSearchPanel } from "./law-search-panel";

vi.mock("next/dynamic", () => ({
  default: () => () => <div data-testid="law-search-results" />,
}));

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

describe("LawSearchPanel URL privacy", () => {
  it("初期の検索例を自由入力を補助する3件に限定する", () => {
    render(<LawSearchPanel />);
    expect(
      screen.getByRole("navigation", { name: "検索例" }).querySelectorAll("button"),
    ).toHaveLength(3);
  });

  it("入力中・送信後・質問例選択後も任意本文をURLへ書かない", () => {
    window.history.replaceState({}, "", "/law-search?law=all");
    const { container } = render(<LawSearchPanel />);
    const keyword = "山田太郎 新宿A現場の足場";
    const query = screen.getByRole("searchbox", {
      name: "法令フリーワード検索",
    });

    fireEvent.change(query, { target: { value: keyword } });
    expect(window.location.search).toBe("?law=all");
    fireEvent.submit(container.querySelector("form")!);
    expect(window.location.search).toBe("?law=all");
    expect(window.location.href).not.toContain(encodeURIComponent(keyword));

    fireEvent.click(screen.getByRole("button", { name: "安衛法 第61条" }));
    expect(window.location.search).toBe("?law=all");
    expect((query as HTMLInputElement).value).toBe("第61条");
  });

  it("JavaScript無効時にもGET成功欄にならないフォーム構造を保つ", () => {
    const { container } = render(<LawSearchPanel />);
    const form = container.querySelector("form")!;
    expect(form.hasAttribute("action")).toBe(false);
    expect(form.hasAttribute("method")).toBe(false);
    for (const input of container.querySelectorAll("input")) {
      expect(input.hasAttribute("name")).toBe(false);
    }
  });
});
