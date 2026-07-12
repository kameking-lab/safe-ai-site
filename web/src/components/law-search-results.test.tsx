import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LawSearchResults } from "./law-search-results";

/**
 * AI要約モーダルのフォーカス管理（初期フォーカス・Tabトラップ・閉じた際の復帰）の回帰ガード（2026-07-04）。
 * role="dialog"/aria-modal/Escapeは既存実装済みだが、キーボード利用者が
 * モーダル外へTabで抜けられる・閉じた後にフォーカスを見失う不具合を是正。
 */
describe("LawSearchResults の AI要約モーダル フォーカス管理", () => {
  function renderResults() {
    render(
      <LawSearchResults
        query="安全"
        articleNumQuery=""
        selectedLaw="all"
        setSelectedLaw={vi.fn()}
        isEn={false}
      />
    );
  }

  it("開いた際に閉じるボタンへ初期フォーカスし、Escapeで閉じた際は起動元ボタンへ復帰する", () => {
    renderResults();
    const trigger = screen.getAllByRole("button", { name: "AI要約" })[0];
    trigger.focus();
    fireEvent.click(trigger);

    const closeButton = screen.getByRole("button", { name: "このダイアログを閉じる" });
    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.activeElement).toBe(trigger);
  });

  it("Tabキーでモーダル内の最初/最後の要素間を循環する（フォーカストラップ）", () => {
    renderResults();
    fireEvent.click(screen.getAllByRole("button", { name: "AI要約" })[0]);

    const closeButton = screen.getByRole("button", { name: "このダイアログを閉じる" });
    const generateButton = screen.getByRole("button", { name: "AI要約を生成する" });

    generateButton.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(generateButton);
  });
});

// CR2-T2（酷評01縫い目3）: 現場ことば版がある条には「現場ことば版で読む」バッジを併記し、
// 法令ナビの条ページへ深リンクする（getFreshPlainArticle 判定）。
describe("LawSearchResults の現場ことば版バッジ", () => {
  it("安衛則第563条（足場）カードに現場ことば版リンクが出る", () => {
    render(
      <LawSearchResults
        query=""
        articleNumQuery="563条"
        selectedLaw="all"
        setSelectedLaw={vi.fn()}
        isEn={false}
      />
    );
    const link = screen.getByRole("link", { name: "現場ことば版で読む" });
    expect(link.getAttribute("href")).toBe("/law-navi/347M50002000032/563");
  });
});
