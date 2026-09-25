// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getSafetyImageTheme } from "@/data/safety-image-library";
import { SafetyImageEditor } from "./safety-image-editor";

describe("SafetyImageEditor", () => {
  it("selects several Japanese-labelled languages, edits them together and resets", () => {
    const theme = getSafetyImageTheme("helmet-required");
    if (!theme) throw new Error("theme missing");
    render(<SafetyImageEditor theme={theme} />);

    const japanese = screen.getByLabelText("表示する文字（日本語）") as HTMLTextAreaElement;
    expect(japanese.value).toBe("保護帽を着用");
    fireEvent.click(screen.getByLabelText("英語"));
    fireEvent.click(screen.getByLabelText("ベトナム語"));
    fireEvent.click(screen.getByLabelText("中国語（簡体）"));
    const english = screen.getByLabelText("表示する文字（英語）") as HTMLTextAreaElement;
    expect(english.value).toBe("Wear a safety helmet");
    expect(english.getAttribute("lang")).toBe("en");
    expect(screen.getByRole("img", { name: /^文字編集プレビュー:/u }).getAttribute("lang")).toBe("ja");
    expect(screen.getAllByText("Đội mũ bảo hộ").length).toBeGreaterThan(0);
    expect(screen.getAllByText("佩戴安全帽").length).toBeGreaterThan(0);
    expect(document.querySelector('svg[role="img"] text[lang="en"]')).not.toBeNull();
    expect(document.querySelector('svg[role="img"] text[lang="vi"]')).not.toBeNull();
    expect(document.querySelector('svg[role="img"] text[lang="zh-CN"]')).not.toBeNull();
    expect(document.querySelector('svg[role="img"] text[lang="zh-CN"]')?.getAttribute("style")).toContain("Noto Sans CJK SC");
    fireEvent.change(english, { target: { value: "CUSTOM SAFETY MESSAGE" } });
    expect(screen.getAllByText("CUSTOM SAFETY MESSAGE").length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByLabelText("大")[0]);
    fireEvent.click(screen.getAllByLabelText("中央")[0]);
    fireEvent.click(screen.getByLabelText("背景帯"));
    fireEvent.click(screen.getByLabelText("チワワ・©"));
    expect(screen.queryByAltText("安全AIポータルのチワワ")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "元に戻す" }));
    expect(japanese.value).toBe("保護帽を着用");
    expect((screen.getByLabelText("英語") as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText("背景帯") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("チワワ・©") as HTMLInputElement).checked).toBe(true);
    expect(screen.getByAltText("安全AIポータルのチワワ")).not.toBeNull();
  });

  it("supports numeric templates without placing user text in a GET URL", () => {
    const theme = getSafetyImageTheme("site-speed-limit");
    if (!theme) throw new Error("theme missing");
    render(<SafetyImageEditor theme={theme} />);
    fireEvent.click(screen.getByLabelText("インドネシア語"));
    expect(screen.queryByLabelText("単位")).toBeNull();
    expect(screen.getByText("各言語の既定単位を使います")).not.toBeNull();
    expect(screen.getByLabelText("言語ごとの単位").textContent).toContain("日本語：km/h");
    expect(screen.getByLabelText("言語ごとの単位").textContent).toContain("インドネシア語：km/jam");
    fireEvent.click(screen.getByLabelText("日本語"));
    expect((screen.getByLabelText("単位") as HTMLInputElement).value).toBe("km/jam");
    fireEvent.change(screen.getByLabelText("数値・連絡先"), { target: { value: "8" } });
    expect(screen.getAllByText(/8 km\/jam/u).length).toBeGreaterThan(0);
    const downloadButton = screen.getByRole("button", { name: "この看板をダウンロード" });
    expect(downloadButton.hasAttribute("disabled")).toBe(false);
    expect(document.body.innerHTML).not.toContain("8%20km");
  });

  it("keeps an edited numeric value at the registry placeholder position", () => {
    const theme = getSafetyImageTheme("work-radius-no-entry");
    if (!theme) throw new Error("theme missing");
    render(<SafetyImageEditor theme={theme} />);
    fireEvent.change(screen.getByLabelText("数値・連絡先"), { target: { value: "8" } });
    expect(screen.getAllByText("作業半径 8 m以内 立入禁止").length).toBeGreaterThan(0);
  });

  it("offers the localized accident-free unit without changing its radio groups", () => {
    const theme = getSafetyImageTheme("accident-free-record");
    if (!theme) throw new Error("theme missing");
    render(<SafetyImageEditor theme={theme} />);
    const groups = new Map<string, number>();
    for (const radio of screen.getAllByRole("radio") as HTMLInputElement[]) {
      groups.set(radio.name, (groups.get(radio.name) ?? 0) + 1);
    }
    expect([...groups.values()].filter((count) => count === 3).length).toBeGreaterThanOrEqual(4);
    expect((screen.getByLabelText("単位") as HTMLInputElement).value).toBe("日");
    fireEvent.click(screen.getByLabelText("ベトナム語"));
    fireEvent.click(screen.getByLabelText("日本語"));
    expect((screen.getByLabelText("単位") as HTMLInputElement).value).toBe("ngày");
    fireEvent.click(screen.getByLabelText("中国語（簡体）"));
    fireEvent.click(screen.getByLabelText("ベトナム語"));
    expect((screen.getByLabelText("単位") as HTMLInputElement).value).toBe("天");
  });

  it("uses the shared fit model instead of clipping maximum custom text", () => {
    const theme = getSafetyImageTheme("helmet-required");
    if (!theme) throw new Error("theme missing");
    const { container } = render(<SafetyImageEditor theme={theme} />);
    const textArea = container.querySelector('textarea[maxlength="180"]');
    const large = container.querySelector('input[type="radio"][value="large"]');
    const range = container.querySelector('input[type="range"]');
    if (!(textArea instanceof HTMLTextAreaElement) || !(large instanceof HTMLInputElement) || !(range instanceof HTMLInputElement)) {
      throw new Error("editor boundary controls missing");
    }
    fireEvent.change(textArea, { target: { value: "W".repeat(180) } });
    fireEvent.click(large);
    fireEvent.change(range, { target: { value: "1.8" } });
    expect(container.querySelector('[data-preview-fit="pass"]')).not.toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();

    fireEvent.change(textArea, {
      target: { value: "安全確認を行い異常時は作業中止して責任者へ連絡".repeat(4).slice(0, 180) },
    });
    const vertical = container.querySelector('input[type="radio"][value="vertical"]');
    if (!(vertical instanceof HTMLInputElement)) throw new Error("vertical control missing");
    fireEvent.click(vertical);
    expect(container.querySelector('[data-preview-fit="pass"]')).not.toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps A4 and languages visible while placing alternate downloads and sizes in details", () => {
    const theme = getSafetyImageTheme("no-under-suspended-load");
    if (!theme) throw new Error("theme missing");
    render(<SafetyImageEditor theme={theme} />);
    expect(screen.queryByRole("link", { name: "そのままダウンロード" })).toBeNull();
    expect(screen.getByRole("button", { name: "この看板をダウンロード" })).not.toBeNull();
    const details = screen.getByText("詳細設定（文字・サイズ・形式）").closest("details");
    expect(details?.open).toBe(false);
    fireEvent.click(screen.getByText("詳細設定（文字・サイズ・形式）"));
    expect(details?.open).toBe(true);
    expect(screen.getByRole("link", { name: /初期設定の日本語JPEG/u }).getAttribute("href")).toContain("mode=default");
    expect(screen.getByRole("link", { name: /文字なしPNG/u }).getAttribute("href")).toContain("mode=clean");
    for (const label of ["A4縦", "A4横", "A3縦", "A3横", "平板 600×450mm（推奨）", "垂れ幕 450×1800mm"]) {
      expect(screen.getByRole("option", { name: label })).not.toBeNull();
    }
    expect(screen.getByRole("option", { name: "JPEG" })).not.toBeNull();
    expect(screen.getByRole("option", { name: "PDF" })).not.toBeNull();
    expect(screen.getByRole("option", { name: "PNG" })).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "A4縦" }));
    expect((screen.getByLabelText("印刷・看板サイズ") as HTMLSelectElement).value).toBe("a4-portrait");
    fireEvent.click(screen.getByRole("button", { name: "A4横" }));
    expect((screen.getByLabelText("印刷・看板サイズ") as HTMLSelectElement).value).toBe("a4-landscape");
  });

  it("POSTには選択中の言語だけを含め、選択解除した編集文を送信しない", async () => {
    const theme = getSafetyImageTheme("helmet-required");
    if (!theme) throw new Error("theme missing");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new TextEncoder().encode("image"), {
        status: 200,
        headers: { "Content-Type": "image/png" },
      }),
    );
    const createObjectUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    try {
      render(<SafetyImageEditor theme={theme} />);
      fireEvent.click(screen.getByLabelText("ベトナム語"));
      fireEvent.change(screen.getByLabelText("表示する文字（ベトナム語）"), {
        target: { value: "選択解除後は送信しない文言" },
      });
      fireEvent.click(screen.getByLabelText("ベトナム語"));
      fireEvent.click(screen.getByRole("button", { name: "この看板をダウンロード" }));

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      const payload = JSON.parse(String(init.body)) as {
        settings: { languages: string[]; texts: Record<string, string> };
      };
      expect(payload.settings.languages).toEqual(["ja"]);
      expect(payload.settings.texts).toEqual({ ja: "保護帽を着用" });
      expect(JSON.stringify(payload)).not.toContain("選択解除後は送信しない文言");
    } finally {
      fetchMock.mockRestore();
      createObjectUrl.mockRestore();
      revokeObjectUrl.mockRestore();
    }
  });
});
