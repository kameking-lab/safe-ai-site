import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SearchFallback, SearchPageHeader } from "./search-page-components";

describe("SearchFallback", () => {
  it("keeps a heading and all eight search categories reachable without JavaScript", () => {
    render(
      <>
        <SearchPageHeader />
        <SearchFallback />
      </>,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "サイト内を横断検索",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("navigation", {
        name: "検索カテゴリへの代替導線",
      }),
    ).toBeTruthy();

    for (const name of [
      "法令",
      "事故",
      "化学物質",
      "資格",
      "教育",
      "KYT",
      "ツール",
      "自動化サンプル",
    ]) {
      expect(screen.getByRole("link", { name })).toBeTruthy();
    }
  });
});
