import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import InquiryForm from "./InquiryForm";
import { LanguageProvider } from "@/contexts/language-context";
import { FuriganaProvider } from "@/contexts/furigana-context";
import { EasyJapaneseProvider } from "@/contexts/easy-japanese-context";

// next/navigation はクライアントフックなのでモック。既定では query なし（一般タブ起動）。
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
}));

// TranslatedPageHeader 配下の RubyText/EasyJapaneseText が各Providerを要求するためラップする。
function renderForm() {
  return render(
    <LanguageProvider>
      <FuriganaProvider>
        <EasyJapaneseProvider>
          <InquiryForm />
        </EasyJapaneseProvider>
      </FuriganaProvider>
    </LanguageProvider>,
  );
}

describe("/contact 柱C-10 コンサル相談CVパス（2タブ化）", () => {
  it("既定は「ご意見・ご質問」タブでカテゴリ選択を表示する", () => {
    renderForm();
    expect(
      screen.getByRole("tab", { name: "ご意見・ご質問" }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getByText("カテゴリ")).toBeDefined();
  });

  it("タブが44pxタップ標的を満たす", () => {
    renderForm();
    for (const tab of screen.getAllByRole("tab")) {
      expect(tab.className).toContain("min-h-[44px]");
    }
  });

  it("「法人・コンサルのご相談」タブへ切替えるとカテゴリ選択が消え、業種別の案内文に変わる", () => {
    renderForm();
    fireEvent.click(screen.getByRole("tab", { name: "法人・コンサルのご相談" }));
    expect(screen.queryByText("カテゴリ")).toBeNull();
    expect(screen.getByText(/コンサル・受託開発・教育コンテンツ制作のご相談/)).toBeDefined();
  });

  it("法人・コンサル相談は堅牢な正規フォームへ統合し旧APIを呼ばない", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderForm();
    fireEvent.click(screen.getByRole("tab", { name: "法人・コンサルのご相談" }));
    const link = screen.getByRole("link", {
      name: "専用の相談フォームを開く",
    });
    expect(link.getAttribute("href")).toBe("/services/automation#consult-form");
    expect(screen.queryByLabelText(/件名/)).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("一般送信は機密情報の注意と明示同意を必須にし、未実装の公開Q&Aを表示しない", () => {
    renderForm();
    expect(screen.getByText(/健康情報、第三者の氏名/)).toBeDefined();
    expect(
      screen.getByRole("checkbox", {
        name: /プライバシーポリシーを確認し/,
      }),
    ).toBeDefined();
    expect(screen.queryByText(/公開Q&A/)).toBeNull();
    expect(screen.getByRole("button", { name: "送信する" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("一般送信はIdempotency-Keyを付け、受付番号だけを成功表示する", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          referenceId: "INQ-20260724-ABCDEF123456",
          receivedAt: "2026-07-24T00:00:00.000Z",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    renderForm();
    fireEvent.change(screen.getByLabelText(/件名/), {
      target: { value: "出典URLの訂正提案" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /^内容/ }), {
      target: { value: "確認した一次資料URLを記載します。" },
    });
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /プライバシーポリシーを確認し/,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "送信する" }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    const [, init] = fetchSpy.mock.calls[0] ?? [];
    expect(init?.method).toBe("POST");
    const headers = new Headers(init?.headers);
    expect(headers.get("idempotency-key")).toMatch(
      /^[a-z0-9]{8,12}\.[A-Za-z0-9-]{16,80}$/,
    );
    expect(
      await screen.findByText("受付番号: INQ-20260724-ABCDEF123456"),
    ).toBeDefined();
    fetchSpy.mockRestore();
  });
});
