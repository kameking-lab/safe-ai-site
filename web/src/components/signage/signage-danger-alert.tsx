"use client";

import { useEffect, useState } from "react";
import { AlertOctagon, AlertTriangle, CircleDot, Siren, Volume2, X } from "lucide-react";

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

// 無人運用(1日流しっぱなし)で、ブラウザ再読込後も自動発動の設定を保持するためのキー。
// 再起動で黙って監視OFFになると安全機能が無効化されたことに誰も気づけないため永続化する。
const AUTO_SPEAK_STORAGE_KEY = "signage-danger-autospeak";

export function SignageDangerAlert({ jmaHeadline, warnings }: Props) {
  const [overlay, setOverlay] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(AUTO_SPEAK_STORAGE_KEY) === "1";
  });

  const onToggleAutoSpeak = (checked: boolean) => {
    setAutoSpeak(checked);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AUTO_SPEAK_STORAGE_KEY, checked ? "1" : "0");
    }
  };

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
      {/* 色文法（柱0）: 赤い外枠は「高リスク警報を検知中」のときだけ。平常時に常時赤枠だと
          赤＝危険・停止の意味が薄れ、本当の警報時に効かなくなる。発動ボタン自体は
          非常ボタンの慣例どおり常時赤のまま。 */}
      <div
        data-danger-active={isHighRisk ? "1" : "0"}
        className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
          isHighRisk ? "border-rose-500 bg-rose-950/60" : "border-slate-600 bg-slate-900/70"
        }`}
      >
        <AlertOctagon className={`h-4 w-4 ${isHighRisk ? "text-rose-300" : "text-slate-400"}`} />
        <span className={`font-semibold xl:text-sm ${isHighRisk ? "text-rose-200" : "text-slate-300"}`}>
          危険イベント全画面アラート
        </span>
        <button
          type="button"
          onClick={handleManualAlert}
          className="min-h-[44px] rounded border border-rose-400 bg-rose-700 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-600 xl:text-sm"
        >
          <Siren className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />アラート発動（手動）
        </button>
        <label className={`inline-flex min-h-[44px] items-center gap-1 text-[11px] xl:text-sm ${isHighRisk ? "text-rose-100" : "text-slate-200"}`}>
          <input
            type="checkbox"
            checked={autoSpeak}
            onChange={(e) => onToggleAutoSpeak(e.target.checked)}
            className="rounded"
          />
          警報時に自動発動 + 音声読み上げ
        </label>
        {/* 無人運用での安心材料: 自動発動が有効=監視中であることを常時可視化。
            再読込後も localStorage で復元されるため「いつの間にかOFF」を防ぐ。 */}
        {autoSpeak && !isHighRisk && (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-700 px-1.5 py-0.5 text-[10px] font-bold text-emerald-50 xl:text-sm">
            <CircleDot className="h-3 w-3" aria-hidden="true" />警報を監視中
          </span>
        )}
        {isHighRisk && (
          <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white xl:text-sm">
            <AlertTriangle className="mr-1 inline h-3 w-3 align-[-2px]" aria-hidden="true" />高リスク警報を検知中
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
            className="absolute right-6 top-6 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/20 hover:bg-white/30"
            aria-label="アラートを閉じる"
          >
            <X className="h-6 w-6 text-white" />
          </button>
          <AlertOctagon className="h-32 w-32 animate-pulse" />
          <p className="mt-6 text-5xl font-extrabold sm:text-7xl"><AlertTriangle className="mr-3 inline h-[1em] w-[1em] align-[-0.1em]" aria-hidden="true" />危険イベント</p>
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
