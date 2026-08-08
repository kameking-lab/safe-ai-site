import { describe, expect, it } from "vitest";
import type { SearchItem } from "@/lib/search-index";
import {
  buildSearchPageHref,
  classifySearchResults,
  paginateSearchResults,
  SEARCH_DESTINATION_LIMIT,
  SEARCH_PAGE_SIZE,
} from "./SearchResults";

function item(
  id: string,
  overrides: Partial<SearchItem> = {},
): SearchItem {
  return {
    id,
    title: `結果 ${id}`,
    subtitle: "一致抜粋",
    category: "law",
    url: `/result/${id}`,
    informationKind: "siteExplanation",
    ...overrides,
  };
}

describe("/search result grouping and pagination", () => {
  it("目的ページを先頭groupへ分け、表示上限を5件に固定できる", () => {
    const results = Array.from({ length: 8 }, (_, index) =>
      item(`tool-${index}`, {
        category: "feature",
        informationKind: "tool",
      }),
    );
    const groups = classifySearchResults(results);

    expect(groups.destinations).toHaveLength(8);
    expect(groups.destinations.slice(0, SEARCH_DESTINATION_LIMIT)).toHaveLength(5);
    expect(groups.documents).toHaveLength(0);
  });

  it("公式一次資料を20件ずつページングし、範囲外pageを安全に丸める", () => {
    const documents = Array.from({ length: 45 }, (_, index) =>
      item(`document-${index}`, { informationKind: "primary" }),
    );
    const groups = classifySearchResults(documents);

    expect(groups.documents).toHaveLength(45);
    expect(paginateSearchResults(groups.documents, 2)).toMatchObject({
      page: 2,
      pageCount: 3,
    });
    expect(paginateSearchResults(groups.documents, 2).items).toHaveLength(
      SEARCH_PAGE_SIZE,
    );
    expect(paginateSearchResults(groups.documents, 99).items).toHaveLength(5);
  });

  it("内部解説でも検証済み公式着地点を持つ文書は一次資料導線へ分ける", () => {
    const groups = classifySearchResults([
      item("law-guide", {
        informationKind: "siteExplanation",
        officialDestinations: [
          "https://elaws.e-gov.go.jp/document?lawid=347AC0000000057",
        ],
      }),
    ]);
    expect(groups.documents.map((result) => result.id)).toEqual(["law-guide"]);
  });

  it("親canonicalが同じ結果はranker先頭だけを残す", () => {
    const groups = classifySearchResults([
      item("first", { canonicalUrl: "/law-search", url: "/law-search?q=first" }),
      item("duplicate", { canonicalUrl: "/law-search", url: "/law-search?q=second" }),
      item("other"),
    ]);

    expect(groups.others.map((result) => result.id)).toEqual(["first", "other"]);
  });

  it("ページリンクは検索条件と他groupのページを保ち、戻る履歴を作れるURLにする", () => {
    expect(
      buildSearchPageHref({
        query: " CAS ",
        category: "chemical",
        documentPage: 2,
        otherPage: 3,
        targetKind: "others",
        targetPage: 4,
      }),
    ).toBe("/search?cat=chemical&docPage=2&otherPage=4");

    expect(
      buildSearchPageHref({
        query: "法令",
        category: "all",
        documentPage: 2,
        otherPage: 1,
        targetKind: "documents",
        targetPage: 1,
      }),
    ).toBe("/search");
  });
});
