"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Mic, Save, Camera, Sparkles, X } from "lucide-react";
import {
  INDUSTRY_PRESETS,
  WEATHER_OPTIONS,
  requiredFieldsSchema,
  type IndustryPreset,
  type Weather,
} from "@/lib/safety-diary/schema";
import { addEntry, loadEntries, newId } from "@/lib/safety-diary/store";
import { INDUSTRY_PRESET_DATA } from "@/lib/safety-diary/presets";
import { loadProfile } from "@/lib/company-profile";

const INDUSTRY_LABELS: Record<IndustryPreset, string> = {
  construction: "建設",
  manufacturing: "製造",
  healthcare: "医療福祉",
  transport: "運輸",
  it: "IT",
  other: "その他",
};

const PROFILE_TO_DIARY: Record<string, IndustryPreset> = {
  construction: "construction",
  manufacturing: "manufacturing",
  healthcare: "healthcare",
  transport: "transport",
  it: "it",
  forestry: "other",
  logistics: "transport",
  other: "other",
};

/** 必須5項目のみで作成。3〜5分入力を目指したシンプルフォーム。 */
export function DiaryFormRequired() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = new Date().toISOString().slice(0, 10);
  const [industry, setIndustry] = useState<IndustryPreset>("construction");
  const [date, setDate] = useState(today);
  const [weather, setWeather] = useState<Weather>("晴れ");
  const [siteName, setSiteName] = useState("");
  const [workContent, setWorkContent] = useState("");
  const [kyResult, setKyResult] = useState("");
  const [nearMissOccurred, setNearMissOccurred] = useState(false);
  const [nearMissDetail, setNearMissDetail] = useState("");
  const [nearMissPhotoDataUrl, setNearMissPhotoDataUrl] = useState<string | null>(null);
  const [nearMissModalOpen, setNearMissModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  const preset = INDUSTRY_PRESET_DATA[industry];

  // 初回ロード: companyProfile を読んで業種・現場名を初期化
  useEffect(() => {
    const profile = loadProfile();
    if (profile.industry) {
      const mapped = PROFILE_TO_DIARY[profile.industry];
      if (mapped) setIndustry(mapped);
    }
    if (profile.sites[0]) setSiteName(profile.sites[0]);
  }, []);

  // fromYesterday=1: 直近の日誌から流用
  useEffect(() => {
    if (searchParams?.get("fromYesterday") !== "1") return;
    const all = loadEntries();
    if (all.length === 0) {
      setImportNotice("直近の日誌が見つかりませんでした。新規作成します。");
      return;
    }
    const sorted = [...all].sort((a, b) =>
      b.required.date.localeCompare(a.required.date)
    );
    const latest = sorted[0];
    setIndustry(latest.industry);
    setSiteName(latest.required.siteName);
    setWorkContent(latest.required.workContent);
    setKyResult(latest.required.kyResult);
    setImportNotice(`${latest.required.date} の日誌から流用しました（日付・天候・ヒヤリは要更新）`);
  }, [searchParams]);

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

  async function handleAiDraftKy() {
    if (!workContent.trim()) {
      alert("先に作業内容を入力してください");
      return;
    }
    setAiBusy(true);
    try {
      const res = await fetch("/api/ky-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "table",
          workContext: workContent,
          industryId: industry,
        }),
      });
      if (!res.ok) throw new Error("AI生成失敗");
      const data = (await res.json()) as {
        rows?: { hazard?: string; reduction?: string }[];
      };
      const top3 = (data.rows ?? []).slice(0, 3);
      if (top3.length === 0) throw new Error("AIが生成できませんでした");
      const text = top3
        .map((r, i) => `${i + 1}. 危険: ${r.hazard ?? ""}\n   対策: ${r.reduction ?? ""}`)
        .join("\n");
      setKyResult(text);
    } catch (e) {
      alert(e instanceof Error ? e.message : "AI生成に失敗しました");
    } finally {
      setAiBusy(false);
    }
  }

  function handlePhotoSelect(file: File) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") setNearMissPhotoDataUrl(result);
    };
    reader.readAsDataURL(file);
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
    // 写真は別キーで保存（容量対策で1枚のみ最新を保持）
    if (nearMissPhotoDataUrl) {
      try {
        window.localStorage.setItem(`safety-diary:photo:${id}`, nearMissPhotoDataUrl);
      } catch {}
    }
    router.push(`/safety-diary/${id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {importNotice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          ✓ {importNotice}
        </div>
      )}

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
          <div className="flex gap-1">
            <button
              type="button"
              onClick={handleAiDraftKy}
              disabled={aiBusy}
              className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-100 disabled:opacity-50"
              title="作業内容から危険・対策のたたき台を生成"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {aiBusy ? "生成中…" : "AIたたき台"}
            </button>
            <Link
              href="/ky"
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              /ky で作成 →
            </Link>
          </div>
        </div>
        <textarea
          value={kyResult}
          onChange={(e) => setKyResult(e.target.value)}
          placeholder="例: 高所作業時はフルハーネス着用徹底、墜落防止親綱を点検"
          rows={4}
          className="mt-3 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          required
        />
        <p className="mt-1 text-[10px] text-slate-500">
          「AIたたき台」で危険3項目・対策3項目の下書きを自動生成します。再生成可能。
        </p>
      </div>

      {/* ヒヤリハット */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold text-emerald-700">必須 5/5</p>
        <h3 className="mt-1 text-sm font-bold text-slate-900">ヒヤリハット有無</h3>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setNearMissOccurred(false);
              setNearMissModalOpen(false);
            }}
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
            onClick={() => {
              setNearMissOccurred(true);
              setNearMissModalOpen(true);
            }}
            aria-pressed={nearMissOccurred}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
              nearMissOccurred
                ? "border-amber-500 bg-amber-50 text-amber-800"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            有り（3秒記録モーダル）
          </button>
        </div>
        {nearMissOccurred && !nearMissModalOpen && (
          <div className="mt-3 space-y-2">
            <textarea
              value={nearMissDetail}
              onChange={(e) => setNearMissDetail(e.target.value)}
              placeholder="ヒヤリハット内容を簡潔に記録"
              rows={2}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {nearMissPhotoDataUrl && (
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={nearMissPhotoDataUrl} alt="ヒヤリハット写真" className="h-16 w-16 rounded border object-cover" />
                <button
                  type="button"
                  onClick={() => setNearMissPhotoDataUrl(null)}
                  className="rounded border border-rose-200 px-2 py-1 text-[10px] text-rose-700 hover:bg-rose-50"
                >
                  写真を削除
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setNearMissModalOpen(true)}
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
            >
              ✎ モーダルを再表示（写真追加・音声入力）
            </button>
          </div>
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

      {/* ヒヤリハット 3秒記録モーダル */}
      {nearMissModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="near-miss-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 id="near-miss-title" className="text-sm font-bold text-amber-800">
                ⚠️ ヒヤリハット 3秒記録
              </h3>
              <button
                type="button"
                onClick={() => setNearMissModalOpen(false)}
                aria-label="閉じる"
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              何があったかを声で残す or 写真1枚で記録できます。後で詳細を編集できます。
            </p>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => handleVoiceInput((v) => setNearMissDetail((cur) => (cur ? `${cur} / ${v}` : v)))}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700"
              >
                <Mic className="h-3.5 w-3.5" />
                音声入力
              </button>
              <label className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border border-amber-400 bg-white px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-50">
                <Camera className="h-3.5 w-3.5" />
                写真を撮る
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoSelect(file);
                  }}
                />
              </label>
            </div>

            <textarea
              value={nearMissDetail}
              onChange={(e) => setNearMissDetail(e.target.value)}
              placeholder="例: 配筋作業中、足場の歩み板が不安定で踏み外しそうになった"
              rows={3}
              className="mt-3 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />

            {nearMissPhotoDataUrl && (
              <div className="mt-2 flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={nearMissPhotoDataUrl}
                  alt="ヒヤリハット写真"
                  className="h-20 w-20 rounded-lg border object-cover"
                />
                <button
                  type="button"
                  onClick={() => setNearMissPhotoDataUrl(null)}
                  className="rounded border border-rose-200 px-2 py-1 text-[10px] text-rose-700 hover:bg-rose-50"
                >
                  写真を削除
                </button>
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNearMissModalOpen(false)}
                className="rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
              >
                記録して閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
