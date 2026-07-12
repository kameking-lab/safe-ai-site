import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { KyAccidentCasesPanel } from "./ky-accident-cases";

/**
 * NIQ-REC1 回帰ガード: KY作業内容→類似労災事例カード提示とワンタップ取り込み。
 * 実データ（getAccidentCasesDataset）を用い、「足場組立」で墜落系の実在事例が
 * 出ること・取り込みで危険行の下書き（onAdopt）が発火することを固定する。
 */
describe("KyAccidentCasesPanel", () => {
  it("作業語が無い（空文字）ときは何も描画しない", () => {
    const { container } = render(<KyAccidentCasesPanel workText="" onAdopt={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("「足場組立」で類似事例の見出しが出て、開くとカードと取り込みボタンが出る", () => {
    render(<KyAccidentCasesPanel workText="足場組立" onAdopt={vi.fn()} />);
    // 折りたたみ見出し（件数付き）が出る
    const toggle = screen.getByRole("button", { name: /この作業に似た労災事例/ });
    expect(toggle).toBeTruthy();
    fireEvent.click(toggle);
    // 発生状況ラベルと取り込みボタンが1件以上出る
    expect(screen.getAllByText("発生状況:").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /危険のポイントへ取り込む/ }).length).toBeGreaterThan(0);
  });

  it("取り込みボタンで onAdopt が危険行の下書きとともに発火する", () => {
    const onAdopt = vi.fn();
    render(<KyAccidentCasesPanel workText="足場組立" onAdopt={onAdopt} />);
    fireEvent.click(screen.getByRole("button", { name: /この作業に似た労災事例/ }));
    fireEvent.click(screen.getAllByRole("button", { name: /危険のポイントへ取り込む/ })[0]);
    expect(onAdopt).toHaveBeenCalledTimes(1);
    const draft = onAdopt.mock.calls[0][0];
    expect(typeof draft.hazard).toBe("string");
    expect(draft.hazard.length).toBeGreaterThan(0);
    expect(draft.likelihood).toBeGreaterThanOrEqual(1);
    expect(draft.severity).toBeGreaterThanOrEqual(1);
  });
});
