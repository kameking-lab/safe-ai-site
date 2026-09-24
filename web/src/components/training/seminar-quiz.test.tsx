import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SeminarQuiz } from "./seminar-quiz";
import quizJson from "@/data/safety-seminars/safety-management-basics-osh-law-quiz.json";
import sourcesJson from "@/data/safety-seminars/safety-management-basics-osh-law-source-registry.json";
import fallQuizJson from "@/data/safety-seminars/quiz.json";
import fallSourcesJson from "@/data/safety-seminars/source-registry.json";
import type { TrainingQuiz, TrainingSource } from "@/data/safety-seminars/types";

const COURSE_ID = "safety-management-basics-osh-law";
const quizProps = { courseId: COURSE_ID, quiz: quizJson as TrainingQuiz, sources: sourcesJson as TrainingSource[] };
const fallProps = { courseId: "fall-prevention", quiz: fallQuizJson as TrainingQuiz, sources: fallSourcesJson as TrainingSource[] };

describe("SeminarQuiz", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("保存が拒否されても採点と最初からの操作を続けられる", () => {
    for (const method of ["getItem", "setItem", "removeItem"] as const) {
      vi.spyOn(Storage.prototype, method).mockImplementation(() => { throw new DOMException("Storage blocked", "SecurityError"); });
    }
    render(<SeminarQuiz {...quizProps} />);
    for (let index = 0; index < 5; index++) {
      fireEvent.click(screen.getByRole("group", { name: /問目の選択肢/u }).querySelector("button")!);
      fireEvent.click(screen.getByRole("button", { name: index === 4 ? "結果を見る" : "次の問題" }));
    }
    fireEvent.click(screen.getByRole("button", { name: "最初から" }));
    expect(screen.getByText("問題 1/5")).toBeTruthy();
  });

  it.each([
    { queue: [99], position: 0, responses: { 99: 0 }, complete: false },
    { queue: [0], position: 0, responses: { 0: 99 }, complete: false },
    { queue: [0, 0], position: 0, responses: { 0: 0 }, complete: false },
    { queue: [0, 1], position: 1, responses: {}, complete: false },
  ])("壊れた保存データを捨てて問題を表示する: %j", (saved) => {
    window.localStorage.setItem(`seminar-quiz:${COURSE_ID}:1.0.0`, JSON.stringify(saved));
    render(<SeminarQuiz {...quizProps} />);
    expect(screen.getByText("問題 1/5")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "続きから" })).toBeNull();
  });

  it("選択前は正解と理由をDOMへ出さず、選択後に4件の理由と根拠を表示して結果へフォーカスする", async () => {
    render(<SeminarQuiz {...quizProps} />);
    expect(screen.queryByText(/正解です/u)).toBeNull();
    expect(screen.queryByText(/本人だけを確認すると/u)).toBeNull();
    expect(screen.queryByText(/個人の行動だけで終えると/u)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /本人の不注意だけ/u }));

    expect(screen.getByText(/× 不正解です/u)).toBeTruthy();
    expect(screen.getByText(/本人だけを確認すると/u)).toBeTruthy();
    expect(screen.getByText(/人、設備、原材料/u)).toBeTruthy();
    expect(screen.getByText(/禁止だけでは/u)).toBeTruthy();
    expect(screen.getByText(/結果の軽重/u)).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /根拠:/u })).toHaveLength(2);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("status")));
  });

  it("5問を10タップで完了し、結果と再開始を表示する", () => {
    render(<SeminarQuiz {...quizProps} />);
    const correctChoices = [
      /人、設備、作業方法/u,
      /現行法と関係政省令/u,
      /危険の特定、見積り/u,
      /危険作業の廃止/u,
      /いったん止め/u,
    ];
    correctChoices.forEach((choice, index) => {
      fireEvent.click(screen.getByRole("button", { name: choice }));
      fireEvent.click(screen.getByRole("button", { name: index === 4 ? "結果を見る" : "次の問題" }));
    });
    expect(screen.getByText("5/5問 正解")).toBeTruthy();
    expect(screen.getByRole("button", { name: "最初から" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "間違えた問題だけ再挑戦" })).toBeNull();
  });

  it("誤答だけを結果画面から1タップで再挑戦できる", () => {
    render(<SeminarQuiz {...quizProps} />);
    const choices = [
      /本人の不注意だけ/u,
      /現行法と関係政省令/u,
      /危険の特定、見積り/u,
      /危険作業の廃止/u,
      /いったん止め/u,
    ];
    choices.forEach((choice, index) => {
      fireEvent.click(screen.getByRole("button", { name: choice }));
      fireEvent.click(screen.getByRole("button", { name: index === 4 ? "結果を見る" : "次の問題" }));
    });
    fireEvent.click(screen.getByRole("button", { name: "間違えた問題だけ再挑戦" }));
    expect(screen.getByText(/事故原因を調べるとき/u)).toBeTruthy();
    expect(screen.getByText("問題 1/1")).toBeTruthy();
    expect(screen.getByText("回答済み 0/1問")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuemax")).toBe("1");
  });

  it("localStorageから進捗を復元できる", async () => {
    const first = render(<SeminarQuiz {...quizProps} />);
    fireEvent.click(screen.getByRole("button", { name: /人、設備、作業方法/u }));
    fireEvent.click(screen.getByRole("button", { name: "次の問題" }));
    await waitFor(() => expect(window.localStorage.getItem(`seminar-quiz:${COURSE_ID}:1.0.0`)).toContain('"position":1'));
    first.unmount();

    render(<SeminarQuiz {...quizProps} />);
    expect(await screen.findByRole("button", { name: "続きから" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "続きから" }));
    expect(screen.getByText(/現場で守るべき基準/u)).toBeTruthy();
  });
});

describe("墜落防止の既存5問", () => {
  beforeEach(() => window.localStorage.clear());

  it("回答前に正解を出さず、誤答後に4肢の理由と国内公的資料を表示する", async () => {
    render(<SeminarQuiz {...fallProps} />);
    expect(screen.queryByText(/器具の配布だけでは/u)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /フルハーネスを全員へ配る/u }));
    expect(screen.getByText(/× 不正解です/u)).toBeTruthy();
    for (const reason of [/器具の配布だけでは/u, /地上組立を含む/u, /注意喚起は設備/u, /教育を追加しても/u]) {
      expect(screen.getByText(reason)).toBeTruthy();
    }
    const evidence = screen.getByRole("link", { name: /根拠:/u });
    expect(evidence.getAttribute("href")).toMatch(/^https:\/\/www\.mhlw\.go\.jp\//u);
    expect(evidence.textContent).toContain("第1・第4");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("status")));
  });

  it("法令条番号と資料ページを根拠リンクに表示し、直接開ける", () => {
    const quiz = {
      ...fallProps.quiz,
      questions: [fallProps.quiz.questions[2]!, fallProps.quiz.questions[4]!],
    };
    const first = render(<SeminarQuiz {...fallProps} quiz={quiz} />);
    fireEvent.click(screen.getByRole("button", { name: /高さ2m以上の作業はすべて対象/u }));
    expect(screen.getByRole("link", { name: /労働安全衛生規則.*第36条第41号/u }).getAttribute("href"))
      .toBe("https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_36");
    first.unmount();

    render(<SeminarQuiz {...fallProps} courseId="fall-evidence-page" quiz={{ ...quiz, questions: [quiz.questions[1]!] }} />);
    fireEvent.click(screen.getByRole("button", { name: /15分は安全なので状況を見る/u }));
    expect(screen.getByRole("link", { name: /冊子p80／PDF p84/u }).getAttribute("href"))
      .toBe("https://www.jniosh.johas.go.jp/publication/doc/ar/ar_2009.pdf#page=84");
    expect(screen.getByRole("link", { name: /第7の1（落下衝撃後の使用禁止）/u })).toBeTruthy();
  });

  it("教材ごとの保存キーを分離し、再訪で回答済みの続きに戻れる", async () => {
    const first = render(<SeminarQuiz {...fallProps} />);
    fireEvent.click(screen.getByRole("button", { name: /地上組立や作業床/u }));
    fireEvent.click(screen.getByRole("button", { name: "次の問題" }));
    await waitFor(() => expect(window.localStorage.getItem("seminar-quiz:fall-prevention:1.0.0")).toContain('"position":1'));
    expect(window.localStorage.getItem(`seminar-quiz:${COURSE_ID}:1.0.0`)).toBeNull();
    first.unmount();
    render(<SeminarQuiz {...fallProps} />);
    fireEvent.click(await screen.findByRole("button", { name: "続きから" }));
    expect(screen.getByText(/5mと6.75m/u)).toBeTruthy();
  });
});
