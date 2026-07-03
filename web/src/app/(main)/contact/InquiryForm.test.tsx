import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

  it("法人・コンサル相談タブではお名前・メールが必須になり、同一エンドポイント(/api/inquiry)へ送信する", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);

    renderForm();
    fireEvent.click(screen.getByRole("tab", { name: "法人・コンサルのご相談" }));
    const nameInput = screen.getByLabelText(/お名前・会社名/);
    const emailInput = screen.getByLabelText(/メールアドレス/);
    expect((nameInput as HTMLInputElement).required).toBe(true);
    expect((emailInput as HTMLInputElement).required).toBe(true);

    fireEvent.change(screen.getByLabelText(/件名/), { target: { value: "テスト相談" } });
    fireEvent.change(screen.getByLabelText(/内容/), { target: { value: "テスト内容" } });
    fireEvent.change(nameInput, { target: { value: "山田太郎" } });
    fireEvent.change(emailInput, { target: { value: "yamada@example.co.jp" } });
    fireEvent.click(screen.getByRole("button", { name: "送信する" }));

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/inquiry",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body));
    expect(body.category).toBe("business");

    fetchSpy.mockRestore();
  });
});
