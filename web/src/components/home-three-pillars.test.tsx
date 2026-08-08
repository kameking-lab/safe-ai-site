import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HomeThreePillars } from "./home-three-pillars";
import type { AccidentCase } from "@/lib/types/domain";
import type { HomeWeatherState } from "@/lib/home-three-pillars-data";

const fatal: AccidentCase = {
  id: "a1",
  title: "足場からの墜落死亡事故",
  occurredOn: "2026-01-01",
  type: "墜落",
  workCategory: "建設業",
  severity: "死亡",
  summary: "出典: example.com/report",
  mainCauses: ["安全帯未使用"],
  preventionPoints: ["安全帯の着用徹底"],
  source: { site: "職場のあんぜんサイト", url: "https://example.com/report" },
};

const weather: HomeWeatherState = {
  status: "unavailable",
  warnings: [],
  fetchedAt: null,
  targetAt: null,
  checkedAt: "2026-07-24T00:00:00.000Z",
  sourceUrl: "https://www.jma.go.jp/bosai/warning/",
  reason: "invalid_snapshot",
};

// 柱0: トップの死亡事故パネルは初訪の一人親方が最初にタップする導線。
// AlertGenerator送信ボタン・関連リンク・出典リンク・エラー時の再試行/連絡導線が
// 44px 未満だった既存欠陥の回帰ガード。
describe("HomeThreePillars 柱0 44pxタップ標的", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("「出典区分付き事故検索へ」リンクが min-h-[44px]", () => {
    render(<HomeThreePillars fatal={fatal} lawRevisions={[]} weather={weather} />);
    const link = screen.getByRole("link", { name: /出典区分付き事故検索へ/ });
    expect(link.className).toContain("min-h-[44px]");
  });

  it("出典・報道URLを開くリンクが min-h-[44px]", () => {
    render(<HomeThreePillars fatal={fatal} lawRevisions={[]} weather={weather} />);
    const link = screen.getByRole("link", { name: /出典・報道URLを開く/ });
    expect(link.className).toContain("min-h-[44px]");
  });

  it("未検証のAI朝礼文生成を出さず、人間確認手順を44pxで開ける", () => {
    render(<HomeThreePillars fatal={fatal} lawRevisions={[]} weather={weather} />);
    expect(screen.queryByRole("button", { name: /注意喚起文を作成/ })).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    const summary = screen.getByText(/事故情報を朝礼で扱う前の確認手順/);
    expect(summary.className).toContain("min-h-[44px]");
  });

  it("人間確認手順から今日の安全とKYへ44px導線を提供する", () => {
    render(<HomeThreePillars fatal={fatal} lawRevisions={[]} weather={weather} />);
    expect(screen.getByRole("link", { name: /今日の安全を確認/ }).className).toContain(
      "min-h-[44px]",
    );
    expect(screen.getByRole("link", { name: /KYを開始/ }).className).toContain(
      "min-h-[44px]",
    );
  });

  it("描画だけで外部AIや任意APIへ通信しない", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<HomeThreePillars fatal={fatal} lawRevisions={[]} weather={weather} />);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("「出典区分付き事故検索へ」主CTAリンクが min-h-[44px]", () => {
    render(<HomeThreePillars fatal={fatal} lawRevisions={[]} weather={weather} />);
    const link = screen.getByRole("link", { name: /出典区分付き事故検索へ/ });
    expect(link.className).toContain("min-h-[44px]");
  });

  it("「気象リスク詳細を見る」主CTAリンクが min-h-[44px]", () => {
    render(<HomeThreePillars fatal={fatal} lawRevisions={[]} weather={weather} />);
    const link = screen.getByRole("link", { name: /気象リスク詳細を見る/ });
    expect(link.className).toContain("min-h-[44px]");
  });

  it("気象が取得不能のとき安全・警報なしと断定せず気象庁へ案内する", () => {
    render(<HomeThreePillars fatal={fatal} lawRevisions={[]} weather={weather} />);
    expect(screen.getByText(/取得不能・判断停止/)).toBeTruthy();
    expect(screen.getByText(/警報状態は判断できません/)).toBeTruthy();
    expect(screen.queryByText(/警報・注意報なし/)).toBeNull();
    expect(screen.queryByText(/特別な警報・注意報はありません/)).toBeNull();
    const official = screen.getByRole("link", {
      name: /気象庁の警報・注意報を確認/,
    });
    expect(official.getAttribute("href")).toBe(
      "https://www.jma.go.jp/bosai/warning/",
    );
    expect(official.className).toContain("min-h-[44px]");
  });

  it("「法改正一覧を見る」主CTAリンクが min-h-[44px]", () => {
    render(<HomeThreePillars fatal={fatal} lawRevisions={[]} weather={weather} />);
    const link = screen.getByRole("link", { name: /法改正一覧を見る/ });
    expect(link.className).toContain("min-h-[44px]");
  });
});
