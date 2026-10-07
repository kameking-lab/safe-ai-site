import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RelatedSafetyNoteGuides } from "./related-note-guides";

describe("安全資格とnote記事の対応", () => {
  it("第一種衛生管理者だけに公表問題の有料プレビューを表示する", () => {
    const { unmount } = render(<RelatedSafetyNoteGuides courseId="first-class-health-officer" />);
    expect(screen.getByRole("link", { name: /noteで無料記事を読む/ }).getAttribute("href")).toContain("/n/n286d5c187239?");
    expect(screen.getByRole("link", { name: /noteで無料部分・収録内容を確認する/ }).getAttribute("href")).toContain("/n/n8fa962d280cd?");
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

  it("第一種の復習教材は単品価格と独自演習の範囲を示す", () => {
    render(<RelatedSafetyNoteGuides courseId="first-class-health-officer" />);
    expect(screen.getByText("単品 1,280円（2026年10月7日確認）")).toBeTruthy();
    expect(screen.getByText(/計88問を分類した出題表/)).toBeTruthy();
    expect(screen.getByText(/12問は独自問題です/)).toBeTruthy();
    expect(screen.getByText("無料講座との違い")).toBeTruthy();
  });

  it("労安の機械安全は仮想事例の筆記練習として1教材に直結する", () => {
    render(<RelatedSafetyNoteGuides courseId="occupational-safety-consultant" />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute("href")).toContain("/n/n45654cd0b84d?");
    expect(screen.getByText("単品 980円（2026年10月7日確認）")).toBeTruthy();
    expect(screen.getByText(/3つの独自の仮想事例・計9問/)).toBeTruthy();
    expect(screen.getByText(/公表問題の再現、公式採点基準、口述対策は含みません/)).toBeTruthy();
    expect(screen.queryByText(/第一種衛生管理者 公表問題2回分/)).toBeNull();
  });

  it("対応記事のない講座に推薦を出さない", () => {
    const { container } = render(<RelatedSafetyNoteGuides courseId="gas-welding" />);
    expect(container.innerHTML).toBe("");
  });
});
