"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

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
  abort?: () => void;
};

export function describeVoiceError(err: string | undefined): string {
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
  const cancelledRef = useRef(false);

  // useSyncExternalStore で SSR/クライアント間のハイドレーションを安全に処理
  const canUse = useSyncExternalStore(
    () => () => {},
    () => !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    () => false,
  );

  const start = useCallback((onEnded?: (text: string) => void) => {
    setError(null);
    textRef.current = "";
    cancelledRef.current = false;
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
        if (!cancelledRef.current) onEnded?.(textRef.current.trim());
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

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    textRef.current = "";
    ref.current?.abort?.();
    setListening(false);
  }, []);

  useEffect(
    () => () => {
      cancelledRef.current = true;
      textRef.current = "";
      const recognition = ref.current;
      ref.current = null;
      if (!recognition) return;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort?.();
    },
    [],
  );

  return { listening, error, canUse, start, stop, cancel };
}

type VoiceMicButtonProps = {
  onFinalText: (text: string) => void;
  className?: string;
  /** 対象欄が読み上げだけで一意に分かる名前。 */
  targetLabel?: string;
};

export function VoiceMicButton({
  onFinalText,
  className,
  targetLabel = "入力欄",
}: VoiceMicButtonProps) {
  const { listening, error, canUse, start, stop, cancel } = useSpeechToText();
  const [transcript, setTranscript] = useState("");
  const [showPrivacy, setShowPrivacy] = useState(false);

  const toggle = () => {
    if (listening) {
      stop();
      return;
    }
    setTranscript("");
    setShowPrivacy(true);
    start((text) => {
      if (text) setTranscript(text);
    });
  };

  const retry = () => {
    setTranscript("");
    setShowPrivacy(true);
    start((text) => {
      if (text) setTranscript(text);
    });
  };

  return (
    <span className="relative inline-flex w-[44px] shrink-0 flex-col items-end gap-[4px]">
      <button
        type="button"
        data-compact-text
        aria-label={
          listening
            ? `${targetLabel}の音声入力を停止`
            : `${targetLabel}を音声入力`
        }
        className={
          className ??
          `min-h-[44px] min-w-[44px] rounded-full border px-[6px] py-[8px] text-[12px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
            listening ? "border-rose-400 bg-rose-50 text-rose-800" : "border-slate-300 bg-white text-slate-700"
          }`
        }
        disabled={!canUse}
        onClick={toggle}
        title={
          canUse
            ? `${targetLabel}をブラウザー・OSの音声認識で入力`
            : "音声入力に未対応です。手入力は利用できます。"
        }
      >
        {listening ? "停止" : "音声"}
      </button>
      {listening && (
        <span
          role="status"
          aria-live="polite"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700"
        >
          <span
            className="h-2 w-2 rounded-full bg-rose-600 motion-safe:animate-pulse"
            aria-hidden="true"
          />
          録音中
        </span>
      )}
      {listening && (
        <button
          type="button"
          onClick={() => {
            cancel();
            setTranscript("");
            setShowPrivacy(false);
          }}
          className="min-h-11 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 underline underline-offset-2"
        >
          キャンセル
        </button>
      )}
      {transcript && !listening && (
        <span
          role="group"
          aria-label={`${targetLabel}の認識候補`}
          className="absolute right-0 top-12 z-50 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-sky-300 bg-white p-3 text-left shadow-lg"
        >
          <label className="block text-xs font-bold text-slate-800">
            認識候補を確認
            <textarea
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              aria-label={`${targetLabel}の音声認識候補`}
              className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 p-2 text-base text-slate-950"
            />
          </label>
          <span className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                const confirmed = transcript.trim();
                if (confirmed) onFinalText(confirmed);
                setTranscript("");
                setShowPrivacy(false);
              }}
              className="min-h-11 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-bold text-white"
            >
              確定
            </button>
            <button
              type="button"
              onClick={retry}
              className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800"
            >
              再録音
            </button>
            <button
              type="button"
              onClick={() => {
                setTranscript("");
                setShowPrivacy(false);
              }}
              className="min-h-11 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 underline underline-offset-2"
            >
              キャンセル
            </button>
          </span>
        </span>
      )}
      {showPrivacy && !transcript && !listening && (
        <span className="absolute right-0 top-12 z-40 w-[min(16rem,calc(100vw-2rem))] rounded-lg border border-slate-200 bg-white p-2 text-[10px] leading-snug text-slate-600 shadow">
          ブラウザー・OSの音声認識を使用。音声はアプリに保存・送信しません。
        </span>
      )}
      {error && (
        <span
          className="absolute right-0 top-12 z-40 w-[min(15rem,calc(100vw-2rem))] rounded-lg border border-rose-200 bg-white p-2 text-[10px] leading-snug text-rose-700 shadow"
          role="alert"
          title={error}
        >
          {error}
        </span>
      )}
    </span>
  );
}

type InputWithVoiceProps = React.InputHTMLAttributes<HTMLInputElement> & {
  voiceLabel?: string;
  onVoiceFinalText?: (nextValue: string) => void;
  preservePreHydrationInput?: boolean;
};

export function InputWithVoice({
  value,
  onChange,
  className,
  voiceLabel,
  onVoiceFinalText,
  preservePreHydrationInput = false,
  ...rest
}: InputWithVoiceProps) {
  const v = typeof value === "string" ? value : "";
  const inputRef = useRef<HTMLInputElement>(null);
  const previousValueRef = useRef(v);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!preservePreHydrationInput || !inputRef.current) return;
    const input = inputRef.current;
    const domValue = input.value;
    const previousValue = previousValueRef.current;
    previousValueRef.current = v;

    if (domValue !== previousValue && v === previousValue) {
      onChangeRef.current?.({
        target: input,
        currentTarget: input,
      } as React.ChangeEvent<HTMLInputElement>);
      return;
    }
    if (domValue !== v) input.value = v;
  }, [preservePreHydrationInput, v]);

  return (
    <div className="flex min-w-0 items-center gap-[min(0.5rem,8px)]">
      <input
        {...rest}
        ref={inputRef}
        className={`min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:text-sm ${className ?? ""}`}
        onChange={onChange}
        {...(preservePreHydrationInput
          ? { defaultValue: v, suppressHydrationWarning: true }
          : { value: v })}
      />
      <VoiceMicButton
        targetLabel={voiceLabel ?? rest["aria-label"] ?? "入力欄"}
        onFinalText={(text) => {
          const next = v ? `${v} ${text}` : text;
          const ev = { target: { value: next } } as React.ChangeEvent<HTMLInputElement>;
          onChange?.(ev);
          onVoiceFinalText?.(next);
        }}
      />
    </div>
  );
}

type TextareaWithVoiceProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  voiceLabel?: string;
  onVoiceFinalText?: (nextValue: string) => void;
};

export function TextareaWithVoice({
  value,
  onChange,
  className,
  voiceLabel,
  onVoiceFinalText,
  ...rest
}: TextareaWithVoiceProps) {
  const v = typeof value === "string" ? value : "";
  return (
    <div className="flex min-w-0 items-start gap-[min(0.5rem,8px)]">
      <textarea
        {...rest}
        className={`min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:text-sm ${className ?? ""}`}
        onChange={onChange}
        value={v}
      />
      <div className="shrink-0">
        <VoiceMicButton
          targetLabel={voiceLabel ?? rest["aria-label"] ?? "入力欄"}
          onFinalText={(text) => {
            const next = v ? `${v}\n${text}` : text;
            const ev = { target: { value: next } } as React.ChangeEvent<HTMLTextAreaElement>;
            onChange?.(ev);
            onVoiceFinalText?.(next);
          }}
        />
      </div>
    </div>
  );
}
