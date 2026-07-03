import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

/**
 * 柱0補充 — /accidents 主タブ切替(6ボタン: 全件検索/死亡災害/業種別ランキング/
 * MHLW実データ分析/サイト収録事例/詳細事例)の44pxタップ標的回帰ガード。
 *
 * HomeScreen は動的import・SWR等の依存が重く jsdom フルレンダーが困難なため、
 * page-json-ld.test.tsx と同じソーステキスト検査方式を用いる。
 */
describe("HomeScreen — /accidents タブ切替の44pxタップ標的", () => {
  it("タブボタンのclassNameが min-h-[44px] を含む", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/components/home-screen.tsx"),
      "utf8"
    );
    const tabButtonBlock = src.match(
      /onClick=\{\(\) => setAccidentActiveTab\(tab\.id\)\}[\s\S]{0,200}/
    );
    expect(tabButtonBlock).not.toBeNull();
    expect(tabButtonBlock![0]).toContain("min-h-[44px]");
    expect(tabButtonBlock![0]).toContain("inline-flex");
    expect(tabButtonBlock![0]).toContain("items-center");
  });
});
