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
describe("HomeScreen — /accidents 表示切替の操作密度と44pxタップ標的", () => {
  it("初期表示を1つのdetailsへ集約し、展開後のボタンも44pxを保つ", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/components/home-screen.tsx"),
      "utf8"
    );
    const tabButtonBlock = src.match(
      /setAccidentActiveTab\(tab\.id\)[\s\S]{0,300}/
    );
    expect(tabButtonBlock).not.toBeNull();
    expect(src).toContain("表示：サイト収録事例");
    expect(src).toContain("<summary");
    expect(tabButtonBlock![0]).toContain("min-h-[44px]");
    expect(tabButtonBlock![0]).toContain("inline-flex");
    expect(tabButtonBlock![0]).toContain("items-center");
  });
});

describe("HomeScreen — 旧法改正チャットのclient安全境界", () => {
  it("PII・緊急・機密preflightをnetwork送信より前に実行する", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/components/home-screen.tsx"),
      "utf8",
    );
    const gate = src.indexOf("runClientAiAction(");
    const outbound = src.indexOf("services.chat.sendMessage");
    expect(gate).toBeGreaterThan(0);
    expect(outbound).toBeGreaterThan(gate);
    expect(src.slice(gate, outbound)).toContain('purpose: "legacy-law-chat-client"');
  });
});
