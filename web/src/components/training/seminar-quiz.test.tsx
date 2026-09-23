import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { SeminarQuiz } from "./seminar-quiz";

const COURSE_ID = "safety-management-basics-osh-law";

describe("SeminarQuiz", () => {
  beforeEach(() => window.localStorage.clear());

  it("選択前は正解と理由をDOMへ出さず、選択後に4件の理由と根拠を表示して結果へフォーカスする", async () => {
    render(<SeminarQuiz courseId={COURSE_ID} />);
    expect(screen.queryByText(/正解です/u)).toBeNull();
    expect(screen.queryByText(/本人だけを確認すると/u)).toBeNull();
    expect(screen.queryByText(/個人の行動だけで終えると/u)).toBeNull();

    fireEvent.click(screen.getByRole("radio", { name: /本人の不注意だけ/u }));

    expect(screen.getByText(/× 不正解です/u)).toBeTruthy();
    expect(screen.getByText(/本人だけを確認すると/u)).toBeTruthy();
    expect(screen.getByText(/人、設備、原材料/u)).toBeTruthy();
    expect(screen.getByText(/禁止だけでは/u)).toBeTruthy();
    expect(screen.getByText(/結果の軽重/u)).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /根拠:/u })).toHaveLength(2);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("status")));
  });

  it("5問を10タップで完了し、結果と再開始を表示する", () => {
    render(<SeminarQuiz courseId={COURSE_ID} />);
    const correctChoices = [
      /人、設備、作業方法/u,
      /現行法と関係政省令/u,
      /危険の特定、見積り/u,
      /危険作業の廃止/u,
      /いったん止め/u,
    ];
    correctChoices.forEach((choice, index) => {
      fireEvent.click(screen.getByRole("radio", { name: choice }));
      fireEvent.click(screen.getByRole("button", { name: index === 4 ? "結果を見る" : "次の問題" }));
    });
    expect(screen.getByText("5/5問 正解")).toBeTruthy();
    expect(screen.getByRole("button", { name: "最初から" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "間違えた問題だけ再挑戦" })).toBeNull();
  });

  it("誤答だけを結果画面から1タップで再挑戦できる", () => {
    render(<SeminarQuiz courseId={COURSE_ID} />);
    const choices = [
      /本人の不注意だけ/u,
      /現行法と関係政省令/u,
      /危険の特定、見積り/u,
      /危険作業の廃止/u,
      /いったん止め/u,
    ];
    choices.forEach((choice, index) => {
      fireEvent.click(screen.getByRole("radio", { name: choice }));
      fireEvent.click(screen.getByRole("button", { name: index === 4 ? "結果を見る" : "次の問題" }));
    });
    fireEvent.click(screen.getByRole("button", { name: "間違えた問題だけ再挑戦" }));
    expect(screen.getByText(/事故原因を調べるとき/u)).toBeTruthy();
    expect(screen.getByText("問題 1/1")).toBeTruthy();
  });

  it("localStorageから進捗を復元できる", async () => {
    const first = render(<SeminarQuiz courseId={COURSE_ID} />);
    fireEvent.click(screen.getByRole("radio", { name: /人、設備、作業方法/u }));
    fireEvent.click(screen.getByRole("button", { name: "次の問題" }));
    await waitFor(() => expect(window.localStorage.getItem(`seminar-quiz:${COURSE_ID}:1.0.0`)).toContain('"position":1'));
    first.unmount();

    render(<SeminarQuiz courseId={COURSE_ID} />);
    expect(await screen.findByRole("button", { name: "続きから" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "続きから" }));
    expect(screen.getByText(/現場で守るべき基準/u)).toBeTruthy();
  });
});
