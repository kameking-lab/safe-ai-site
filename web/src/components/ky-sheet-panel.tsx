"use client";

import { useMemo, useRef, useState } from "react";
import type { KySheetDraft } from "@/lib/types/operations";

type KySheetPanelProps = {
  value: KySheetDraft;
  onChange: (next: KySheetDraft) => void;
  onSave: () => void;
  onBuildPdfPreview: () => void;
  savedLabel?: string;
  briefingLines: string[];
};

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
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

export function KySheetPanel({ value, onChange, onSave, onBuildPdfPreview, savedLabel, briefingLines }: KySheetPanelProps) {
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  const canUseSpeech = useMemo(
    () => typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    []
  );

  const update = (patch: Partial<KySheetDraft>) => onChange({ ...value, ...patch });

  const startListening = () => {
    setVoiceError(null);
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      setVoiceError("このブラウザでは音声入力APIが利用できません。下の手入力欄をご利用ください。");
      return;
    }
    const recognition = new Ctor();
    recognition.lang = "ja-JP";
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join("");
      setVoiceText(transcript);
    };
    recognition.onerror = () => setVoiceError("音声入力に失敗しました。手入力へ切り替えてください。");
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const applyVoiceToNotes = () => {
    if (!voiceText.trim()) return;
    update({ notes: value.notes ? `${value.notes}\n${voiceText}` : voiceText });
    setVoiceText("");
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-base font-bold text-slate-900 sm:text-lg">KY用紙</h2>
      <p className="mt-1 text-xs text-slate-600">現場入力 → 朝礼共有 → PDF出力までつなぐたたき台です。</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-700">日付
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" type="date" value={value.date} onChange={(e) => update({ date: e.target.value })} />
        </label>
        <label className="text-xs font-semibold text-slate-700">現場名
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={value.siteName} onChange={(e) => update({ siteName: e.target.value })} />
        </label>
      </div>
      <div className="mt-3 space-y-3">
        {[
          { key: "workSummary", label: "作業内容" },
          { key: "expectedRisks", label: "想定危険" },
          { key: "countermeasures", label: "対策" },
          { key: "callAndResponse", label: "指差呼称・確認事項" },
          { key: "notes", label: "補足メモ" },
        ].map((field) => (
          <label key={field.key} className="block text-xs font-semibold text-slate-700">
            {field.label}
            <textarea
              className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              onChange={(event) => update({ [field.key]: event.target.value } as Partial<KySheetDraft>)}
              value={value[field.key as keyof KySheetDraft] as string}
            />
          </label>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold text-slate-700">マイク入力（たたき台）</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50" disabled={isListening || !canUseSpeech} onClick={startListening} type="button">録音開始</button>
          <button className="rounded-md bg-slate-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50" disabled={!isListening} onClick={stopListening} type="button">録音停止</button>
          <button className="rounded-md bg-sky-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50" disabled={!voiceText.trim()} onClick={applyVoiceToNotes} type="button">文字起こしをメモに反映</button>
        </div>
        {voiceError && <p className="mt-2 text-xs text-rose-700">{voiceError}</p>}
        <textarea className="mt-2 min-h-16 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" onChange={(e) => setVoiceText(e.target.value)} placeholder="録音結果または手入力をここで編集できます" value={voiceText} />
      </div>
      <div className="mt-3 rounded-lg border border-slate-200 bg-amber-50 p-3">
        <p className="text-xs font-semibold text-amber-800">朝礼要点（/signage 連携想定）</p>
        <ul className="mt-1 space-y-1 text-xs text-amber-900">
          {briefingLines.slice(0, 3).map((line) => <li key={line}>- {line}</li>)}
        </ul>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white" onClick={onSave} type="button">KY用紙を保存</button>
        <button className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white" onClick={onBuildPdfPreview} type="button">PDFプレビューを更新</button>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">{savedLabel}</p>
    </section>
  );
}
