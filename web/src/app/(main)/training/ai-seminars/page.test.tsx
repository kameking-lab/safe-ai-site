import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  AI_SEMINAR_THEMES,
  AI_SEMINAR_HUB_PATH,
  COMING_SOON_AI_SEMINARS,
  PUBLISHED_AI_SEMINARS,
} from "@/data/ai-seminars/themes";
import AiSeminarLibraryPage, { generateMetadata } from "./page";

describe("/training/ai-seminars", () => {
  it("25テーマを公開中1件とリンクなしComing Soon 24件に分ける", () => {
    const { container } = render(<AiSeminarLibraryPage />);
    expect(AI_SEMINAR_THEMES).toHaveLength(25);
    expect(PUBLISHED_AI_SEMINARS).toHaveLength(1);
    expect(COMING_SOON_AI_SEMINARS).toHaveLength(24);
    expect(container.querySelectorAll('[data-ai-seminar-status="published"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-ai-seminar-status="coming-soon"]')).toHaveLength(24);
    for (const item of container.querySelectorAll('[data-ai-seminar-status="coming-soon"]')) {
      expect(item.querySelector("a, button, input, form")).toBeNull();
    }
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
