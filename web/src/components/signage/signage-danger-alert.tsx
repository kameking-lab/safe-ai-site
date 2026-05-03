"use client";

import { useEffect, useState } from "react";
import { AlertOctagon, Volume2, X } from "lucide-react";

type Props = {
  jmaHeadline?: string | null;
  warnings?: { code: string; status: string }[] | null;
};

function speak(text: string) {
  if (typeof window === "undefined") return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ja-JP";
  utter.rate = 1.0;
  utter.volume = 1.0;
  synth.cancel();
  synth.speak(utter);
}

const HIGH_RISK_KEYWORDS = ["特別警報", "警報", "暴風", "大雨", "落雷", "地震", "津波"];

export function SignageDangerAlert({ jmaHeadline, warnings }: Props) {
  const [overlay, setOverlay] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);

  const isHighRisk = (() => {
    const text = `${jmaHeadline ?? ""} ${(warnings ?? []).map((w) => w.status).join(" ")}`;
    return HIGH_RISK_KEYWORDS.some((k) => text.includes(k));
  })();

  // 自動発話: 警報レベルに到達したら自動的に画面+音声を起動
  useEffect(() => {
    if (!autoSpeak) return;
    if (!isHighRisk) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOverlay(true);
    const text = `重要警報。${jmaHeadline ?? "気象庁から警報が発表されています"}。屋外作業を中断し、安全確保を優先してください。`;
    speak(text);
  }, [autoSpeak, isHighRisk, jmaHeadline]);

  const handleManualAlert = () => {
    setOverlay(true);
    const text = `危険イベント発生。${jmaHeadline ?? "現場で危険事象が発生しました"}。直ちに作業を中断し、安全な場所に避難してください。`;
    speak(text);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-rose-700/60 bg-rose-950/40 px-3 py-2 text-xs">
        <AlertOctagon className="h-4 w-4 text-rose-300" />
        <span className="font-semibold text-rose-200">危険イベント全画面アラート</span>
        <button
          type="button"
          onClick={handleManualAlert}
          className="rounded border border-rose-400 bg-rose-700 px-2 py-1 text-[11px] font-bold text-white hover:bg-rose-600"
        >
          🚨 アラート発動（手動）
        </button>
        <label className="inline-flex items-center gap-1 text-[11px] text-rose-100">
          <input
            type="checkbox"
            checked={autoSpeak}
            onChange={(e) => setAutoSpeak(e.target.checked)}
            className="rounded"
          />
          警報時に自動発動 + 音声読み上げ
        </label>
        {isHighRisk && (
          <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            ⚠ 高リスク警報を検知中
          </span>
        )}
      </div>

      {overlay && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-rose-700 text-white"
          onClick={() => setOverlay(false)}
        >
          <button
            type="button"
            onClick={() => setOverlay(false)}
            className="absolute right-6 top-6 rounded-full bg-white/20 p-2 hover:bg-white/30"
            aria-label="アラートを閉じる"
          >
            <X className="h-6 w-6 text-white" />
          </button>
          <AlertOctagon className="h-32 w-32 animate-pulse" />
          <p className="mt-6 text-5xl font-extrabold sm:text-7xl">⚠ 危険イベント</p>
          <p className="mt-4 max-w-3xl px-6 text-center text-2xl font-bold leading-snug sm:text-4xl">
            {jmaHeadline ?? "現場で危険事象が発生しました。直ちに作業を中断してください。"}
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const text = `重要警報。${jmaHeadline ?? "気象庁から警報が発表されています"}。屋外作業を中断し、安全確保を優先してください。`;
              speak(text);
            }}
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-4 text-2xl font-bold text-rose-700 shadow-lg hover:bg-rose-50"
          >
            <Volume2 className="h-6 w-6" />
            音声読み上げ
          </button>
          <p className="mt-6 text-base text-white/80">画面のどこをクリックしても閉じます</p>
        </div>
      )}
    </>
  );
}
