// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getSafetyImageTheme } from "@/data/safety-image-library";
import { SafetyImageEditor } from "./safety-image-editor";

describe("SafetyImageEditor", () => {
  it("switches language, custom text, size, position, band and brand then resets", () => {
    const theme = getSafetyImageTheme("helmet-required");
    if (!theme) throw new Error("theme missing");
    render(<SafetyImageEditor theme={theme} />);

    const text = screen.getByLabelText(/表示する文字/u) as HTMLTextAreaElement;
    expect(text.value).toBe("保護帽を着用");
    fireEvent.change(screen.getByLabelText("言語プリセット"), { target: { value: "en" } });
    expect(text.value).toBe("Wear a safety helmet");
    expect(text.getAttribute("lang")).toBe("en");
    expect(screen.getByRole("img", { name: /^文字編集プレビュー:/u }).getAttribute("lang")).toBe("en");
    fireEvent.change(text, { target: { value: "CUSTOM SAFETY MESSAGE" } });
    expect(screen.getAllByText("CUSTOM SAFETY MESSAGE").length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByLabelText("大")[0]);
    fireEvent.click(screen.getAllByLabelText("中央")[0]);
    fireEvent.click(screen.getByLabelText("背景帯"));
    fireEvent.click(screen.getByLabelText("チワワ・©"));
    expect(screen.queryByAltText("安全AIポータルのチワワ")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "元に戻す" }));
    expect(text.value).toBe("保護帽を着用");
    expect((screen.getByLabelText("背景帯") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("チワワ・©") as HTMLInputElement).checked).toBe(true);
    expect(screen.getByAltText("安全AIポータルのチワワ")).not.toBeNull();
  });

  it("supports numeric templates without placing user text in a GET URL", () => {
    const theme = getSafetyImageTheme("site-speed-limit");
    if (!theme) throw new Error("theme missing");
    render(<SafetyImageEditor theme={theme} />);
    fireEvent.change(screen.getByLabelText("言語プリセット"), { target: { value: "id" } });
    expect((screen.getByLabelText("単位") as HTMLInputElement).value).toBe("km/jam");
    fireEvent.change(screen.getByLabelText("数値・連絡先"), { target: { value: "8" } });
    expect(screen.getByRole("img", { name: /8 km\/jam/u })).not.toBeNull();
    fireEvent.click(screen.getByLabelText(/3\. 編集した文字入り/u));
    const downloadButton = screen.getByRole("button", { name: /JPEGをダウンロード/u });
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
    expect([...groups.values()].filter((count) => count === 3).length).toBeGreaterThanOrEqual(5);
    for (const [language, unit] of [["ja", "日"], ["vi", "ngày"], ["zh-CN", "天"]] as const) {
      fireEvent.change(screen.getByLabelText("言語プリセット"), { target: { value: language } });
      expect((screen.getByLabelText("単位") as HTMLInputElement).value).toBe(unit);
    }
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

  it("exposes clean, recommended and edited downloads plus A-paper and market sizes", () => {
    const theme = getSafetyImageTheme("no-under-suspended-load");
    if (!theme) throw new Error("theme missing");
    render(<SafetyImageEditor theme={theme} />);
    expect(screen.getByRole("link", { name: "そのままダウンロード" }).getAttribute("href")).toContain("mode=default");
    for (const label of ["A4縦", "A4横", "A3縦", "A3横", "平板 600×450mm（推奨）", "垂れ幕 450×1800mm"]) {
      expect(screen.getByRole("option", { name: label })).not.toBeNull();
    }
    expect(screen.getByRole("option", { name: "JPEG" })).not.toBeNull();
    expect(screen.getByRole("option", { name: "PDF" })).not.toBeNull();
    expect(screen.getByRole("option", { name: "PNG" })).not.toBeNull();
  });
});
