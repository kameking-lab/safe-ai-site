import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import sitemap from "@/app/sitemap";
import AutomationEmailContactPage, { metadata } from "./page";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/contact/automation-email", () => {
  it("is noindex/nofollow/noarchive and excluded from the sitemap", () => {
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: false,
      noarchive: true,
    });
    expect(
      sitemap().some((entry) =>
        entry.url.includes("/contact/automation-email"),
      ),
    ).toBe(false);
    expect(metadata.alternates).toBeUndefined();
  });

  it("renders verified To, fixed subject, and body without exposing Bcc", () => {
    vi.stubEnv(
      "AUTOMATION_CONSULT_RECIPIENTS",
      "audit@outlook.com,primary@gmail.com",
    );
    const { container } = render(<AutomationEmailContactPage />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      "メールアプリで相談文を作成",
    );
    expect(screen.getByText("メール相談受付中")).toBeDefined();
    const form = container.querySelector("form");
    expect(form?.getAttribute("method")).toBe("post");
    expect(form?.getAttribute("action")).toBe(
      "/contact/automation-email/draft",
    );
    expect(
      screen.getByRole("textbox", { name: "コピー用の相談テンプレート" }),
    ).toHaveProperty("readOnly", true);
    expect(
      screen.getByRole("textbox", { name: "コピー用の宛先" }),
    ).toHaveProperty("value", "primary@gmail.com");
    expect(
      screen.getByRole("textbox", { name: "コピー用の件名" }),
    ).toHaveProperty(
      "value",
      "安全AIポータル｜業務自動化・講習の相談",
    );
    const source = readFileSync(
      join(
        process.cwd(),
        "src/app/(main)/contact/automation-email/page.tsx",
      ),
      "utf8",
    );
    expect(source).toContain("上の宛先・件名・本文を選択");
    expect(source).not.toContain("自動コピーは使えません");
    expect(container.innerHTML).toContain("primary@gmail.com");
    expect(container.innerHTML).not.toContain("audit@outlook.com");
    expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
  });
});
