import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import trainingJson from "@/data/safety-seminars/fall-prevention.json";
import claimsJson from "@/data/safety-seminars/claims.json";
import sourcesJson from "@/data/safety-seminars/source-registry.json";
import oshTrainingJson from "@/data/safety-seminars/safety-management-basics-osh-law.json";
import oshClaimsJson from "@/data/safety-seminars/safety-management-basics-osh-law-claims.json";
import oshSourcesJson from "@/data/safety-seminars/safety-management-basics-osh-law-source-registry.json";
import type {
  FallPreventionTraining,
  TrainingClaim,
  TrainingCourse,
  TrainingSource,
} from "@/data/safety-seminars/types";
import { SafetySeminarPlayer } from "./safety-seminar-player";

const training = trainingJson as FallPreventionTraining;
const claims = claimsJson as TrainingClaim[];
const sources = sourcesJson as TrainingSource[];
const oshTraining = oshTrainingJson as TrainingCourse;
const oshClaims = oshClaimsJson as TrainingClaim[];
const oshSources = oshSourcesJson as TrainingSource[];

describe("SafetySeminarPlayer", () => {
  const play = vi.fn().mockResolvedValue(undefined);
  const pause = vi.fn();
  const speak = vi.fn();
  const cancel = vi.fn();
  const resume = vi.fn();

  beforeEach(() => {
    play.mockClear();
    pause.mockClear();
    speak.mockClear();
    cancel.mockClear();
    resume.mockClear();
    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      configurable: true,
      value: play,
    });
    Object.defineProperty(HTMLMediaElement.prototype, "pause", {
      configurable: true,
      value: pause,
    });
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
    class MockSpeechSynthesisUtterance {
      text: string;
      lang = "";
      rate = 1;
      volume = 1;
      voice: SpeechSynthesisVoice | null = null;
      onboundary: ((event: { charIndex?: number }) => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;

      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: MockSpeechSynthesisUtterance,
    });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        speak,
        cancel,
        pause,
        resume,
        getVoices: () => [
          { name: "Microsoft Sayaka", lang: "ja-JP" },
          { name: "Microsoft Ichiro", lang: "ja-JP" },
        ],
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
  });

  function renderPlayer(audioEnabled = true) {
    return render(
      <SafetySeminarPlayer
        slides={training.slides}
        claims={claims}
        sources={sources}
        audioEnabled={audioEnabled}
      />,
    );
  }

  function renderStagePlayer(audioEnabled = true) {
    return render(
      <SafetySeminarPlayer
        slides={oshTraining.slides}
        claims={oshClaims}
        sources={oshSources}
        audioBasePath="/training/safety-seminars/safety-management-basics-osh-law/audio"
        audioEnabled={audioEnabled}
      />,
    );
  }

  it("利用者操作で再生・一時停止し、自動再生しない", async () => {
    renderPlayer();
    expect(play).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "再生" }));
    expect(play).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("button", { name: "一時停止" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "一時停止" }));
    expect(pause).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "停止" })).toBeNull();
  });

  it.each(["fall", "management"])("%sの無音モードは音声DOMと操作・処理を作らない", (course) => {
    const { container, unmount } = course === "fall" ? renderPlayer(false) : renderStagePlayer(false);
    expect(container.querySelector("audio")).toBeNull();
    expect(screen.queryByRole("button", { name: "再生" })).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByTestId("seminar-controls").querySelectorAll("button")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "次のスライド" }));
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toContain("2枚目／全");
    fireEvent.click(screen.getByRole("button", { name: "スライド一覧" }));
    fireEvent.click(screen.getByRole("button", { name: "詳しく" }));
    fireEvent.keyDown(window, { key: " " });
    unmount();
    expect(play).not.toHaveBeenCalled();
    expect(speak).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  });

  it("前へ・次へ・一覧で移動し、進捗を更新する", () => {
    renderPlayer();
    expect(
      screen.getByRole("progressbar", { name: "教材全体の進捗" }),
    ).toBeTruthy();
    expect(screen.getByText("01 / 20")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "次のスライド" }));
    expect(screen.getByText("02 / 20")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "スライド一覧" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: /20\. 設備で防ぎ、器具を合わせ、救助まで/u,
      }),
    );
    expect(screen.getByText("20 / 20")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "前のスライド" }));
    expect(screen.getByText("19 / 20")).toBeTruthy();
  });

  it("推移グラフの非ゼロ起点を可視・音声ラベルの両方で明示する", () => {
    renderPlayer();
    for (let index = 1; index < 5; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "次のスライド" }));
    }
    expect(screen.getByText(/縦軸は非ゼロ起点/u)).toBeTruthy();
    expect(screen.getByRole("img", { name: /非ゼロ起点/u })).toBeTruthy();
  });

  it("字幕を常時読め、主操作は5個で、音声設定は表示しない", () => {
    renderPlayer();
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByTestId("seminar-controls").querySelectorAll("button")).toHaveLength(5);
    expect(screen.queryByRole("button", { name: "字幕" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "音声原稿を読む" }));
    expect(screen.getByText(training.slides[0].narration)).toBeTruthy();
    expect(
      screen
        .getByRole("region", { name: "1枚目の音声原稿と講師向け補足" })
        .getAttribute("tabindex"),
    ).toBe("0");
    expect(screen.queryByRole("combobox", { name: "音声の種類" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "再生速度" })).toBeNull();
    expect(screen.queryByRole("button", { name: "ミュート" })).toBeNull();
  });

  it("キーボードとreduced-motion対応を持つ", () => {
    const { container } = renderPlayer();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("02 / 20")).toBeTruthy();
    fireEvent.keyDown(window, { key: "c" });
    expect(screen.getByRole("status")).toBeTruthy();
    fireEvent.keyDown(window, { key: "f" });
    expect(HTMLElement.prototype.requestFullscreen).toHaveBeenCalled();
    expect(container.querySelector('[class*="motion-reduce:transition-none"]')).not.toBeNull();
  });

  it("音声ファイル失敗時もブラウザー読み上げを開始する", async () => {
    const { container } = renderPlayer();
    const audio = container.querySelector("audio") as HTMLAudioElement;
    fireEvent.error(audio);

    fireEvent.click(screen.getByRole("button", { name: "再生" }));
    expect(speak).toHaveBeenCalledTimes(1);

    expect(speak.mock.calls[0]?.[0]).toMatchObject({ text: training.slides[0].narration });
  });

  it("stage教材は投影文面と5操作だけを出し、詳細と直接根拠へ1回で到達できる", () => {
    renderStagePlayer();
    expect(play).not.toHaveBeenCalled();
    expect(screen.getByTestId("seminar-controls").querySelectorAll("button")).toHaveLength(5);
    expect(screen.queryByText(oshTraining.slides[0].body[0]!)).toBeNull();
    expect(screen.getByText(oshTraining.slides[0].stage!.headline)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "詳しく" }));
    expect(screen.getByText(oshTraining.slides[0].body[0]!)).toBeTruthy();
    expect(screen.getByText(oshTraining.slides[0].narration)).toBeTruthy();
    expect(screen.queryByRole("checkbox", { name: "再生中に字幕を表示" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "詳しく閉じる" }));
    fireEvent.click(screen.getByRole("button", { name: "次のスライド" }));
    expect(screen.getByRole("link", { name: "安衛法 第28条の2" }).getAttribute("href"))
      .toBe("https://laws.e-gov.go.jp/law/347AC0000000057#Mp-At_28_2");
    fireEvent.click(screen.getByRole("button", { name: "次のスライド" }));
    expect(screen.getByRole("link", { name: "安衛法 第1条" }).getAttribute("href"))
      .toBe("https://laws.e-gov.go.jp/law/347AC0000000057#Mp-At_1");
  });
});
