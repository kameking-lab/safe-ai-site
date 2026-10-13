import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChemicalDatabaseClient } from "./chemical-database-client";
import { consumeChemicalListSnapshot, stageChemicalListSnapshot, type ChemicalListSnapshot } from "./chemical/chemical-list-search";

vi.mock("@/components/chemical/chemical-not-found-rescue", () => ({
  ChemicalNotFoundRescue: () => null,
}));


function snapshotForReturn(sourcePathAndSearch: string, query: string): ChemicalListSnapshot {
  return {
    sourcePathAndSearch, mode: "mhlw", query, category: "", skinOnly: false,
    selectedTags: ["yuki-2"], tagMatchMode: "or", constructionOnly: false, scrollY: 480,
  };
}

function selectTag(label: string) {
  const disclosure = screen.getByText("規制で絞り込む").closest("details")!;
  if (!disclosure.open) fireEvent.click(screen.getByText("規制で絞り込む"));
  fireEvent.click(screen.getAllByRole("button", { name: label })[0]!);
}

describe("化学DBの保存済み規制情報による絞り込み", () => {
  it("accepts approved legacy chemical-name deep links", () => {
    const originalUrl = window.location.href;
    window.history.replaceState(null, "", "/chemical-database?q=" + encodeURIComponent("トルエン"));
    try {
      render(<ChemicalDatabaseClient />);
      expect((screen.getByRole("searchbox", { name: "物質名・CAS番号で検索" }) as HTMLInputElement).value).toBe("トルエン");
    } finally {
      window.history.replaceState(null, "", originalUrl);
    }
  });

  it("does not prefill sensitive legacy query text", () => {
    const originalUrl = window.location.href;
    window.history.replaceState(null, "", "/chemical-database?q=" + encodeURIComponent("audit.person@example.invalid"));
    try {
      render(<ChemicalDatabaseClient />);
      expect((screen.getByRole("searchbox", { name: "物質名・CAS番号で検索" }) as HTMLInputElement).value).toBe("");
    } finally {
      window.history.replaceState(null, "", originalUrl);
    }
  });

  it("lets a new approved ?q override and discard a stale return snapshot", () => {
    const originalUrl = window.location.href;
    stageChemicalListSnapshot(snapshotForReturn("/chemical-database?q=トルエン", "トルエン"));
    window.history.replaceState(null, "", "/chemical-database?q=" + encodeURIComponent("ベンゼン"));
    try {
      render(<ChemicalDatabaseClient />);
      expect((screen.getByRole("searchbox", { name: "物質名・CAS番号で検索" }) as HTMLInputElement).value).toBe("ベンゼン");
      expect(screen.getByRole("row", { name: /71-43-2/ })).toBeTruthy();
      expect(screen.queryByText("1 件選択中")).toBeNull();
      expect(consumeChemicalListSnapshot()).toBeNull();
    } finally {
      window.history.replaceState(null, "", originalUrl);
    }
  });

  it("restores edited search and filters when Back returns to the same legacy ?q URL", () => {
    const originalUrl = window.location.href;
    const source = "/chemical-database?q=" + encodeURIComponent("トルエン");
    window.history.replaceState(null, "", source);
    stageChemicalListSnapshot(snapshotForReturn(source, "キシレン"));
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    try {
      render(<ChemicalDatabaseClient />);
      expect((screen.getByRole("searchbox", { name: "物質名・CAS番号で検索" }) as HTMLInputElement).value).toBe("キシレン");
      expect(screen.getByText("1 件選択中")).toBeTruthy();
      expect(consumeChemicalListSnapshot()).toBeNull();
    } finally {
      vi.unstubAllGlobals();
      window.history.replaceState(null, "", originalUrl);
    }
  });

  it("ignores sensitive explicit ?q and discards an older snapshot", () => {
    const originalUrl = window.location.href;
    stageChemicalListSnapshot(snapshotForReturn("/chemical-database", "トルエン"));
    window.history.replaceState(null, "", "/chemical-database?q=" + encodeURIComponent("audit.person@example.invalid"));
    try {
      render(<ChemicalDatabaseClient />);
      expect((screen.getByRole("searchbox", { name: "物質名・CAS番号で検索" }) as HTMLInputElement).value).toBe("");
      expect(screen.queryByText("1 件選択中")).toBeNull();
      expect(consumeChemicalListSnapshot()).toBeNull();
    } finally {
      window.history.replaceState(null, "", originalUrl);
    }
  });

  it("restores a plain no-query Back visit", () => {
    const originalUrl = window.location.href;
    window.history.replaceState(null, "", "/chemical-database");
    stageChemicalListSnapshot(snapshotForReturn("/chemical-database", "トルエン"));
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    try {
      render(<ChemicalDatabaseClient />);
      expect((screen.getByRole("searchbox", { name: "物質名・CAS番号で検索" }) as HTMLInputElement).value).toBe("トルエン");
      expect(screen.getByText("1 件選択中")).toBeTruthy();
    } finally {
      vi.unstubAllGlobals();
      window.history.replaceState(null, "", originalUrl);
    }
  });

  it("labels the site's RA route as preparation", () => {
    render(<ChemicalDatabaseClient />);
    fireEvent.click(screen.getByRole("button", { name: /専門解説 50物質/ }));
    expect(screen.getAllByText("この物質でRAを準備").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "化学物質RA準備" })).toBeTruthy();
    expect(screen.queryByText("この物質のリスクアセスメントを実施")).toBeNull();
  });

  it("places the operational search ahead of the long catalog explanation", () => {
    render(<ChemicalDatabaseClient />);
    const search = screen.getByRole("searchbox", { name: "物質名・CAS番号で検索" });
    const summary = screen.getByRole("status", { name: /収録/ });
    expect(search.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/最終判断は必ず厚生労働省/)).toBeTruthy();
  });

  it.each([
    ["有機則 第二種", "108-88-3"],
    ["有機則 第一種", "75-15-0"],
    ["特化則 第二類", "71-43-2"],
  ])("%s で詳細ページのCAS別収載情報 %s を検索できる", (label, cas) => {
    render(<ChemicalDatabaseClient />);
    selectTag(label);

    const row = screen.getByRole("row", { name: new RegExp(cas) });
    expect(within(row).getByRole("button", { name: label })).toBeTruthy();
    expect(screen.getByText("収録情報に一致")).toBeTruthy();
    expect(screen.getByText(/各法令の全対象を網羅する一覧ではありません/)).toBeTruthy();
    expect(screen.queryByText("検索結果0件")).toBeNull();
  });

  it("AND/ORを保ち、0件を規制対象外の判定と表示しない", () => {
    render(<ChemicalDatabaseClient />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "108-88-3" } });
    selectTag("有機則 第二種");
    selectTag("PRTR第一種");
    expect(screen.getByRole("row", { name: /108-88-3/ })).toBeTruthy();

    selectTag("特化則 第二類");
    expect(screen.queryByRole("row", { name: /108-88-3/ })).toBeNull();
    expect(screen.getByText("検索結果0件")).toBeTruthy();
    expect(screen.getByText(/規制対象外の判定ではありません/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "いずれか (OR)" }));
    expect(screen.getByRole("row", { name: /108-88-3/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "絞り込みを解除" }));
    expect(screen.getByRole("row", { name: /108-88-3/ })).toBeTruthy();
  });

  it("有機則のCAS別情報がない物質へタグを推測付与しない", () => {
    render(<ChemicalDatabaseClient />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "1310-73-2" } });
    selectTag("有機則 第二種");

    expect(screen.queryByRole("row", { name: /1310-73-2/ })).toBeNull();
    expect(screen.getByText(/規制対象外の判定ではありません/)).toBeTruthy();
  });
});


it("規制は閉じて開始し、閉じたまま検索語を保持して絞り込みを解除できる", () => {
  render(<ChemicalDatabaseClient />);
  const search = screen.getByRole("searchbox", { name: "物質名・CAS番号で検索" });
  const summary = screen.getByText("規制で絞り込む");
  const disclosure = summary.closest("details")!;
  expect(disclosure.open).toBe(false);
  fireEvent.change(search, { target: { value: "108-88-3" } });
  selectTag("有機則 第二種");
  fireEvent.click(summary);
  expect(disclosure.open).toBe(false);
  const clear = screen.getByRole("button", { name: "絞り込みを解除" });
  expect(clear.closest("details")).toBeNull();
  expect(search.compareDocumentPosition(clear) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  fireEvent.click(clear);
  expect((search as HTMLInputElement).value).toBe("108-88-3");
  expect(screen.getByRole("row", { name: /108-88-3/ })).toBeTruthy();
  expect(screen.queryByText("1 件選択中")).toBeNull();
});


it("開いていた規制欄を復帰時に戻し、元の一覧高でスクロールを復元する", () => {
  const originalUrl = window.location.href;
  window.history.replaceState(null, "", "/chemical-database");
  stageChemicalListSnapshot({ ...snapshotForReturn("/chemical-database", "トルエン"), regulationFiltersOpen: true, scrollY: 800 });
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
  try {
    render(<ChemicalDatabaseClient />);
    expect(screen.getByText("規制で絞り込む").closest("details")?.open).toBe(true);
    expect(screen.getByText("1 件選択中")).toBeTruthy();
  } finally {
    vi.unstubAllGlobals();
    window.history.replaceState(null, "", originalUrl);
  }
});
