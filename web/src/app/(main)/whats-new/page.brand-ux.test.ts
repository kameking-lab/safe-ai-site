import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/app/(main)/whats-new/page.tsx"),
  "utf8",
);

describe("/whats-new compact news entry", () => {
  it("短いH1と1主操作を新着フィードの前に置く", () => {
    const introStart = source.indexOf("<TaskPageIntro");
    const feedStart = source.indexOf("<WhatsNewClient");

    expect(introStart).toBeGreaterThanOrEqual(0);
    expect(feedStart).toBeGreaterThan(introStart);
    expect(source).toContain('title="新着を確認"');
    expect(source).toContain('href: "#news-list"');
    expect(source).toContain('label: "新着一覧を見る"');
    expect(source).toContain('id="news-list"');
  });

  it("チワワ案内役と公式確認・購読情報を残す", () => {
    expect(source).toContain('variant="news-read"');
    expect(source).toContain('alt="新着情報を調べるチワワ案内役"');
    expect(source).toContain("サイト解説と公式原文を分けて表示します");
    expect(source).toContain(
      'summary="RSS購読・メール通知・関連ページ・データ取得日"',
    );
  });
});
