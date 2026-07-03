import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccidentDatabasePanel } from "./accident-database-panel";
import type { AccidentCase } from "@/lib/types/domain";
import { EasyJapaneseProvider } from "@/contexts/easy-japanese-context";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

const mockCase: AccidentCase = {
  id: "test-001",
  title: "足場からの墜落事故",
  occurredOn: "2026-01-15",
  type: "墜落",
  workCategory: "建設業",
  severity: "重傷",
  summary: "足場の点検不足により作業員が墜落した。",
  mainCauses: ["足場の固定不良"],
  preventionPoints: ["日常点検の徹底"],
  source: { site: "職場のあんぜんサイト", url: "https://example.jp/case/test-001" },
};

function renderPanel(cases: AccidentCase[] = [mockCase]) {
  return render(
    <EasyJapaneseProvider>
      <AccidentDatabasePanel
        cases={cases}
        allCases={cases}
        selectedType="すべて"
        selectedCategory="すべて"
        onSelectType={() => {}}
        onSelectCategory={() => {}}
        status="success"
      />
    </EasyJapaneseProvider>
  );
}

// 柱0: /accidents 事故データベースの主要フィルタ・ページネーション・
// カード操作は初訪の現場ペルソナが最頻繁に触る導線。
// px-3 py-1 (≈28px) 等への退行を防ぐ回帰ガード。
describe("AccidentDatabasePanel 44pxタップ標的", () => {
  it("業種フィルタチップが全て min-h-[44px]", () => {
    renderPanel();
    // 「林業」「化学」は作業カテゴリボタンにも同名で存在するため件数は10以上になる。
    const chips = screen.getAllByRole("button", { name: /^(建設|製造|医療福祉|運輸|林業|食品|小売|清掃|化学|電気)$/ });
    expect(chips.length).toBeGreaterThanOrEqual(10);
    for (const chip of chips) {
      expect(chip.className).toContain("min-h-[44px]");
    }
  });

  it("対象属性・事業所規模ボタンが全て min-h-[44px]", () => {
    renderPanel();
    for (const label of ["すべて", "女性労働者", "高齢者", "外国人", "非正規", "若年", "一般", "全規模", "大企業", "中小企業", "個人事業主"]) {
      const matches = screen.getAllByRole("button", { name: label });
      for (const btn of matches) {
        expect(btn.className).toContain("min-h-[44px]");
      }
    }
  });

  it("作業カテゴリボタンが全て min-h-[44px]", () => {
    renderPanel();
    const btn = screen.getByRole("button", { name: "建設業" });
    expect(btn.className).toContain("min-h-[44px]");
  });

  it("フィルタをリセットボタンは業種未選択時は非表示（絞り込み時のみ出現の挙動を確認）", () => {
    renderPanel();
    expect(screen.queryByText("フィルタをリセット")).toBeNull();
  });

  it("カード内の詳細トグル・詳細ページへ・学習リンク・日誌記録リンクが min-h-[44px]", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: "詳細を見る" }).className).toContain("min-h-[44px]");
    expect(screen.getByRole("link", { name: "→ 詳細ページへ" }).className).toContain("min-h-[44px]");
    expect(screen.getByRole("link", { name: "この事例で学習する" }).className).toContain("min-h-[44px]");
    expect(screen.getByRole("link", { name: "→ 日誌に記録" }).className).toContain("min-h-[44px]");
  });

  it("出典リンクが min-h-[44px]", () => {
    renderPanel();
    const sourceLink = screen.getByRole("link", { name: /出典: 職場のあんぜんサイト/ });
    expect(sourceLink.className).toContain("min-h-[44px]");
  });

  it("ページネーションの前へ/次へボタンが min-h-[44px]", () => {
    const many = Array.from({ length: 45 }, (_, i) => ({ ...mockCase, id: `test-${i}` }));
    renderPanel(many);
    expect(screen.getByRole("button", { name: "前のページへ" }).className).toContain("min-h-[44px]");
    expect(screen.getByRole("button", { name: "次のページへ" }).className).toContain("min-h-[44px]");
  });
});
