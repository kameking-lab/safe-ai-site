"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript?: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

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
      setError("音声入力未対応");
      return;
    }
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
    recognition.onerror = () => setError("音声エラー");
    recognition.onend = () => {
      setListening(false);
      onEnded?.(textRef.current.trim());
    };
    ref.current = recognition;
    recognition.start();
    setListening(true);
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
      {error && <span className="text-[9px] text-rose-600">{error}</span>}
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
