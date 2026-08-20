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
    const theme = getSafetyImageTheme("floor-load-limit");
    if (!theme) throw new Error("theme missing");
    render(<SafetyImageEditor theme={theme} />);
    fireEvent.change(screen.getByLabelText("数値・連絡先"), { target: { value: "1.5" } });
    fireEvent.change(screen.getByLabelText("単位"), { target: { value: "t/㎡" } });
    expect(screen.getAllByText(/1\.5 t\/㎡/u).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByLabelText(/3\. 編集した文字入り/u));
    const downloadButton = screen.getByRole("button", { name: /JPEGをダウンロード/u });
    expect(downloadButton.hasAttribute("disabled")).toBe(false);
    expect(document.body.innerHTML).not.toContain("1.5%20t");
  });

  it("exposes clean, recommended and edited downloads plus all A-paper choices", () => {
    const theme = getSafetyImageTheme("scaffold-work-illustration");
    if (!theme) throw new Error("theme missing");
    render(<SafetyImageEditor theme={theme} />);
    expect(screen.getByRole("link", { name: "そのままダウンロード" }).getAttribute("href")).toContain("mode=default");
    for (const label of ["A4縦", "A4横・推奨", "A3縦", "A3横・推奨"]) {
      expect(screen.getByRole("button", { name: label })).not.toBeNull();
    }
    expect(screen.getByRole("option", { name: "JPEG" })).not.toBeNull();
    expect(screen.getByRole("option", { name: "PDF" })).not.toBeNull();
    expect(screen.getByRole("option", { name: "PNG" })).not.toBeNull();
  });
});
