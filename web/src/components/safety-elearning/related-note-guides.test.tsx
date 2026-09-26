import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RelatedSafetyNoteGuides } from "./related-note-guides";

describe("安全資格とnote記事の対応", () => {
  it("第一種衛生管理者だけに公表問題の有料プレビューを表示する", () => {
    const { unmount } = render(<RelatedSafetyNoteGuides courseId="first-class-health-officer" />);
    expect(screen.getByRole("link", { name: /noteで無料記事を読む/ }).getAttribute("href")).toContain("/n/n286d5c187239?");
    expect(screen.getByRole("link", { name: /noteで無料部分を読む/ }).getAttribute("href")).toContain("/n/n8fa962d280cd?");
    expect(screen.getByText("有料記事・無料部分あり")).toBeTruthy();
    unmount();

    render(<RelatedSafetyNoteGuides courseId="occupational-health-consultant" />);
    expect(screen.getByRole("link", { name: /noteで無料部分を読む/ }).getAttribute("href")).toContain("/n/n1f60da5385ea?");
  });

  it("第二種衛生管理者には共通の無料試験当日ガイドだけを表示する", () => {
    render(<RelatedSafetyNoteGuides courseId="second-class-health-officer" />);
    expect(screen.getByRole("link", { name: /noteで無料記事を読む/ }).getAttribute("href")).toContain("/n/n286d5c187239?");
    expect(screen.queryByText("有料記事・無料部分あり")).toBeNull();
  });

  it("対応記事のない講座に推薦を出さない", () => {
    const { container } = render(<RelatedSafetyNoteGuides courseId="occupational-safety-consultant" />);
    expect(container.innerHTML).toBe("");
  });
});
