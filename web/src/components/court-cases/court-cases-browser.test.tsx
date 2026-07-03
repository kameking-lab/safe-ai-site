import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CourtCasesBrowser } from "./court-cases-browser";
import { COURT_CASES } from "@/data/court-cases";

// next/navigation はクライアントコンポーネントのフックなのでモック。
// 絞り込みのURL書き戻し（router.replace）は本テストの対象外なので no-op。
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

const PAGE_SIZE = 24;

// 一覧カードは /court-cases/{id} への内部リンク。print 等は無フィルタ時には出ない。
function caseLinkCount(container: HTMLElement): number {
  return container.querySelectorAll('a[href^="/court-cases/"]').length;
}

describe("CourtCasesBrowser ページネーション（柱C-6）", () => {
  afterEach(cleanup);

  it("初期表示は PAGE_SIZE 件に絞られ、全件を一度に描画しない", () => {
    const { container } = render(<CourtCasesBrowser />);
    expect(COURT_CASES.length).toBeGreaterThan(PAGE_SIZE); // 前提: 絞る意味がある件数
    expect(caseLinkCount(container)).toBe(PAGE_SIZE);
  });

  it("「もっと見る」は残り件数を示し、押すと PAGE_SIZE 件ずつ増える", () => {
    const { container } = render(<CourtCasesBrowser />);
    const more = screen.getByTestId("court-load-more");
    expect(more.textContent).toContain(`残り ${COURT_CASES.length - PAGE_SIZE} 件`);

    fireEvent.click(more);
    expect(caseLinkCount(container)).toBe(Math.min(PAGE_SIZE * 2, COURT_CASES.length));
  });

  it("全件表示しきると「もっと見る」は消える", () => {
    const { container } = render(<CourtCasesBrowser />);
    const clicks = Math.ceil(COURT_CASES.length / PAGE_SIZE) - 1;
    for (let i = 0; i < clicks; i++) {
      fireEvent.click(screen.getByTestId("court-load-more"));
    }
    expect(caseLinkCount(container)).toBe(COURT_CASES.length);
    expect(screen.queryByTestId("court-load-more")).toBeNull();
  });
});

describe("CourtCasesBrowser 柱0（44pxタップ標的）", () => {
  afterEach(cleanup);

  it("「絞り込みを解除」ボタンは44px以上のタップ標的を持つ", () => {
    render(<CourtCasesBrowser />);
    fireEvent.change(screen.getByPlaceholderText(/安全配慮義務、墜落、過労、石綿/), {
      target: { value: "墜落" },
    });
    const clear = screen.getByRole("button", { name: "絞り込みを解除" });
    expect(clear.className).toContain("min-h-[44px]");
  });

  it("絞り込み中の「A4で印刷／PDF保存」リンクは44px以上のタップ標的を持つ", () => {
    render(<CourtCasesBrowser />);
    fireEvent.change(screen.getByPlaceholderText(/安全配慮義務、墜落、過労、石綿/), {
      target: { value: "墜落" },
    });
    const printLink = screen.getByRole("link", { name: /A4で印刷／PDF保存/ });
    expect(printLink.className).toContain("min-h-[44px]");
  });
});
