"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mic, Save } from "lucide-react";
import {
  INDUSTRY_PRESETS,
  WEATHER_OPTIONS,
  requiredFieldsSchema,
  type IndustryPreset,
  type Weather,
} from "@/lib/safety-diary/schema";
import { addEntry, newId } from "@/lib/safety-diary/store";
import { INDUSTRY_PRESET_DATA } from "@/lib/safety-diary/presets";

const INDUSTRY_LABELS: Record<IndustryPreset, string> = {
  construction: "建設",
  manufacturing: "製造",
  healthcare: "医療福祉",
  transport: "運輸",
  it: "IT",
  other: "その他",
};

/** 必須5項目のみで作成。3〜5分入力を目指したシンプルフォーム。 */
export function DiaryFormRequired() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [industry, setIndustry] = useState<IndustryPreset>("construction");
  const [date, setDate] = useState(today);
  const [weather, setWeather] = useState<Weather>("晴れ");
  const [siteName, setSiteName] = useState("");
  const [workContent, setWorkContent] = useState("");
  const [kyResult, setKyResult] = useState("");
  const [nearMissOccurred, setNearMissOccurred] = useState(false);
  const [nearMissDetail, setNearMissDetail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const preset = INDUSTRY_PRESET_DATA[industry];

  function handleVoiceInput(setter: (v: string) => void) {
    if (typeof window === "undefined") return;
    type SR = { new (): {
      lang: string;
      interimResults: boolean;
      onresult: (e: { results: { 0: { transcript: string } }[] }) => void;
      onerror: () => void;
      start: () => void;
    } };
    const w = window as unknown as { webkitSpeechRecognition?: SR; SpeechRecognition?: SR };
    const Ctor = w.webkitSpeechRecognition ?? w.SpeechRecognition;
    if (!Ctor) {
      alert("このブラウザは音声入力に対応していません。Chrome系ブラウザでお試しください。");
      return;
    }
    const recog = new Ctor();
    recog.lang = "ja-JP";
    recog.interimResults = false;
    recog.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript ?? "";
      setter(text);
    };
    recog.onerror = () => {};
    recog.start();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = requiredFieldsSchema.safeParse({
      date,
      weather,
      siteName,
      workContent,
      kyResult,
      nearMissOccurred,
      nearMissDetail: nearMissOccurred ? nearMissDetail : undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "入力に誤りがあります");
      return;
    }
    const id = newId();
    const now = new Date().toISOString();
    addEntry({
      id,
      industry,
      required: parsed.data,
      optional: {
        contractorWorks: [],
        requiredQualifications: [],
        predictedDisasters: [],
      },
      weatherAlerts: [],
      similarAccidentIds: [],
      relatedLawRevisionIds: [],
      createdAt: now,
      updatedAt: now,
    });
    router.push(`/safety-diary/${id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 業種プリセット */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-xs font-bold text-slate-700">業種プリセット</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {INDUSTRY_PRESETS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setIndustry(id)}
              aria-pressed={industry === id}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                industry === id
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {INDUSTRY_LABELS[id]}
            </button>
          ))}
        </div>
      </div>

      {/* 日付・天候 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold text-emerald-700">必須 1/5</p>
        <h3 className="mt-1 text-sm font-bold text-slate-900">日付・天候</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">日付</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">天候</span>
            <select
              value={weather}
              onChange={(e) => setWeather(e.target.value as Weather)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {WEATHER_OPTIONS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* 現場名 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold text-emerald-700">必須 2/5</p>
        <h3 className="mt-1 text-sm font-bold text-slate-900">現場名</h3>
        <input
          type="text"
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          placeholder="例: 〇〇ビル新築工事 1F"
          className="mt-3 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          required
        />
      </div>

      {/* 作業内容（音声入力対応） */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-emerald-700">必須 3/5</p>
            <h3 className="mt-1 text-sm font-bold text-slate-900">作業内容（音声入力対応）</h3>
          </div>
          <button
            type="button"
            onClick={() => handleVoiceInput(setWorkContent)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Mic className="h-3.5 w-3.5" />
            音声入力
          </button>
        </div>
        <textarea
          value={workContent}
          onChange={(e) => setWorkContent(e.target.value)}
          placeholder="例: 2階スラブ配筋・型枠組立"
          rows={3}
          className="mt-3 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          required
        />
        {preset.workSuggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {preset.workSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setWorkContent((cur) => (cur ? `${cur} / ${s}` : s))}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-200"
              >
                + {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KY結果 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-emerald-700">必須 4/5</p>
            <h3 className="mt-1 text-sm font-bold text-slate-900">KY結果</h3>
          </div>
          <Link
            href="/ky"
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            /ky で作成 →
          </Link>
        </div>
        <textarea
          value={kyResult}
          onChange={(e) => setKyResult(e.target.value)}
          placeholder="例: 高所作業時はフルハーネス着用徹底、墜落防止親綱を点検"
          rows={3}
          className="mt-3 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          required
        />
        <p className="mt-1 text-[10px] text-slate-500">
          /ky で作成した内容をコピー&ペーストできます。将来的に直接転記対応予定。
        </p>
      </div>

      {/* ヒヤリハット */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold text-emerald-700">必須 5/5</p>
        <h3 className="mt-1 text-sm font-bold text-slate-900">ヒヤリハット有無</h3>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setNearMissOccurred(false)}
            aria-pressed={!nearMissOccurred}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
              !nearMissOccurred
                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            無し
          </button>
          <button
            type="button"
            onClick={() => setNearMissOccurred(true)}
            aria-pressed={nearMissOccurred}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
              nearMissOccurred
                ? "border-amber-500 bg-amber-50 text-amber-800"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            有り
          </button>
        </div>
        {nearMissOccurred && (
          <textarea
            value={nearMissDetail}
            onChange={(e) => setNearMissDetail(e.target.value)}
            placeholder="ヒヤリハット内容を簡潔に記録"
            rows={2}
            className="mt-3 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Link
          href="/safety-diary"
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          キャンセル
        </Link>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
        >
          <Save className="h-4 w-4" />
          保存
        </button>
      </div>
    </form>
  );
}
