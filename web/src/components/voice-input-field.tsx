"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";

type SpeechErrorEvent = { error?: string; message?: string };

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript?: string }>> }) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function describeVoiceError(err: string | undefined): string {
  switch (err) {
    case "not-allowed":
    case "NotAllowedError":
    case "permission-denied":
      return "マイクが許可されていません。ブラウザのアドレスバー🔒から「マイク」を許可してください。";
    case "no-speech":
      return "音声が検出されませんでした。もう一度お試しください。";
    case "audio-capture":
      return "マイクが見つかりません。デバイスを接続してください。";
    case "network":
      return "ネットワークエラーが発生しました。接続を確認してください。";
    case "not-supported":
    case "service-not-allowed":
      return "このブラウザは音声入力に未対応です（推奨：Chrome/Edge）。";
    case "aborted":
      return "音声入力が中断されました。";
    case "language-not-supported":
      return "日本語が設定されていません。ブラウザ言語を確認してください。";
    default:
      return err ? `音声エラー: ${err}` : "音声エラー";
  }
}

type SpeechRecognitionCtor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

function useSpeechToText() {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<BrowserSpeechRecognition | null>(null);
  const textRef = useRef("");

  // useSyncExternalStore で SSR/クライアント間のハイドレーションを安全に処理
  const canUse = useSyncExternalStore(
    () => () => {},
    () => !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    () => false,
  );

  const start = useCallback((onEnded?: (text: string) => void) => {
    setError(null);
    textRef.current = "";
    const Ctor = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
    if (!Ctor) {
      setError(describeVoiceError("not-supported"));
      return;
    }
    try {
      const recognition = new Ctor();
      recognition.lang = "ja-JP";
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.onresult = (event) => {
        let t = "";
        for (let i = 0; i < event.results.length; i += 1) {
          t += event.results[i][0]?.transcript ?? "";
        }
        textRef.current = t;
      };
      recognition.onerror = (event) => {
        setListening(false);
        setError(describeVoiceError(event?.error));
      };
      recognition.onend = () => {
        setListening(false);
        onEnded?.(textRef.current.trim());
      };
      ref.current = recognition;
      recognition.start();
      setListening(true);
    } catch (err) {
      const name = err instanceof Error ? err.name : undefined;
      setError(describeVoiceError(name));
      setListening(false);
    }
  }, []);

  const stop = useCallback(() => {
    ref.current?.stop();
  }, []);

  return { listening, error, canUse, start, stop };
}

type VoiceMicButtonProps = {
  onFinalText: (text: string) => void;
  className?: string;
};

export function VoiceMicButton({ onFinalText, className }: VoiceMicButtonProps) {
  const { listening, error, canUse, start, stop } = useSpeechToText();

  const toggle = () => {
    if (listening) {
      stop();
      return;
    }
    start((text) => {
      if (text) onFinalText(text);
    });
  };

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <button
        type="button"
        aria-label={listening ? "音声入力を停止" : "音声入力"}
        className={
          className ??
          `rounded-full border px-2 py-1 text-[10px] font-semibold ${
            listening ? "border-rose-400 bg-rose-50 text-rose-800" : "border-slate-300 bg-white text-slate-700"
          }`
        }
        disabled={!canUse}
        onClick={toggle}
      >
        {listening ? "停止" : "音声"}
      </button>
      {error && (
        <span
          className="max-w-[240px] text-[10px] leading-snug text-rose-600"
          role="alert"
          title={error}
        >
          {error}
        </span>
      )}
    </span>
  );
}

type InputWithVoiceProps = React.InputHTMLAttributes<HTMLInputElement>;

export function InputWithVoice({ value, onChange, className, ...rest }: InputWithVoiceProps) {
  const v = typeof value === "string" ? value : "";
  return (
    <div className="flex items-center gap-2">
      <input
        {...rest}
        className={`min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm ${className ?? ""}`}
        onChange={onChange}
        value={v}
      />
      <VoiceMicButton
        onFinalText={(text) => {
          const ev = { target: { value: v ? `${v} ${text}` : text } } as React.ChangeEvent<HTMLInputElement>;
          onChange?.(ev);
        }}
      />
    </div>
  );
}

type TextareaWithVoiceProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextareaWithVoice({ value, onChange, className, ...rest }: TextareaWithVoiceProps) {
  const v = typeof value === "string" ? value : "";
  return (
    <div className="space-y-1">
      <div className="flex justify-end">
        <VoiceMicButton
          onFinalText={(text) => {
            const next = v ? `${v}\n${text}` : text;
            const ev = { target: { value: next } } as React.ChangeEvent<HTMLTextAreaElement>;
            onChange?.(ev);
          }}
        />
      </div>
      <textarea
        {...rest}
        className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ${className ?? ""}`}
        onChange={onChange}
        value={v}
      />
    </div>
  );
}
