import { describe, expect, it } from "vitest";
import {
  classifySearchIndexFailures,
  findConservativeSearchSuggestion,
  getSearchMatchDetails,
  getSearchTrustState,
  searchItems,
  type SearchItem,
} from "./search-index";

const items: SearchItem[] = [
  {
    id: "tool-full-harness",
    title: "フルハーネス安全確認",
    subtitle: "墜落制止用器具の点検ガイド",
    category: "feature",
    url: "/tools/full-harness",
    keywords: ["フルハーネス", "墜落制止用器具"],
    informationKind: "tool",
    provenance: "internal",
    verification: "pending",
    freshness: "unknown",
    asOf: null,
  },
  {
    id: "synthetic-crane",
    title: "クレーン接触事故モデル",
    subtitle: "教材用に作成した架空事例",
    category: "accident",
    url: "/accidents/synthetic-crane",
    keywords: ["クレーン"],
    informationKind: "synthetic",
    provenance: "synthetic",
    verification: "quarantine",
    freshness: "unknown",
    asOf: null,
  },
];

describe("横断検索の安全状態と表記揺れ", () => {
  it("ひらがな入力からカタカナ表記へ一致する", () => {
    expect(searchItems(items, "ふるはーねす", "all", 5).map((item) => item.id)).toEqual([
      "tool-full-harness",
    ]);
  });

  it("高リスク資料の読込失敗をblockedへ落とす", () => {
    expect(classifySearchIndexFailures([])).toBe("complete");
    expect(classifySearchIndexFailures(["articles"])).toBe("partial");
    expect(classifySearchIndexFailures(["laws"])).toBe("blocked");
    expect(classifySearchIndexFailures(["chemicals-mhlw", "articles"])).toBe("blocked");
  });

  it("誤字候補を結果へ自動混入せず編集距離1に限定する", () => {
    expect(findConservativeSearchSuggestion(items, "フルハネス")).toBe("フルハーネス");
    expect(findConservativeSearchSuggestion(items, "全く別の長い検索語")).toBeNull();
  });

  it("synthetic教材を公式事故と同じ信頼表示にしない", () => {
    const synthetic = items[1]!;
    expect(getSearchTrustState(synthetic).label).toBe("隔離・利用不可");
  });

  it("一致フィールドと表示断片を説明する", () => {
    expect(getSearchMatchDetails(items[0]!, "墜落制止用器具")).toEqual({
      field: "keywords",
      snippet: "墜落制止用器具",
    });
  });
});
