import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AutomationConsultPreparation } from "./AutomationConsultPreparation";

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
});

describe("AutomationConsultPreparation mail fallback", () => {
  it("opens a server-generated mail draft without PII fields or recipient exposure", () => {
    const { container } = render(
      <AutomationConsultPreparation mailAvailable />,
    );
    const form = container.querySelector("form");
    expect(form?.getAttribute("method")).toBe("post");
    expect(form?.getAttribute("action")).toBe(
      "/contact/automation-email/draft",
    );
    expect(screen.getByRole("button", { name: "メールで相談する" })).toBeDefined();
    expect(container.querySelector('input[type="email"]')).toBeNull();
    expect(container.querySelector("input, select")).toBeNull();
    expect(container.textContent).not.toMatch(/@gmail|@outlook/i);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("copies only the static template and keeps the no-JS fallback visible", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText },
    });
    const { container } = render(
      <AutomationConsultPreparation mailAvailable />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "相談内容をコピーする" }),
    );
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(String(writeText.mock.calls[0]?.[0])).toContain("【現在の業務】");
    expect(String(writeText.mock.calls[0]?.[0])).not.toContain("mailto:");
    expect(
      screen.getByRole("textbox", { name: "コピー用の相談テンプレート" }),
    ).toHaveProperty("readOnly", true);
    expect(
      readFileSync(
        join(
          process.cwd(),
          "src/app/(main)/services/automation/AutomationConsultPreparation.tsx",
        ),
        "utf8",
      ),
    ).toContain(
      "上の定型文を選択",
    );
  });

  it("shows the stopped state without a mail action when recipients are unavailable", () => {
    const { container } = render(
      <AutomationConsultPreparation mailAvailable={false} />,
    );
    expect(screen.getByRole("status").textContent).toContain("受付停止中");
    expect(container.querySelector("form")).toBeNull();
    expect(screen.queryByRole("button", { name: "メールで相談する" })).toBeNull();
  });
});
