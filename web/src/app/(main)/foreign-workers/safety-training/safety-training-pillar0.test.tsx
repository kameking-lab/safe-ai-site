import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { SAFETY_MATERIAL_INDEX } from "@/data/foreign-worker-materials";
import { MATERIAL_LANGUAGES } from "@/types/foreign-worker";
import SafetyTrainingPage from "./page";

// ビルダー（client）が useRouter に依存するためモックする
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

/**
 * 無読テスト（柱0）: 多言語安全教育教材ビルダーを本文を読まず3秒見て、
 * 「いまの状態（規模＝N教材・多言語対応）」と「次にやること（教材を選ぶ）」が言えるか。
 */
describe("/foreign-workers/safety-training 柱0 結論カード（無読）", () => {
  async function renderPage() {
    const ui = await SafetyTrainingPage({ searchParams: Promise.resolve({}) });
    return render(ui);
  }

  it("結論カードが「いまの状態」を担う status ロールで最上部に出る", async () => {
    await renderPage();
    const card = screen.getByRole("status", { name: /いまの状態: 多言語対応/ });
    expect(card).toBeTruthy();
  });

  it("規模（収録教材数）がデカ数字で読める＝実データ件数と一致", async () => {
    await renderPage();
    const card = screen.getByRole("status", { name: /いまの状態/ });
    const total = SAFETY_MATERIAL_INDEX.all.length;
    expect(within(card).getByText(String(total))).toBeTruthy();
    expect(within(card).getByText("教材")).toBeTruthy();
  });

  it("次にやること「教材を選ぶ」が 44px タップ標的でビルダーへ誘導する", async () => {
    await renderPage();
    const action = screen.getByRole("link", { name: /教材を選ぶ/ });
    expect(action.getAttribute("href")).toBe("#material-builder");
    expect(action.className).toContain("min-h-[44px]");
  });

  it("対応言語数チップが言語データ件数と一致して読める", async () => {
    await renderPage();
    const card = screen.getByRole("status", { name: /いまの状態/ });
    expect(
      within(card).getByText(`${MATERIAL_LANGUAGES.length}言語対訳`),
    ).toBeTruthy();
    expect(within(card).getByText("無料")).toBeTruthy();
  });

  it("誘導先アンカー #material-builder がページ内に存在する", async () => {
    const { container } = await renderPage();
    expect(container.querySelector("#material-builder")).toBeTruthy();
  });
});
