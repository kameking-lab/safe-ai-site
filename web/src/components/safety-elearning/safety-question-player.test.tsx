import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SAFETY_COURSES,
  getCourseQuestions,
} from "@/data/safety-elearning/courses";
import { SafetyQuestionPlayer } from "./safety-question-player";

const course = SAFETY_COURSES[0];
const questions = getCourseQuestions(course);
const subjectTitles = Object.fromEntries(
  course.subjects.map((subject) => [subject.subjectId, subject.title]),
);

function renderPlayer(count = 2) {
  return render(
    <SafetyQuestionPlayer
      courseTitle={course.shortTitle}
      questions={questions.slice(0, count)}
      subjectTitles={subjectTitles}
    />,
  );
}

describe("SafetyQuestionPlayer", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("誤答では理由と再選択だけを示し、正答するまで次へ進めない", () => {
    renderPlayer();
    const first = questions[0];
    const wrongChoice = first.choices.find(
      (choice) => !first.officialCorrectChoiceIds.includes(choice.choiceId),
    )!;
    const correctChoice = first.choices.find((choice) =>
      first.officialCorrectChoiceIds.includes(choice.choiceId),
    )!;

    fireEvent.click(screen.getByLabelText(new RegExp(wrongChoice.text)));
    fireEvent.click(screen.getByRole("button", { name: "回答する" }));

    expect(screen.getByText("不正解")).toBeTruthy();
    expect(screen.getByText(new RegExp(`選んだ回答: ${wrongChoice.text}`))).toBeTruthy();
    expect(screen.queryByRole("button", { name: "次へ" })).toBeNull();
    expect(screen.getByRole("button", { name: "もう一度選ぶ" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "もう一度選ぶ" }));
    fireEvent.click(screen.getByLabelText(new RegExp(correctChoice.text)));
    fireEvent.click(screen.getByRole("button", { name: "回答する" }));

    expect(screen.getByText("正解")).toBeTruthy();
    expect(screen.getByText("ほかの選択肢が違う理由")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    expect(screen.getByText(questions[1].questionText)).toBeTruthy();
  });

  it("1〜5キーで選択しEnterで回答・次画面へ進める", () => {
    renderPlayer(1);
    fireEvent.keyDown(window, { key: "1" });
    expect(screen.getAllByRole("radio")[0]).toHaveProperty("checked", true);
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByText("正解")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(
      screen.getByRole("heading", { name: "今回の問題演習が完了しました" }),
    ).toBeTruthy();
  });

  it("既存の学習データを読まず、localStorage・sessionStorageへ書き込まない", () => {
    const legacyLearning = JSON.stringify({ legacy: true });
    const legacyVisualKy = JSON.stringify({ completed: ["legacy"] });
    window.localStorage.setItem("safe-ai:elearning-progress:v1", legacyLearning);
    window.localStorage.setItem("safe-ai:visual-ky-progress:v1", legacyVisualKy);
    const storageWrite = vi.spyOn(Storage.prototype, "setItem");

    renderPlayer(1);
    fireEvent.click(screen.getAllByRole("radio")[0]);
    fireEvent.click(screen.getByRole("button", { name: "回答する" }));
    fireEvent.click(screen.getByRole("button", { name: "結果を見る" }));

    expect(storageWrite).not.toHaveBeenCalled();
    expect(window.localStorage.getItem("safe-ai:elearning-progress:v1")).toBe(
      legacyLearning,
    );
    expect(window.localStorage.getItem("safe-ai:visual-ky-progress:v1")).toBe(
      legacyVisualKy,
    );
  });
});
