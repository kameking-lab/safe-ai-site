import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  AI_SEMINAR_THEMES,
  AI_SEMINAR_HUB_PATH,
  AI_SEMINAR_CORE_20,
  COMING_SOON_AI_SEMINARS,
  COMING_SOON_AI_CORE_20,
  PUBLISHED_AI_SEMINARS,
} from "@/data/ai-seminars/themes";
import AiSeminarLibraryPage, { generateMetadata } from "./page";

describe("/training/ai-seminars", () => {
  it("計画データを保持し、公開一覧は利用できる教材と実践手順を表示する", () => {
    const { container } = render(<AiSeminarLibraryPage />);
    expect(AI_SEMINAR_THEMES).toHaveLength(25);
    expect(PUBLISHED_AI_SEMINARS).toHaveLength(1);
    expect(COMING_SOON_AI_SEMINARS).toHaveLength(24);
    expect(AI_SEMINAR_CORE_20).toHaveLength(20);
    expect(COMING_SOON_AI_CORE_20).toHaveLength(19);
    expect(container.querySelectorAll('[data-ai-seminar-status="published"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-ai-seminar-status="coming-soon"]')).toHaveLength(0);
    expect(screen.queryByText(/Coming Soon|準備中/)).toBeNull();
    expect(screen.getByRole("heading", { name: "研修を仕事の改善につなげる手順" })).toBeDefined();
    expect(screen.getByRole("link", { name: /今すぐ見る/u }).getAttribute("href")).toBe("/training/ai-seminars/ai-chat-work");
  });

  it("self canonicalを保ち、query付きだけnoindexにする", async () => {
    const canonical = await generateMetadata({ searchParams: Promise.resolve({}) });
    const queried = await generateMetadata({ searchParams: Promise.resolve({ slide: "1" }) });
    expect(canonical.alternates?.canonical).toBe(AI_SEMINAR_HUB_PATH);
    expect(canonical.robots).toEqual({ index: true, follow: true });
    expect(queried.robots).toEqual({ index: false, follow: true });
  });
});
