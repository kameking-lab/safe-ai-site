import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LawSearchResults } from "./law-search-results";

describe("LawSearchResults の法令フィルタ", () => {
  it("結果を先に示し、大量の法令ボタンを単一selectへ集約する", () => {
    const setSelectedLaw = vi.fn();
    render(
      <LawSearchResults
        query="安全"
        articleNumQuery=""
        selectedLaw="all"
        setSelectedLaw={setSelectedLaw}
        isEn={false}
      />,
    );

    const status = screen.getByRole("status", { name: /いまの状態: 該当/ });
    const selects = screen.getAllByRole("combobox");
    const lawSelect = screen.getByRole("combobox", {
      name: "法令で絞り込む",
    });

    expect(selects).toHaveLength(1);
    expect(
      status.compareDocumentPosition(lawSelect) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "すべての法令" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "労働安全衛生法" }),
    ).toBeNull();

    fireEvent.change(lawSelect, {
      target: { value: "労働安全衛生法" },
    });
    expect(setSelectedLaw).toHaveBeenCalledWith("労働安全衛生法");
  });
});

/**
 * 一次資料抜粋モーダルのフォーカス管理（初期フォーカス・Tabトラップ・閉じた際の復帰）の回帰ガード。
 * role="dialog"/aria-modal/Escapeは既存実装済みだが、キーボード利用者が
 * モーダル外へTabで抜けられる・閉じた後にフォーカスを見失う不具合を是正。
 */
describe("LawSearchResults の一次資料抜粋モーダル", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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
    const trigger = screen.getAllByRole("button", { name: "収録本文を表示" })[0];
    trigger.focus();
    fireEvent.click(trigger);

    const closeButton = screen.getByRole("button", { name: "このダイアログを閉じる" });
    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.activeElement).toBe(trigger);
  });

  it("Tabキーでモーダル内の最初/最後の要素間を循環する（フォーカストラップ）", () => {
    renderResults();
    fireEvent.click(screen.getAllByRole("button", { name: "収録本文を表示" })[0]);

    const closeButton = screen.getByRole("button", { name: "このダイアログを閉じる" });
    const showButton = screen.getByRole("button", { name: "サイト収録本文を表示" });

    showButton.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(showButton);
  });

  it("AI要約と誤表示せず、通信失敗時も収載原文とe-Gov正本確認へ fail-closed する", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    renderResults();

    expect(screen.queryByRole("button", { name: "AI要約" })).toBeNull();
    fireEvent.click(
      screen.getAllByRole("button", { name: "収録本文を表示" })[0],
    );
    fireEvent.click(
      screen.getByRole("button", { name: "サイト収録本文を表示" }),
    );

    expect(
      await screen.findByText(
        /通信に失敗しました。現行の正本はe-Gov法令検索で確認してください。/,
      ),
    ).toBeDefined();
    expect(screen.getByText(/これはAI解説ではありません/)).toBeDefined();
  });
});

// CR2-T2（酷評01縫い目3）: 現場ことば版がある条には「現場ことば版で読む」バッジを併記し、
// 法令ナビの条ページへ深リンクする（getFreshPlainArticle 判定）。
describe("LawSearchResults の現場ことば版バッジ", () => {
  it("hash一致を確認できる安衛則第117条カードに現場ことば版リンクが出る", () => {
    render(
      <LawSearchResults
        query=""
        articleNumQuery="117条"
        selectedLaw="all"
        setSelectedLaw={vi.fn()}
        isEn={false}
      />
    );
    const link = screen.getByRole("link", { name: "現場ことば版で読む" });
    expect(link.getAttribute("href")).toBe("/law-navi/347M50002000032/117");
  });
});
