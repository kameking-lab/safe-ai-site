import { describe, expect, it, vi, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RiskPredictionPanel } from "./risk-prediction-panel";
import type { AccidentCase } from "@/lib/types/domain";

/**
 * 検索実行時のローディングフィードバック欠落の回帰ガード（2026-07-04）。
 * 従来は事故DBの遅延読み込み中に何の表示も無く「反応していない」ように見えた。
 */
vi.mock("@/components/mhlw-similar-cases-panel", () => ({
  MhlwSimilarCasesPanel: () => null,
}));

const CASE: AccidentCase = {
  id: "c1",
  title: "足場からの墜落災害",
  occurredOn: "2024-01-01",
  type: "墜落",
  workCategory: "建設業",
  severity: "重傷",
  summary: "足場の組立中に墜落した。",
  mainCauses: ["安全帯未使用"],
  preventionPoints: ["安全帯の使用徹底"],
};

let resolvers: Array<(v: AccidentCase[]) => void> = [];
vi.mock("@/data/mock/accident-cases", () => ({
  getAccidentCasesDataset: () =>
    new Promise<AccidentCase[]>((resolve) => {
      resolvers.push(resolve);
    }),
}));

// jsdom は scrollIntoView 未実装のため、検索完了後の自動スクロールでエラーにならないようスタブする
Element.prototype.scrollIntoView = vi.fn();

afterEach(() => {
  resolvers = [];
  vi.restoreAllMocks();
});

describe("RiskPredictionPanel の検索ローディング表示", () => {
  it("検索実行中は「検索中」の状態表示を出し、完了後は判定結果に切り替わる", async () => {
    render(<RiskPredictionPanel />);

    // マウント時の初回データロード（傾向分析タブ用）を解決
    await waitFor(() => expect(resolvers.length).toBeGreaterThanOrEqual(1));
    act(() => resolvers[0]([CASE]));

    const textarea = await screen.findByLabelText("作業内容");
    fireEvent.change(textarea, { target: { value: "足場" } });
    fireEvent.click(screen.getByRole("button", { name: /検索/ }));

    expect(await screen.findByTestId("risk-searching")).toBeTruthy();
    expect(screen.queryByTestId("risk-conclusion")).toBeNull();

    await waitFor(() => expect(resolvers.length).toBeGreaterThanOrEqual(2));
    act(() => resolvers[1]([CASE]));

    await waitFor(() => expect(screen.queryByTestId("risk-searching")).toBeNull());
    expect(await screen.findByTestId("risk-conclusion")).toBeTruthy();
  });
});
