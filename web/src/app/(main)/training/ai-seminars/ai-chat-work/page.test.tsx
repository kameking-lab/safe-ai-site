import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import courseJson from "@/data/ai-seminars/ai-chat-work.json";
import AiChatWorkSeminarPage, { generateMetadata } from "./page";

vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);

describe("/training/ai-seminars/ai-chat-work", () => {
  it("20枚、音声、全文原稿、7成果物、3件だけの相談CTAを表示する", () => {
    const { container } = render(<AiChatWorkSeminarPage />);
    expect(screen.getByRole("heading", { level: 1, name: "AIチャット仕事術" })).toBeTruthy();
    expect(screen.getByText("20枚")).toBeTruthy();
    expect(screen.getByText("音声 約36分")).toBeTruthy();
    expect(screen.getByRole("region", { name: "音声付きAI実務研修スライド" })).toBeTruthy();
    expect(container.querySelector("audio")?.getAttribute("src")).toBe(
      "/training/ai-seminars/ai-chat-work/audio/slide-01.mp3",
    );
    expect(screen.getByRole("link", { name: "編集可能PowerPoint" }).getAttribute("href")).toMatch(/\.pptx$/u);
    expect(screen.getByRole("link", { name: "投影・印刷用PDF" }).getAttribute("href")).toMatch(/\.pdf$/u);
    expect(screen.getByRole("link", { name: "AI依頼テンプレート" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "5問クイズ・解答解説" })).toBeTruthy();
    expect(container.querySelectorAll('a[download][href^="/training/ai-seminars/ai-chat-work/downloads/"]')).toHaveLength(7);
    const custom = container.querySelector("#ai-customize-title")?.closest("section");
    expect(custom?.querySelectorAll("a")).toHaveLength(3);
    expect(courseJson.slides).toHaveLength(20);
    expect(courseJson.exercises).toHaveLength(3);
  });

  it("演習は回答前に解説を開けず、回答後に正本の解説を表示する", () => {
    render(<AiChatWorkSeminarPage />);
    const buttons = screen.getAllByRole("button", { name: /例を見る|解説を見る/u });
    expect(buttons).toHaveLength(3);
    expect(buttons[0].hasAttribute("disabled")).toBe(true);
    const answers = screen.getAllByLabelText("あなたの回答");
    fireEvent.change(answers[0], { target: { value: "目的と確認点を追加する" } });
    expect(buttons[0].hasAttribute("disabled")).toBe(false);
    fireEvent.click(buttons[0]);
    expect(screen.getByText("解説例")).toBeTruthy();
  });

  it("self canonicalで、再生・字幕等のquery表示だけnoindexにする", async () => {
    const canonical = await generateMetadata({ searchParams: Promise.resolve({}) });
    const queried = await generateMetadata({ searchParams: Promise.resolve({ slide: "4", captions: "1" }) });
    expect(canonical.alternates?.canonical).toBe("/training/ai-seminars/ai-chat-work");
    expect(canonical.robots).toEqual({ index: true, follow: true });
    expect(queried.alternates?.canonical).toBe("/training/ai-seminars/ai-chat-work");
    expect(queried.robots).toEqual({ index: false, follow: true });
  });
});
