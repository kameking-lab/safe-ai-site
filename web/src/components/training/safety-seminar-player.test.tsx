import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import trainingJson from "@/data/safety-seminars/fall-prevention.json";
import claimsJson from "@/data/safety-seminars/claims.json";
import sourcesJson from "@/data/safety-seminars/source-registry.json";
import type {
  FallPreventionTraining,
  TrainingClaim,
  TrainingSource,
} from "@/data/safety-seminars/types";
import { SafetySeminarPlayer } from "./safety-seminar-player";

const training = trainingJson as FallPreventionTraining;
const claims = claimsJson as TrainingClaim[];
const sources = sourcesJson as TrainingSource[];

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
      value: { speak, cancel, pause, resume },
    });
  });

  function renderPlayer() {
    return render(
      <SafetySeminarPlayer
        slides={training.slides}
        claims={claims}
        sources={sources}
      />,
    );
  }

  it("利用者操作で再生・一時停止・停止し、自動再生しない", async () => {
    const { container } = renderPlayer();
    expect(play).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "再生" }));
    expect(play).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("button", { name: "一時停止" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "一時停止" }));
    expect(pause).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "停止" }));
    expect((container.querySelector("audio") as HTMLAudioElement).currentTime).toBe(0);
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
    fireEvent.click(screen.getByRole("button", { name: /20\. 設備で防ぎ/u }));
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

  it("字幕・全文原稿・音量・ミュート・再生速度を操作できる", () => {
    const { container } = renderPlayer();
    expect(screen.getByRole("status")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "字幕" }));
    expect(screen.queryByRole("status")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "字幕" }));
    fireEvent.click(screen.getByRole("button", { name: "音声原稿を読む" }));
    expect(screen.getByText(training.slides[0].narration)).toBeTruthy();
    expect(
      screen
        .getByRole("region", { name: "1枚目の音声原稿と講師向け補足" })
        .getAttribute("tabindex"),
    ).toBe("0");
    fireEvent.click(screen.getByRole("button", { name: "ミュート" }));
    expect((container.querySelector("audio") as HTMLAudioElement).muted).toBe(true);
    fireEvent.change(screen.getByRole("combobox", { name: "再生速度" }), {
      target: { value: "1.5" },
    });
    expect((container.querySelector("audio") as HTMLAudioElement).playbackRate).toBe(1.5);
  });

  it("キーボードとreduced-motion対応を持つ", () => {
    const { container } = renderPlayer();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("02 / 20")).toBeTruthy();
    fireEvent.keyDown(window, { key: "c" });
    expect(screen.queryByRole("status")).toBeNull();
    fireEvent.keyDown(window, { key: "m" });
    expect((container.querySelector("audio") as HTMLAudioElement).muted).toBe(true);
    fireEvent.keyDown(window, { key: "f" });
    expect(HTMLElement.prototype.requestFullscreen).toHaveBeenCalled();
    expect(container.querySelector('[class*="motion-reduce:transition-none"]')).not.toBeNull();
  });

  it("音声ファイル失敗時もブラウザー読み上げを開始し、設定変更後に再開する", async () => {
    const { container } = renderPlayer();
    const audio = container.querySelector("audio") as HTMLAudioElement;
    fireEvent.error(audio);

    fireEvent.click(screen.getByRole("button", { name: "再生" }));
    expect(speak).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByRole("combobox", { name: "再生速度" }), {
      target: { value: "1.25" },
    });
    await waitFor(() => expect(speak).toHaveBeenCalledTimes(2));
    expect(speak.mock.calls.at(-1)?.[0]).toMatchObject({ rate: 1.25 });

    fireEvent.click(screen.getByRole("button", { name: "ミュート" }));
    await waitFor(() => expect(speak).toHaveBeenCalledTimes(3));
    expect(speak.mock.calls.at(-1)?.[0]).toMatchObject({ volume: 0 });
  });
});
