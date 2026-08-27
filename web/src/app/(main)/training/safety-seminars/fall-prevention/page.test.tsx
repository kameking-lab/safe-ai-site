import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FallPreventionSeminarPage, { generateMetadata } from "./page";

vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);

describe("/training/safety-seminars/fall-prevention", () => {
  it("H1、20枚、注意、ダウンロード、3件だけの相談CTAをSSR表示する", () => {
    const { container } = render(<FallPreventionSeminarPage />);
    expect(container.querySelector("main")).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: /墜落・転落防止と/u })).toBeTruthy();
    expect(screen.getAllByText(/法定の特別教育等を代替/u).length).toBeGreaterThan(0);
    expect(screen.getByText("20枚")).toBeTruthy();
    expect(screen.getByRole("link", { name: "編集可能PowerPoint" }).getAttribute("href")).toMatch(/\.pptx$/u);
    expect(screen.getByRole("link", { name: "投影・印刷用PDF" }).getAttribute("href")).toMatch(/\.pdf$/u);
    expect(screen.getByRole("link", { name: "参加者配布用1枚資料" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "5問クイズ・解答解説" })).toBeTruthy();
    const custom = container.querySelector("#customize-title")?.closest("section");
    expect(custom?.querySelectorAll("a")).toHaveLength(3);
    expect(container.textContent).toContain("LearningResource");
  });

  it("self canonicalで、query付き表示だけnoindexにする", async () => {
    const canonical = await generateMetadata({ searchParams: Promise.resolve({}) });
    const queried = await generateMetadata({ searchParams: Promise.resolve({ slide: "3" }) });
    expect(canonical.alternates?.canonical).toBe("https://www.anzen-ai-portal.jp/training/safety-seminars/fall-prevention");
    expect(canonical.robots).toEqual({ index: true, follow: true });
    expect(queried.robots).toEqual({ index: false, follow: true });
  });
});
