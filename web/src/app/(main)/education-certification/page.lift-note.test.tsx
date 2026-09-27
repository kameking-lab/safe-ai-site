import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EducationCertificationPage from "./page";
import { SPECIAL_EDUCATION } from "@/data/education-rules/special-education";

describe("建設用リフトの資格案内", () => {
  it("施行令の定義と安衛則の教育対象を正しい号数で示す", () => {
    const lift = SPECIAL_EDUCATION.find((entry) => entry.id === "se-36-18-lift");
    expect(lift).toBeDefined();
    expect(lift?.targetWork).toContain("令第1条第10号");
    expect(lift?.targetWork).not.toContain("令第1条第9号");
    expect(lift?.relatedLaw).toBe("安衛則第36条第18号");
  });

  it("無料の現場向け記事へ安全な外部リンクを表示する", () => {
    render(<EducationCertificationPage />);
    const link = screen.getByRole("link", {
      name: /無料.*建設用リフトの特別教育はいつ必要/u,
    });
    expect(link.getAttribute("href")).toBe(
      "https://note.com/anzen_ai_jp/n/n995c64038dd7",
    );
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.textContent).toContain("荷物専用設備と工事用エレベーター");
  });
});
