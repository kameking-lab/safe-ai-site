import { describe, it, expect } from "vitest";
import { buildRssXml, escapeXml, toRfc822 } from "@/lib/rss";
import type { NewsHubItem } from "@/lib/news-hub-types";

const items: NewsHubItem[] = [
  {
    id: "x1",
    category: "law-revision",
    title: "テスト改正 <&\"'>",
    summary: "概要 & テスト",
    date: "2026-05-20",
    url: "https://laws.e-gov.go.jp/law/347AC0000000057",
    badge: "施行前（あと10日）",
  },
];

describe("P1-3 RSS生成", () => {
  it("XMLエスケープが正しい", () => {
    expect(escapeXml(`<&"'>`)).toBe("&lt;&amp;&quot;&apos;&gt;");
  });

  it("RFC822日付に変換する", () => {
    expect(toRfc822("2026-05-20")).toMatch(/2026/);
  });

  it("valid RSS 2.0 構造（channel/item/必須要素）を出力する", () => {
    const xml = buildRssXml(items, {
      title: "テストフィード",
      description: "説明",
      selfPath: "/whats-new",
      feedPath: "/feed/news.xml",
    });
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain("<channel>");
    expect(xml).toContain("<item>");
    expect(xml).toContain("<title>テストフィード</title>");
    expect(xml).toContain("<pubDate>");
    expect(xml).toContain('<guid isPermaLink="false">x1</guid>');
    // 生のタイトルがエスケープされて含まれる（生の < を含まない item title）
    expect(xml).toContain("テスト改正 &lt;&amp;&quot;&apos;&gt;");
    // 出典リンクがitemのlinkに入る
    expect(xml).toContain("<link>https://laws.e-gov.go.jp/law/347AC0000000057</link>");
  });
});
