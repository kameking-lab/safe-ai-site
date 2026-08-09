import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ChatbotPanel } from "./chatbot-panel";

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
}));

// jsdom は Element.scrollTo 未実装のため、自動スクロールが投げる例外を吸収する
Element.prototype.scrollTo = vi.fn();

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("ChatbotPanel a11y", () => {
  it("reduced motionでは会話の自動スクロールを滑らかに動かさない", async () => {
    const scrollToMock = vi.mocked(Element.prototype.scrollTo);
    scrollToMock.mockClear();
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } satisfies MediaQueryList),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => new Promise(() => {})),
    );
    render(<ChatbotPanel />);

    fireEvent.click(
      screen.getByRole("button", { name: "フォークリフトの資格は？" }),
    );

    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalledWith(
        expect.objectContaining({ behavior: "auto" }),
      );
    });
  });

  it("ストリーミング断片は読み上げず、完了通知用statusだけを保つ", async () => {
    // /api/chatbot/stream を解決させず isSending=true のまま保持し、
    // ストリーミング中プレースホルダの状態を固定して検証する。
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => new Promise(() => {})),
    );
    render(<ChatbotPanel />);

    fireEvent.click(screen.getByRole("button", { name: "足場の手すりは？" }));

    await waitFor(() => {
      expect(
        screen
          .getByRole("region", { name: "安衛法AIとの会話" })
          .getAttribute("aria-busy"),
      ).toBe("true");
    });
    expect(
      document.querySelector('[data-chatbot-answer] [aria-live="polite"]'),
    ).toBeNull();
    expect(document.querySelectorAll('[aria-live="polite"]')).toHaveLength(1);
    expect(
      document.querySelector("[data-chatbot-live-region]")?.textContent,
    ).toBe("");
  });

  it("送信失敗時のエラー表示はrole=alertでスクリーンリーダーに通知される", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);
    render(<ChatbotPanel />);

    fireEvent.click(screen.getByRole("button", { name: "足場の手すりは？" }));

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert.textContent).toContain("自動再送はしていません");
      expect(alert.textContent).toContain("再試行");
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/chatbot/stream");
  });

  it("既存回答の完了通知は次の送信中や失敗時に消えず再通知を誘発しない", async () => {
    let rejectSecondRequest: ((reason?: unknown) => void) | undefined;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        chatbotStream({
          answer: "結論\nフォークリフトの資格は最大荷重で分かれます。",
          substantiveAnswer: "フォークリフトの資格は最大荷重で分かれます。",
          assumptions: [],
          conditions: ["最大荷重"],
          citations: [],
          clarificationQuestion: null,
          quickReplies: [],
          sources: [],
          source_type: "rag",
          requiresHumanReview: true,
        }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<Response>((_resolve, reject) => {
            rejectSecondRequest = reject;
          }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<ChatbotPanel />);

    fireEvent.click(
      screen.getByRole("button", { name: "フォークリフトの資格は？" }),
    );
    await screen.findByText("フォークリフトの資格は最大荷重で分かれます。");

    const liveRegion = document.querySelector("[data-chatbot-live-region]");
    expect(liveRegion?.textContent).toBe("安衛法AIの回答 1 を表示しました。");

    fireEvent.change(screen.getByLabelText("質問入力"), {
      target: { value: "例外は？" },
    });
    fireEvent.click(screen.getByRole("button", { name: "送信" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(
        screen
          .getByRole("region", { name: "安衛法AIとの会話" })
          .getAttribute("aria-busy"),
      ).toBe("true");
    });
    expect(liveRegion?.textContent).toBe("安衛法AIの回答 1 を表示しました。");

    rejectSecondRequest?.(new Error("network down"));
    await screen.findByRole("alert");
    expect(liveRegion?.textContent).toBe("安衛法AIの回答 1 を表示しました。");
  });

  it("PF-031 停止後は状態と明示再試行を示し、自動JSON再POSTしない", async () => {
    const fetchMock = vi.fn().mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<ChatbotPanel />);

    fireEvent.click(screen.getByRole("button", { name: "足場の手すりは？" }));
    fireEvent.click(await screen.findByRole("button", { name: "生成を停止" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("応答を停止しました");
    expect(alert.textContent).toContain("再試行");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/chatbot/stream");
  });
});

function chatbotStream(payload: Record<string, unknown>) {
  const answer = String(payload.answer ?? "");
  return new Response(
    `event: text\ndata: ${JSON.stringify({ chunk: answer })}\n\n` +
      `event: meta\ndata: ${JSON.stringify(payload)}\n\n`,
    { headers: { "content-type": "text/event-stream" } },
  );
}

describe("ChatbotPanel AI safety boundary", () => {
  it("never places a user question into downstream URL query parameters", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/chatbot-panel.tsx"),
      "utf8",
    );

    expect(source).not.toContain("/ky/paper?q=");
    expect(source).not.toContain("/chemical-ra?name=${encodeURIComponent");
    expect(source).not.toContain("/laws?q=${encodeURIComponent");
  });

  it("starts a one-shot in-memory handoff without requiring re-entry or persisting it", async () => {
    const question = "足場の手すり高さは？";
    const consumed = vi.fn();
    const fetchMock = vi.fn().mockImplementation(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ChatbotPanel
        initialQuestion={question}
        onInitialQuestionConsumed={consumed}
      />,
    );

    await waitFor(() => expect(consumed).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(
      (screen.getByLabelText("質問入力") as HTMLTextAreaElement).value,
    ).toBe("");
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain(question);
    expect(window.location.href).not.toContain(encodeURIComponent(question));
    expect(JSON.stringify(window.localStorage)).not.toContain(question);
    expect(JSON.stringify(window.sessionStorage)).not.toContain(question);
  });

  it("re-runs the safety gate for an emergency handoff before network access", async () => {
    const consumed = vi.fn();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ChatbotPanel
        initialQuestion="現場で人が倒れて呼吸がありません"
        onInitialQuestionConsumed={consumed}
      />,
    );

    expect(
      (await screen.findByRole("alert")).getAttribute("data-safety-kind"),
    ).toBe("emergency");
    expect(consumed).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("新しい相談で入力・安全通知・同意・進行中履歴をリセットする", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<ChatbotPanel />);

    const input = screen.getByLabelText("質問入力");
    fireEvent.change(input, { target: { value: "worker@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "送信" }));
    expect(
      (await screen.findByRole("alert")).getAttribute("data-safety-kind"),
    ).toBe("privacy");

    fireEvent.click(screen.getByRole("button", { name: "新しい相談" }));
    expect((input as HTMLTextAreaElement).value).toBe("");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("生成中に新しい相談へ切り替えてもcomposerを直ちに再利用できる", async () => {
    const fetchMock = vi.fn().mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<ChatbotPanel />);

    fireEvent.click(screen.getByRole("button", { name: "足場の手すりは？" }));
    await waitFor(() => {
      expect(
        screen
          .getByRole("region", { name: "安衛法AIとの会話" })
          .getAttribute("aria-busy"),
      ).toBe("true");
    });

    fireEvent.click(screen.getByRole("button", { name: "新しい相談" }));

    const input = screen.getByLabelText("質問入力") as HTMLTextAreaElement;
    expect(input.disabled).toBe(false);
    expect(screen.getByRole("button", { name: "送信" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "生成を停止" })).toBeNull();
    expect(
      screen
        .getByRole("region", { name: "安衛法AIとの会話" })
        .getAttribute("aria-busy"),
    ).toBe("false");
  });

  it.each([
    ["反応がありません", "emergency"],
    ["作業員が倒れて返答ありません。どうする？", "emergency"],
    ["胸を締め付けられるように痛がっています。", "emergency"],
    ["山田 太郎の住所は東京都新宿区西新宿2丁目8番1号", "privacy"],
    ["会社名: 株式会社安全工業", "privacy"],
    ["サトウタロウがフォークリフトを運転します。資格は？", "privacy"],
    ["私、腰が痛くて薬を飲みました。高所作業はできますか？", "privacy"],
    ["新宿区西新宿2-8-1の現場です", "privacy"],
  ])("does not send or persist blocked input: %s", async (input, kind) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<ChatbotPanel />);

    fireEvent.change(screen.getByLabelText("質問入力"), {
      target: { value: input },
    });
    fireEvent.click(screen.getByRole("button", { name: "送信" }));

    const alert = await screen.findByRole("alert");
    expect(alert.getAttribute("data-safety-kind")).toBe(kind);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText(input)).toBeNull();
    for (let index = 0; index < localStorage.length; index += 1) {
      expect(localStorage.getItem(localStorage.key(index)!)).not.toContain(
        input,
      );
    }
  });

  it("server-only safety block removes the user turn and never persists or analyses raw text", async () => {
    const input = "匿名化済みの一般的な足場点検について";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: "安全確認で送信を停止しました。" }),
        {
          status: 422,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<ChatbotPanel />);

    fireEvent.change(screen.getByLabelText("質問入力"), {
      target: { value: input },
    });
    fireEvent.click(screen.getByRole("button", { name: "送信" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "安全確認",
    );
    await waitFor(() => expect(screen.queryByText(input)).toBeNull());
    for (let index = 0; index < localStorage.length; index += 1) {
      expect(localStorage.getItem(localStorage.key(index)!)).not.toContain(
        input,
      );
    }
  });

  it("removes both legacy raw-chat storage keys on open and never serializes them into a new request", async () => {
    localStorage.setItem(
      "chatbot_history_v2",
      JSON.stringify([
        { messages: [{ role: "user", content: "worker@example.com" }] },
      ]),
    );
    localStorage.setItem(
      "anzen_chatbot_active_session_v1",
      JSON.stringify({
        version: 2,
        updatedAt: 1,
        messages: [
          { id: "legacy", role: "user", content: "旧質問の生テキスト" },
        ],
      }),
    );
    const fetchMock = vi.fn().mockImplementation(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    render(<ChatbotPanel />);

    await waitFor(() => {
      expect(localStorage.getItem("chatbot_history_v2")).toBeNull();
      expect(
        localStorage.getItem("anzen_chatbot_active_session_v1"),
      ).toBeNull();
    });
    expect(screen.queryByLabelText("保存した会話を開く")).toBeNull();

    fireEvent.change(screen.getByLabelText("質問入力"), {
      target: { value: "足場の点検方法は？" },
    });
    fireEvent.click(screen.getByRole("button", { name: "送信" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = String(fetchMock.mock.calls[0]?.[1]?.body ?? "");
    expect(body).not.toContain("worker@example.com");
    expect(body).not.toContain("旧質問の生テキスト");
    expect(body).toContain("足場の点検方法は？");
    expect(body).toContain('"privacyConfirmed":true');
    expect(localStorage.length).toBe(0);
  });
});

describe("ChatbotPanel conversation UI", () => {
  it("空状態は質問例3件以下で、compactなcomposerを最初から表示する", () => {
    render(<ChatbotPanel />);

    expect(
      document.querySelectorAll("[data-chatbot-question-chip]"),
    ).toHaveLength(3);
    expect(document.querySelector("[data-chatbot-composer]")).not.toBeNull();
    expect(
      document.querySelector("[data-chatbot-composer]")?.className,
    ).toContain("sticky");
    expect(
      document.querySelector("[data-chatbot-composer]")?.className,
    ).toContain("bottom-0");
    expect(
      document.querySelector("[data-chatbot-composer]")?.className,
    ).toContain("shrink-0");
    expect(screen.getByLabelText("質問入力").getAttribute("rows")).toBe("1");
    expect(
      screen.getByText("個人情報は入力しない", { exact: false }).firstChild
        ?.textContent,
    ).toBe("個人情報は入力しない");
    expect(
      document.querySelectorAll("[data-ui-box]").length,
    ).toBeLessThanOrEqual(1);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("Enterで送信し、Shift+Enterは改行として残す", async () => {
    const fetchMock = vi.fn().mockImplementation(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    render(<ChatbotPanel />);
    const input = screen.getByLabelText("質問入力");

    fireEvent.change(input, { target: { value: "足場の点検方法は？" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it("同じ質問の二重requestを同期的に防ぐ", async () => {
    const fetchMock = vi.fn().mockImplementation(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    render(<ChatbotPanel />);
    const input = screen.getByLabelText("質問入力");
    fireEvent.change(input, { target: { value: "足場の点検方法は？" } });
    const send = screen.getByRole("button", { name: "送信" });

    fireEvent.click(send);
    fireEvent.click(send);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it("広い資格質問もAPIへ送り、回答の後に確認1件とchip最大3件を示す", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      chatbotStream({
        answer:
          "結論\nフォークリフトの運転資格は最大荷重で区分が変わります。\n\n条件\n・最大荷重\n\n次の質問\n最大荷重はどれですか？",
        substantiveAnswer:
          "フォークリフトの運転資格は最大荷重で区分が変わります。最大荷重1トン以上は技能講習、1トン未満は特別教育が主要な分岐です。",
        assumptions: [],
        conditions: ["最大荷重", "運転する場所と作業内容"],
        citations: [],
        clarificationQuestion: "最大荷重はどれですか？",
        quickReplies: [
          { label: "1トン未満", prompt: "最大荷重1トン未満" },
          { label: "1トン以上", prompt: "最大荷重1トン以上" },
          { label: "分からない", prompt: "最大荷重は不明" },
        ],
        sources: [],
        source_type: "rag",
        confidence: "low",
        requiresHumanReview: true,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<ChatbotPanel />);

    fireEvent.click(
      screen.getByRole("button", { name: "フォークリフトの資格は？" }),
    );

    await screen.findByText(/最大荷重1トン以上は技能講習/);
    expect(screen.getAllByText("最大荷重はどれですか？")).toHaveLength(1);
    const liveRegion = document.querySelector("[data-chatbot-live-region]");
    expect(liveRegion?.getAttribute("aria-live")).toBe("polite");
    expect(liveRegion?.getAttribute("aria-atomic")).toBe("true");
    expect(liveRegion?.textContent).toBe("安衛法AIの回答 1 を表示しました。");
    expect(
      screen.getAllByRole("button", { name: /1トン|分からない/ }),
    ).toHaveLength(3);
    expect(
      document.querySelectorAll("[data-chatbot-answer-actions]"),
    ).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("範囲警告は回答後にだけ表示し、通常時の常設警告にしない", async () => {
    const warning =
      "指定条文を検証済み収録正本から一意に特定できないため、公式原文で条件を確認してください。";
    const fetchMock = vi.fn().mockResolvedValue(
      chatbotStream({
        answer:
          "結論\n確認済み資料の範囲では一般的な条件まで説明できます。［1］",
        substantiveAnswer:
          "確認済み資料の範囲では一般的な条件まで説明できます。［1］",
        assumptions: [],
        conditions: ["対象設備の種類"],
        citations: [],
        clarificationQuestion: null,
        quickReplies: [],
        scopeWarnings: [warning],
        sources: [
          {
            law: "労働安全衛生規則（安衛則）",
            article: "第563条",
            text: "高さ二メートル以上の作業場所に関する規定。",
            snippet: "高さ二メートル以上の作業場所",
            url: "https://laws.e-gov.go.jp/law/347M50002000032",
          },
        ],
        source_type: "rag",
        confidence: "low",
        requiresHumanReview: true,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<ChatbotPanel />);

    expect(document.querySelector("[data-chatbot-scope-warning]")).toBeNull();
    fireEvent.change(screen.getByLabelText("質問入力"), {
      target: { value: "収録外かもしれない設備の条件は？" },
    });
    fireEvent.click(screen.getByRole("button", { name: "送信" }));

    await screen.findByText(warning);
    const answer = document.querySelector("[data-chatbot-answer]");
    const conclusionIndex = answer?.textContent?.indexOf(
      "確認済み資料の範囲では一般的な条件まで説明できます。",
    );
    const warningIndex = answer?.textContent?.indexOf(warning);
    const sourceIndex = answer?.textContent?.indexOf("根拠 1件");
    expect(conclusionIndex).toBeGreaterThanOrEqual(0);
    expect(warningIndex).toBeGreaterThan(conclusionIndex ?? -1);
    expect(sourceIndex).toBeGreaterThan(warningIndex ?? -1);
    expect(screen.getByRole("note", { name: "確認が必要" })).toBeDefined();
  });

  it("会話開始後もpanelを親高に収め、履歴とcomposerを重ねない", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => new Promise(() => {})),
    );
    render(<ChatbotPanel />);

    fireEvent.click(screen.getByRole("button", { name: "足場の手すりは？" }));

    await waitFor(() => {
      const panel = document.querySelector(
        '[data-chatbot-panel-state="conversation"]',
      );
      expect(panel?.className).toContain("min-h-0");
      expect(panel?.className).toContain("flex-1");
      expect(panel?.className).toContain("overflow-hidden");
    });
    const history = document.querySelector("[data-chatbot-history]");
    expect(history?.className).toContain("min-h-0");
    expect(history?.className).toContain("flex-1");
    expect(history?.className).toContain("overflow-y-auto");
    expect(history?.getAttribute("role")).toBe("log");
    expect(history?.getAttribute("aria-live")).toBe("off");
    const composer = document.querySelector("[data-chatbot-composer]");
    expect(composer?.className).toContain("shrink-0");
    expect(composer?.className).toContain("sticky");
    expect(composer?.className).toContain("bottom-0");
  });

  it("電気作業の作業主任者follow-upを履歴付きで送り、無関係な分類へ飛ばない", async () => {
    const firstAnswer =
      "結論\n電気作業の資格・教育は作業内容で変わります。\n\n条件\n・配線工事\n・充電部付近の作業\n・設備操作\n\n次の質問\n実際の作業はどれに近いですか？";
    const secondAnswer =
      "結論\n作業主任者は、電気作業全般に共通して選任するものではありません。\n\n条件\n・規則で指定された特定作業か\n\n次の質問\n実際の電気作業はどれに近いですか？";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        chatbotStream({
          answer: firstAnswer,
          substantiveAnswer:
            "電気作業の資格・教育は、配線や設備工事、充電部に触れる・近づく作業、設備の操作・点検で変わります。分かる範囲では、電気作業全般に一つの資格が共通するわけではありません。",
          assumptions: [],
          conditions: ["配線や設備工事", "活線・近接作業", "設備操作・点検"],
          citations: [],
          clarificationQuestion: "実際の作業はどれに近いですか？",
          quickReplies: [
            { label: "配線工事", prompt: "配線工事" },
            { label: "活線・近接", prompt: "充電部付近の作業" },
            { label: "設備操作", prompt: "設備操作・点検" },
          ],
          sources: [],
          source_type: "rag",
          confidence: "low",
          requiresHumanReview: true,
        }),
      )
      .mockResolvedValueOnce(
        chatbotStream({
          answer: secondAnswer,
          substantiveAnswer:
            "「作業主任者」は、電気作業全般に共通して選任するものではなく、各規則で指定された特定作業について必要になります。電気作業の文脈では、まず実際の作業内容を確認します。",
          assumptions: ["直前の『電気作業』を引き継いでいます"],
          conditions: ["配線工事か", "活線・近接作業か", "設備操作か"],
          citations: [],
          clarificationQuestion: "実際の電気作業はどれに近いですか？",
          quickReplies: [
            { label: "配線工事", prompt: "電気作業は配線工事" },
            { label: "活線・近接", prompt: "電気作業は活線・近接作業" },
            { label: "設備操作", prompt: "電気作業は設備操作" },
          ],
          sources: [],
          source_type: "rag",
          confidence: "low",
          requiresHumanReview: true,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<ChatbotPanel />);

    fireEvent.click(screen.getByRole("button", { name: "電気作業の資格は？" }));
    await screen.findByText(/電気作業の資格・教育は、配線や設備工事/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      document.querySelectorAll("[data-chatbot-quick-reply]"),
    ).toHaveLength(3);

    fireEvent.change(screen.getByLabelText("質問入力"), {
      target: { value: "作業主任者" },
    });
    fireEvent.click(screen.getByRole("button", { name: "送信" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await screen.findByText(
      /作業主任者.*電気作業全般に共通して選任するものではなく/,
    );
    const body = JSON.parse(
      String(fetchMock.mock.calls[1]?.[1]?.body ?? "{}"),
    ) as {
      message?: string;
      history?: Array<{ role: string; content: string }>;
    };
    expect(body.message).toBe("作業主任者");
    expect(body.history).toEqual([
      { role: "user", content: "電気作業の資格は？" },
      { role: "assistant", content: firstAnswer },
    ]);
    expect(screen.queryByText("酸欠")).toBeNull();
    expect(screen.queryByText("有機溶剤")).toBeNull();
    expect(screen.queryByText("石綿")).toBeNull();
    expect(
      document.querySelectorAll("[data-chatbot-quick-reply]"),
    ).toHaveLength(3);
    for (const actions of document.querySelectorAll(
      "[data-chatbot-answer-actions]",
    )) {
      expect(actions.querySelectorAll("button").length).toBeLessThanOrEqual(3);
    }
  });

  it("回答は根拠を初期状態で閉じ、回答操作を3件以下にする", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      chatbotStream({
        answer:
          "結論\n高さ2m以上の足場では、墜落のおそれがある箇所に足場種類ごとの墜落防止設備が必要です。わく組足場以外の足場では、手すり等は85cm以上、中桟等は35〜50cmです。［1］［2］\n\n条件\n・足場種類で変わります。\n\n根拠\n・安衛則第563条［1］\n・安衛則第552条［2］\n\n次の質問\n足場の種類は？",
        substantiveAnswer:
          "高さ2m以上の足場では、墜落のおそれがある箇所に足場種類ごとの墜落防止設備が必要です。わく組足場以外の足場では、手すり等は85cm以上、中桟等は35〜50cmです。［1］［2］",
        assumptions: [],
        conditions: ["足場種類で変わります。"],
        sources: [
          {
            law: "労働安全衛生規則（安衛則）",
            article: "第563条",
            text: "高さ二メートル以上の作業場所で、墜落により労働者に危険を及ぼすおそれのある箇所には、わく組足場以外の足場について手すり等及び中桟等を設けること。",
            snippet:
              "高さ二メートル以上／墜落により労働者に危険を及ぼすおそれのある箇所／わく組足場以外の足場　手すり等及び中桟等",
            url: "https://laws.e-gov.go.jp/law/347M50002000032",
          },
          {
            law: "労働安全衛生規則（安衛則）",
            article: "第552条",
            text: "手すり等は高さ八十五センチメートル以上、中桟等は高さ三十五センチメートル以上五十センチメートル以下の設備をいう。",
            snippet:
              "高さ八十五センチメートル以上の手すり等／高さ三十五センチメートル以上五十センチメートル以下の中桟等",
            url: "https://laws.e-gov.go.jp/law/347M50002000032",
          },
        ],
        citations: [
          {
            lawShort: "安衛則",
            fullName: "労働安全衛生規則",
            articleNum: "第563条",
            articleTitle: "作業床",
            issuer: "厚生労働省",
            effectiveDate: "平成21年6月1日施行",
            searchHref: "/law-search?q=安衛則第563条",
            egovHref: "https://laws.e-gov.go.jp/law/347M50002000032",
          },
          {
            lawShort: "安衛則",
            fullName: "労働安全衛生規則",
            articleNum: "第552条",
            articleTitle: "架設通路",
            issuer: "厚生労働省",
            effectiveDate: "平成21年6月1日施行",
            searchHref: "/law-search?q=安衛則第552条",
            egovHref: "https://laws.e-gov.go.jp/law/347M50002000032",
          },
        ],
        clarificationQuestion: "足場の種類は？",
        quickReplies: [
          { label: "枠組足場", prompt: "枠組足場" },
          { label: "単管足場", prompt: "単管足場" },
          { label: "分からない", prompt: "足場種類は不明" },
        ],
        source_type: "rag",
        confidence: "low",
        requiresHumanReview: true,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<ChatbotPanel />);

    fireEvent.change(screen.getByLabelText("質問入力"), {
      target: { value: "足場の手すり高さは？" },
    });
    fireEvent.click(screen.getByRole("button", { name: "送信" }));

    await screen.findByText(/85cm以上/);
    expect(
      screen.getByRole("heading", { name: /安衛法AIの回答/, level: 2 }),
    ).toBeDefined();
    for (const section of ["結論", "条件で変わる点", "確認"]) {
      expect(
        screen.getByRole("heading", { name: section, level: 3 }),
      ).toBeDefined();
    }
    expect(
      screen.queryByRole("heading", { name: "根拠", level: 3 }),
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "次の質問", level: 3 }),
    ).toBeNull();
    expect(screen.getAllByText("足場の種類は？")).toHaveLength(1);
    expect(
      document.querySelectorAll("[data-chatbot-quick-reply]"),
    ).toHaveLength(3);
    const details = document.querySelector("[data-chatbot-source-details]");
    expect(details).not.toBeNull();
    expect((details as HTMLDetailsElement).open).toBe(false);
    const actions = document.querySelector("[data-chatbot-answer-actions]");
    expect(actions?.querySelectorAll("button").length).toBeLessThanOrEqual(3);
  });

  it("長文回答と根拠が同時にある場合も初期表示の操作を3件以下にする", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      chatbotStream({
        answer: `結論\n${"足場の条件を確認して手すりを設けます。［1］".repeat(45)}\n\n根拠\n・安衛則第563条［1］`,
        sources: [
          {
            law: "労働安全衛生規則（安衛則）",
            article: "第563条",
            text: "高さ二メートル以上の作業場所で、墜落により労働者に危険を及ぼすおそれのある箇所には、わく組足場以外の足場について手すり等及び中桟等を設けること。",
            snippet:
              "高さ二メートル以上／墜落により労働者に危険を及ぼすおそれのある箇所／わく組足場以外の足場　手すり等及び中桟等",
            url: "https://laws.e-gov.go.jp/law/347M50002000032",
          },
        ],
        source_type: "rag",
        confidence: "low",
        requiresHumanReview: true,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<ChatbotPanel />);

    fireEvent.change(screen.getByLabelText("質問入力"), {
      target: { value: "足場の手すり高さを詳しく教えて" },
    });
    fireEvent.click(screen.getByRole("button", { name: "送信" }));

    await screen.findByText("詳しく読む");
    const answer = document.querySelector("[data-chatbot-answer]");
    expect(answer).not.toBeNull();
    expect(answer?.textContent).toContain("根拠 1件");
    expect(answer?.textContent).not.toContain("条件を追加");
    expect(
      answer?.querySelectorAll("summary, [data-chatbot-answer-actions] button")
        .length,
    ).toBeLessThanOrEqual(3);
  });

  it("確認済み通達を法令根拠と分け、折りたたみ内から公式PDFと該当抜粋へ到達できる", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      chatbotStream({
        answer: "結論\n熱中症の報告体制と悪化防止手順を整えて周知します。［1］",
        sources: [
          {
            law: "労働安全衛生規則（安衛則）",
            article: "第612条の2",
            text: "報告体制及び必要な措置の内容と実施手順を定める。",
            snippet: "報告体制及び必要な措置の内容と実施手順",
            url: "https://laws.e-gov.go.jp/law/347M50002000032",
          },
        ],
        attachedNotices: [
          {
            id: "mhlw-notice-0014",
            docType: "通達",
            title: "労働安全衛生規則の一部を改正する省令の施行等について",
            noticeNumber: "基発0520第6号",
            issuedDateRaw: "令和7年5月20日",
            issuer: "厚生労働省労働基準局長",
            bindingLevel: "indirect",
            detailUrl:
              "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000116133.html",
            sourceUrl:
              "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000116133.html",
            pdfUrl: "https://www.mhlw.go.jp/content/11303000/001490911.pdf",
            category: "heat-stroke",
            source: "A",
            evidenceRole: "related-material",
            locator: "PDF 2ページ 第3 1(1)イ",
            excerpt: "湿球黒球温度（WBGT）が28度以上又は気温が31度以上の場所",
            independentlyCheckedAt: "2026-08-02",
          },
        ],
        attachedLeaflets: [
          {
            id: "mhlw-leaflet-0251",
            title: "働く人の今すぐ使える熱中症ガイド",
            publisher: "厚生労働省",
            publishedDateRaw: "令和5年3月",
            target: "general",
            category: "occupational-health",
            sourceUrl:
              "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/gyousei/anzen/index.html",
            pdfUrl: "https://www.mhlw.go.jp/content/001103539.pdf",
            detailUrl: null,
            source: "A",
          },
        ],
        source_type: "rag",
        confidence: "medium",
        requiresHumanReview: true,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<ChatbotPanel />);

    fireEvent.change(screen.getByLabelText("質問入力"), {
      target: { value: "安衛則第612条の2の熱中症対応は？" },
    });
    fireEvent.click(screen.getByRole("button", { name: "送信" }));

    await screen.findByText(/報告体制と悪化防止手順/);
    const details = document.querySelector(
      "[data-chatbot-source-details]",
    ) as HTMLDetailsElement | null;
    expect(details).not.toBeNull();
    expect(details?.open).toBe(false);
    expect(details?.textContent).toContain("根拠 1件・関連資料 2件");
    expect(details?.textContent).toContain("関連資料（条文本文とは別）");
    expect(details?.textContent).toContain("基発0520第6号");
    expect(details?.textContent).toContain("PDF 2ページ 第3 1(1)イ");
    expect(details?.textContent).toContain("WBGT");
    expect(
      details?.querySelector('[data-evidence-role="related-material"]'),
    ).not.toBeNull();
    expect(
      screen.getByRole("link", { name: "公式PDF" }).getAttribute("href"),
    ).toBe("https://www.mhlw.go.jp/content/11303000/001490911.pdf");
    expect(details?.textContent).toContain(
      "公式リーフレット（条文本文とは別）",
    );
    expect(details?.textContent).toContain("働く人の今すぐ使える熱中症ガイド");
    expect(
      screen.getByRole("link", { name: "公式資料" }).getAttribute("href"),
    ).toBe("https://www.mhlw.go.jp/content/001103539.pdf");
  });

  it("公式リーフレットだけでも根拠欄を表示し、厚労省以外のURLはリンクにしない", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      chatbotStream({
        answer: "結論\n熱中症対策の公式資料を確認できます。",
        attachedLeaflets: [
          {
            id: "mhlw-leaflet-safe",
            title: "安全な公式リーフレット",
            publisher: "厚生労働省",
            publishedDateRaw: "令和7年6月",
            target: "general",
            category: "heat-stroke",
            sourceUrl: "https://www.mhlw.go.jp/safe-leaflet.html",
            pdfUrl: "https://www.mhlw.go.jp/content/safe-leaflet.pdf",
            detailUrl: null,
            source: "A",
          },
          {
            id: "mhlw-leaflet-untrusted",
            title: "不正な外部URLの資料",
            publisher: "厚生労働省",
            publishedDateRaw: null,
            target: "general",
            category: "heat-stroke",
            sourceUrl: "https://example.com/not-official.html",
            pdfUrl: "javascript:alert(1)",
            detailUrl: "https://mhlw.go.jp.evil.example/phishing",
            source: "A",
          },
        ],
        source_type: "rag",
        confidence: "medium",
        requiresHumanReview: true,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<ChatbotPanel />);

    fireEvent.change(screen.getByLabelText("質問入力"), {
      target: { value: "熱中症の公式資料は？" },
    });
    fireEvent.click(screen.getByRole("button", { name: "送信" }));

    await screen.findByText(/熱中症対策の公式資料/);
    const details = document.querySelector(
      "[data-chatbot-source-details]",
    ) as HTMLDetailsElement | null;
    expect(details).not.toBeNull();
    expect(details?.textContent).toContain("根拠 0件・関連資料 2件");
    expect(details?.textContent).toContain("安全な公式リーフレット");
    expect(details?.textContent).toContain("不正な外部URLの資料");
    expect(screen.getAllByRole("link", { name: "公式資料" })).toHaveLength(1);
    expect(
      screen.getByRole("link", { name: "公式資料" }).getAttribute("href"),
    ).toBe("https://www.mhlw.go.jp/content/safe-leaflet.pdf");
  });
});
