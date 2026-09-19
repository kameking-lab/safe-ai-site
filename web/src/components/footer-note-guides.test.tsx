import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Footer } from "./footer";

describe("安全AI編集部のnote導線", () => {
  it("無料ガイドと有料テンプレートを区別して案内する", () => {
    render(<Footer />);

    const freeGuide = screen.getByRole("link", {
      name: /無料：2m高所作業の確認順/,
    });
    const paidTemplate = screen.getByRole("link", {
      name: /有料：作業計画・KY・点検の5点テンプレート/,
    });

    expect(freeGuide.getAttribute("href")).toBe(
      "https://note.com/anzen_ai_jp/n/nbe0fafcf0f34?utm_source=anzen_ai_portal&utm_medium=referral&utm_campaign=height_2m_note_funnel&utm_content=free_guide",
    );
    expect(paidTemplate.getAttribute("href")).toBe(
      "https://note.com/anzen_ai_jp/n/n838317f8153d?utm_source=anzen_ai_portal&utm_medium=referral&utm_campaign=height_2m_note_funnel&utm_content=paid_template",
    );
    expect(freeGuide.getAttribute("target")).toBe("_blank");
    expect(paidTemplate.getAttribute("target")).toBe("_blank");
  });
});
