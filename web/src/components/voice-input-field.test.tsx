import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InputWithVoice, TextareaWithVoice, VoiceMicButton } from "./voice-input-field";

class RecognitionMock {
  static latest: RecognitionMock | null = null;
  static starts = 0;
  lang = "";
  interimResults = false;
  continuous = false;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript?: string }>> }) => void) | null = null;
  onerror: ((event: { error?: string; message?: string }) => void) | null = null;
  onend: (() => void) | null = null;
  abort = vi.fn(() => this.onend?.());
  stop = vi.fn(() => this.onend?.());
  constructor() {
    RecognitionMock.latest = this;
  }
  start() {
    RecognitionMock.starts += 1;
  }
  finish(transcript: string) {
    this.onresult?.({ results: [[{ transcript }]] });
    this.onend?.();
  }
}

describe("shared voice input", () => {
  beforeEach(() => {
    RecognitionMock.latest = null;
    RecognitionMock.starts = 0;
    window.SpeechRecognition = RecognitionMock;
    window.webkitSpeechRecognition = undefined;
  });

  afterEach(() => {
    window.SpeechRecognition = undefined;
    window.webkitSpeechRecognition = undefined;
    vi.restoreAllMocks();
  });

  it("requests speech recognition only after the named mic button is clicked", () => {
    render(<VoiceMicButton targetLabel="作業内容" onFinalText={vi.fn()} />);
    expect(RecognitionMock.starts).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "作業内容を音声入力" }));
    expect(RecognitionMock.starts).toBe(1);
    expect(RecognitionMock.latest?.lang).toBe("ja-JP");
    expect(screen.getByRole("status").textContent).toContain("録音中");
  });

  it("shows a transcript candidate and commits it only after confirmation", () => {
    const onFinalText = vi.fn();
    render(<VoiceMicButton targetLabel="危険1" onFinalText={onFinalText} />);
    fireEvent.click(screen.getByRole("button", { name: "危険1を音声入力" }));
    act(() => RecognitionMock.latest?.finish("足場から墜落する危険"));
    expect(onFinalText).not.toHaveBeenCalled();
    expect(
      (screen.getByRole("textbox", {
        name: "危険1の音声認識候補",
      }) as HTMLTextAreaElement).value,
    ).toBe("足場から墜落する危険");
    fireEvent.click(screen.getByRole("button", { name: "確定" }));
    expect(onFinalText).toHaveBeenCalledWith("足場から墜落する危険");
  });

  it("can cancel recording without retaining or committing raw audio/transcript", () => {
    const onFinalText = vi.fn();
    render(<VoiceMicButton targetLabel="対策1" onFinalText={onFinalText} />);
    fireEvent.click(screen.getByRole("button", { name: "対策1を音声入力" }));
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(RecognitionMock.latest?.abort).toHaveBeenCalled();
    expect(onFinalText).not.toHaveBeenCalled();
    expect(screen.queryByText("認識候補を確認")).toBeNull();
  });

  it("supports re-recording before commit", () => {
    render(<VoiceMicButton targetLabel="備考" onFinalText={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "備考を音声入力" }));
    act(() => RecognitionMock.latest?.finish("最初の候補"));
    fireEvent.click(screen.getByRole("button", { name: "再録音" }));
    expect(RecognitionMock.starts).toBe(2);
    expect(screen.getByRole("status").textContent).toContain("録音中");
  });

  it("keeps manual input available when the browser is unsupported", () => {
    window.SpeechRecognition = undefined;
    render(<VoiceMicButton targetLabel="場所" onFinalText={vi.fn()} />);
    const button = screen.getByRole("button", { name: "場所を音声入力" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute("title")).toBe(
      "音声入力に未対応です。手入力は利用できます。",
    );
  });

  it("gives every mic an unambiguous accessible name", () => {
    render(
      <>
        <VoiceMicButton targetLabel="危険1" onFinalText={vi.fn()} />
        <VoiceMicButton targetLabel="危険2" onFinalText={vi.fn()} />
        <VoiceMicButton targetLabel="対策1-1" onFinalText={vi.fn()} />
      </>,
    );
    expect(screen.getByRole("button", { name: "危険1を音声入力" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "危険2を音声入力" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "対策1-1を音声入力" })).not.toBeNull();
  });

  it("does not log raw transcripts", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    render(<VoiceMicButton targetLabel="確認者" onFinalText={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "確認者を音声入力" }));
    act(() => RecognitionMock.latest?.finish("秘密の確認者名"));
    expect(log).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
  });

  it("aborts recognition and detaches transcript handlers on unmount", () => {
    const onFinalText = vi.fn();
    const view = render(
      <VoiceMicButton targetLabel="削除される危険" onFinalText={onFinalText} />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "削除される危険を音声入力" }),
    );
    const recognition = RecognitionMock.latest;
    view.unmount();
    expect(recognition?.abort).toHaveBeenCalledOnce();
    expect(recognition?.onresult).toBeNull();
    expect(recognition?.onerror).toBeNull();
    expect(recognition?.onend).toBeNull();
    recognition?.finish("遷移後に残ってはいけない文字列");
    expect(onFinalText).not.toHaveBeenCalled();
  });

  it("notifies the work suggestion path immediately after voice confirmation", () => {
    const onChange = vi.fn();
    const onVoiceFinalText = vi.fn();
    render(
      <TextareaWithVoice
        aria-label="作業内容"
        voiceLabel="作業内容"
        value=""
        onChange={onChange}
        onVoiceFinalText={onVoiceFinalText}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "作業内容を音声入力" }));
    act(() => RecognitionMock.latest?.finish("フォークリフトで荷下ろしする"));
    fireEvent.click(screen.getByRole("button", { name: "確定" }));
    expect(onVoiceFinalText).toHaveBeenCalledWith("フォークリフトで荷下ろしする");
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("preserves text entered before hydration when requested", async () => {
    const onChange = vi.fn();
    const element = (
      <InputWithVoice
        aria-label="場所"
        value=""
        onChange={onChange}
        preservePreHydrationInput
      />
    );
    const host = document.createElement("div");
    host.innerHTML = renderToString(element);
    document.body.append(host);
    host.querySelector<HTMLInputElement>("input")!.value = "横浜 港北";

    const view = render(element, { container: host, hydrate: true });

    await waitFor(() => expect(onChange).toHaveBeenCalledOnce());
    expect(onChange.mock.calls[0]?.[0].target.value).toBe("横浜 港北");
    view.unmount();
    host.remove();
  });
});
