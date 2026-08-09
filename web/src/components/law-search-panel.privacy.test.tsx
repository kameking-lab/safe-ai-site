import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LawSearchPanel } from "./law-search-panel";
import {
  TransientQueryBridgeProvider,
  useTransientQueryBridge,
} from "./home-safety-cockpit/transient-query-bridge";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
}));

vi.mock("next/dynamic", () => ({
  default: () => () => <div data-testid="law-search-results" />,
}));

afterEach(() => {
  window.history.replaceState({}, "", "/");
  window.localStorage.clear();
  window.sessionStorage.clear();
  navigation.push.mockReset();
  delete document.body.dataset.pendingChatQuestion;
});

function PendingChatQuestionProbe() {
  const { peekChatQuestion } = useTransientQueryBridge();
  return (
    <button
      type="button"
      onClick={() => {
        document.body.dataset.pendingChatQuestion =
          peekChatQuestion()?.question ?? "";
      }}
    >
      一時質問を確認
    </button>
  );
}

function renderPanel() {
  return render(
    <TransientQueryBridgeProvider>
      <LawSearchPanel />
      <PendingChatQuestionProbe />
    </TransientQueryBridgeProvider>,
  );
}

describe("LawSearchPanel URL privacy", () => {
  it("初期の検索例を自由入力を補助する3件に限定する", () => {
    renderPanel();
    expect(
      screen.getByRole("navigation", { name: "検索例" }).querySelectorAll("button"),
    ).toHaveLength(3);
  });

  it("入力中・送信後・質問例選択後も任意本文をURLへ書かない", () => {
    window.history.replaceState({}, "", "/law-search?law=all");
    const { container } = renderPanel();
    const keyword = "山田太郎 新宿A現場の足場";
    const query = screen.getByRole("searchbox", {
      name: "法令フリーワード検索",
    });

    fireEvent.change(query, { target: { value: keyword } });
    expect(window.location.search).toBe("?law=all");
    fireEvent.submit(container.querySelector("form")!);
    expect(window.location.search).toBe("?law=all");
    expect(window.location.href).not.toContain(encodeURIComponent(keyword));

    fireEvent.click(screen.getByRole("button", { name: "安衛法 第61条" }));
    expect(window.location.search).toBe("?law=all");
    expect((query as HTMLInputElement).value).toBe("第61条");
  });

  it("JavaScript無効時にもGET成功欄にならないフォーム構造を保つ", () => {
    const { container } = renderPanel();
    const form = container.querySelector("form")!;
    expect(form.hasAttribute("action")).toBe(false);
    expect(form.hasAttribute("method")).toBe(false);
    for (const input of container.querySelectorAll("input")) {
      expect(input.hasAttribute("name")).toBe(false);
    }
  });

  it("検索語をURLやstorageへ出さず、一回限りのmemory handoffでチャットへ渡す", () => {
    const question = "電気点検に資格いる？";
    renderPanel();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "法令フリーワード検索" }),
      { target: { value: question } },
    );

    const link = screen.getByRole("link", {
      name: "この内容で安衛法AIに質問",
    });
    expect(link.getAttribute("href")).toBe("/chatbot");
    expect(link.className).toContain("min-h-11");
    expect(link.getAttribute("href")).not.toContain(encodeURIComponent(question));
    fireEvent.click(link);

    expect(navigation.push).toHaveBeenCalledWith("/chatbot");
    fireEvent.click(screen.getByRole("button", { name: "一時質問を確認" }));
    expect(document.body.dataset.pendingChatQuestion).toBe(question);
    expect(window.location.href).not.toContain(encodeURIComponent(question));
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
