import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { FavoritesList } from "./favorites-list";

/**
 * 柱0（44pxタップ標的）＋ accident 種別の表示是正の回帰ガード。
 *
 * 背景:
 * - lib/favorites の kind は article / notice / accident の3種。
 *   /accidents で「⭐」した事故事例も同じストアに入るが、本リストは
 *   article 以外を一律「通達(violet)」と誤表示し、事故事例タブも無かった。
 * - タブ・削除ボタン・空状態CTAが 44px 未満（WCAG 2.5.5 不適合）だった。
 */

const STORAGE_KEY = "safe-ai:favorites:v1";

type Seed = {
  kind: "article" | "notice" | "accident";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  addedAt: string;
};

function seed(entries: Seed[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

const ARTICLE: Seed = {
  kind: "article",
  id: "anzen|22",
  title: "第22条 健康障害の防止",
  subtitle: "安衛法 第22条",
  href: "/law-search?law=anzen&article=22",
  addedAt: "2026-06-01T09:00:00.000Z",
};
const NOTICE: Seed = {
  kind: "notice",
  id: "kihatsu-0401-1",
  title: "基発0401第1号",
  subtitle: "厚生労働省 2026-04-01",
  href: "/circulars/kihatsu-0401-1",
  addedAt: "2026-06-02T09:00:00.000Z",
};
const ACCIDENT: Seed = {
  kind: "accident",
  id: "acc-001",
  title: "足場からの墜落",
  subtitle: "建設業",
  href: "/accidents/acc-001",
  addedAt: "2026-06-03T09:00:00.000Z",
};

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  window.localStorage.clear();
});

describe("FavoritesList — accident 種別の表示是正", () => {
  it("事故事例エントリは「事故事例」バッジで表示され、「通達」とは表示しない", () => {
    seed([ACCIDENT]);
    render(<FavoritesList />);
    const titleLink = screen.getByRole("link", { name: "足場からの墜落" });
    const row = titleLink.closest("li");
    expect(row).not.toBeNull();
    const badge = within(row as HTMLElement).getByText("事故事例");
    expect(badge.className).toContain("text-rose-800");
    // 旧バグ: accident を「通達」と誤表示していた
    expect(within(row as HTMLElement).queryByText("通達")).toBeNull();
  });

  it("事故事例のお気に入りがある時だけ「事故事例」タブが出て、絞り込める", () => {
    seed([ARTICLE, NOTICE, ACCIDENT]);
    render(<FavoritesList />);
    const accidentTab = screen.getByRole("tab", { name: /事故事例/ });
    fireEvent.click(accidentTab);
    // accident だけ残る
    expect(screen.getByRole("link", { name: "足場からの墜落" })).toBeDefined();
    expect(screen.queryByRole("link", { name: "第22条 健康障害の防止" })).toBeNull();
    expect(screen.queryByRole("link", { name: "基発0401第1号" })).toBeNull();
  });

  it("事故事例のお気に入りが無ければ「事故事例」タブは出ない", () => {
    seed([ARTICLE, NOTICE]);
    render(<FavoritesList />);
    expect(screen.queryByRole("tab", { name: /事故事例/ })).toBeNull();
    expect(screen.getByRole("tab", { name: /条文/ })).toBeDefined();
    expect(screen.getByRole("tab", { name: /通達/ })).toBeDefined();
  });

  it("条文・通達は従来どおり正しいバッジで表示", () => {
    seed([ARTICLE, NOTICE]);
    render(<FavoritesList />);
    const articleRow = screen
      .getByRole("link", { name: "第22条 健康障害の防止" })
      .closest("li") as HTMLElement;
    expect(within(articleRow).getByText("条文").className).toContain("text-emerald-800");
    const noticeRow = screen
      .getByRole("link", { name: "基発0401第1号" })
      .closest("li") as HTMLElement;
    expect(within(noticeRow).getByText("通達").className).toContain("text-violet-800");
  });
});

describe("FavoritesList — 柱0 44px タップ標的", () => {
  it("種別タブは min-h-[44px]", () => {
    seed([ARTICLE]);
    render(<FavoritesList />);
    for (const tab of screen.getAllByRole("tab")) {
      expect(tab.className).toContain("min-h-[44px]");
    }
  });

  it("削除ボタンは 44×44px のタップ標的", () => {
    seed([ARTICLE]);
    render(<FavoritesList />);
    const del = screen.getByRole("button", { name: /を削除$/ });
    expect(del.className).toContain("min-h-[44px]");
    expect(del.className).toContain("min-w-[44px]");
  });

  it("空状態の導線CTAは min-h-[44px]", () => {
    // localStorage 空 → 空状態
    render(<FavoritesList />);
    const lawCta = screen.getByRole("link", { name: /法令検索を開く/ });
    const circularsCta = screen.getByRole("link", { name: /通達一覧を開く/ });
    expect(lawCta.className).toContain("min-h-[44px]");
    expect(circularsCta.className).toContain("min-h-[44px]");
  });
});
