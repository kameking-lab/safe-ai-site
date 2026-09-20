import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SafetyManagementBasicsOshLawPage, { generateMetadata } from "./page";

vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);

describe("/training/safety-seminars/safety-management-basics-osh-law", () => {
  it("12枚の音声教材、2形式のダウンロード、クイズと出典を表示する", () => {
    const { container } = render(<SafetyManagementBasicsOshLawPage />);
    expect(container.querySelector("main")).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: /安全管理の基本と/u })).toBeTruthy();
    expect(screen.getByText("12枚")).toBeTruthy();
    expect(screen.getByText("音声 約8分")).toBeTruthy();
    expect(screen.getAllByText(/法定の雇入れ時/u).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "編集可能PowerPoint" }).getAttribute("href")).toMatch(/\.pptx$/u);
    expect(screen.getByRole("link", { name: "投影・印刷用PDF" }).getAttribute("href")).toMatch(/\.pdf$/u);
    expect(screen.getByRole("heading", { level: 2, name: "5問の確認クイズ" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "出典と確認状態" })).toBeTruthy();
    expect(container.textContent).toContain("LearningResource");
  });

  it("専用音声パスと一意な字幕領域を使う", () => {
    const { container } = render(<SafetyManagementBasicsOshLawPage />);
    const audio = container.querySelector("audio");
    expect(audio?.getAttribute("src")).toContain(
      "/training/safety-seminars/safety-management-basics-osh-law/audio/slide-01.mp3",
    );
    expect(container.querySelector("#safety-management-basics-transcript")).toBeNull();
  });

  it("self canonicalで、query付き表示だけnoindexにする", async () => {
    const canonical = await generateMetadata({ searchParams: Promise.resolve({}) });
    const queried = await generateMetadata({ searchParams: Promise.resolve({ slide: "3" }) });
    expect(canonical.alternates?.canonical).toBe(
      "https://www.anzen-ai-portal.jp/training/safety-seminars/safety-management-basics-osh-law",
    );
    expect(canonical.robots).toEqual({ index: true, follow: true });
    expect(queried.robots).toEqual({ index: false, follow: true });
  });
});
