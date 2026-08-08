import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CourtCasesBrowser } from "./court-cases-browser";
import { COURT_CASES } from "@/data/court-cases";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

describe("CourtCasesBrowser quarantine boundary", () => {
  afterEach(cleanup);

  it("公開allowlistが空なら判例詳細・印刷・ページ追加導線を出さない", () => {
    expect(COURT_CASES).toEqual([]);
    const { container } = render(<CourtCasesBrowser />);
    expect(
      container.querySelectorAll('a[href^="/court-cases/"]'),
    ).toHaveLength(0);
    expect(screen.queryByTestId("court-load-more")).toBeNull();
    expect(
      screen.queryByRole("link", { name: /A4で印刷|PDF保存/ }),
    ).toBeNull();
  });

  it("空集合を『見つからない』と明示し架空件数を表示しない", () => {
    const { container } = render(<CourtCasesBrowser />);
    expect(container.textContent).toMatch(
      /0\s*件|条件に合う判例がありません/,
    );
    expect(container.textContent).not.toMatch(/[1-9][0-9]*件を収録/);
  });

  it("残る検索コントロールは44pxタップ標的を維持する", () => {
    render(<CourtCasesBrowser />);
    const search = screen.getByPlaceholderText(
      /安全配慮義務、墜落、過労、石綿/,
    );
    expect(search.parentElement?.className).toContain("min-h-[44px]");
    for (const label of ["争点", "分野", "裁判所", "年代"]) {
      expect(
        screen.getByLabelText(label, { selector: "select" }).className,
      ).toContain("min-h-[44px]");
    }
  });
});
