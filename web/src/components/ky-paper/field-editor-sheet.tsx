"use client";

/**
 * F1→O10（KY用紙 直接操作UI）: 欄タップで開く入力エディタ。
 *
 * contentEditable を使わない核心＝紙のセルはタップ標的、入力はこの専用UIで行う
 * （日本語IME・音声入力・プルダウンが通常のフォーム部品として確実に動く）。
 * スマホ: 下から出るボトムシート / PC: 右下のパネル。
 * 「次の欄へ」で紙の記入順（KY_PAPER_FIELDS.next）を辿れる。
 * 入力フォントは16px以上（iOS Safari のフォーカス自動ズームを防ぐ）。
 */

import { useEffect, useRef } from "react";
import Link from "next/link";
import { InputWithVoice, TextareaWithVoice } from "@/components/voice-input-field";
import type { KyInstructionRecordState } from "@/lib/types/operations";
import { getKyPaperFieldDef, nextKyPaperFieldKey, parseRiskFieldKey, type KyPaperFieldKey } from "@/lib/ky/paper-fields";
import {
  MONTH_OPTIONS,
  dayOptions,
  temperatureOptions,
  yearOptions,
  LIKELIHOOD_OPTIONS,
  SEVERITY_OPTIONS,
} from "@/lib/ky/pulldown-options";
import { WEATHER_REGIONS } from "@/lib/ky/weather-autofill";
import type { Worker } from "@/lib/ky/workers-master";
import type { WorkerGroup } from "@/lib/ky/participant-select";
import type { KyHazardSuggestion } from "@/lib/ky/gemini-suggest";
import { StatusBadge } from "@/components/ui/status-badge";

export type FieldEditorSheetProps = {
  fieldKey: KyPaperFieldKey;
  record: KyInstructionRecordState;
  patch: (p: Partial<KyInstructionRecordState>) => void;
  onClose: () => void;
  /** 「次の欄へ」（次が無い欄では「完了」になる） */
  onSelectField: (key: KyPaperFieldKey) => void;
  /** 天気・気温エディタ用（既存の自動取得をそのまま流用） */
  weather: {
    region: string;
    setRegion: (id: string) => void;
    fetchWeather: () => void;
    busy: boolean;
  };
  /** O10（続き）: 参加者エディタ用（作業員マスターのチップ選択。従来UIと同じ純粋関数群を共有） */
  participants: {
    workers: Worker[];
    regularWorkers: Worker[];
    workerGroups: WorkerGroup[];
    selectedNames: ReadonlySet<string>;
    toggleWorker: (w: Worker, checked: boolean) => void;
    addWorkers: (toAdd: Worker[]) => void;
    clearMasterWorkers: () => void;
  };
  /** O10（第四弾）: 危険のポイント欄でのAI提案（従来UIの🤖危険箇所提案をエディタ内に統合）。 */
  ai?: {
    busy: boolean;
    suggestions: KyHazardSuggestion[];
    source: "gemini" | "fallback" | null;
    onSuggest: () => void;
    /** 提案をこの欄が属する危険行(index)へ反映 */
    onApply: (s: KyHazardSuggestion, riskIndex: number) => void;
  };
};

const selectCls =
  "min-h-[44px] rounded-lg border border-slate-300 bg-white px-2 text-base text-slate-900";

export function FieldEditorSheet({
  fieldKey,
  record,
  patch,
  onClose,
  onSelectField,
  weather,
  participants,
  ai,
}: FieldEditorSheetProps) {
  const def = getKyPaperFieldDef(fieldKey);
  const next = nextKyPaperFieldKey(fieldKey, record);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  // 危険のポイント欄（risk.N.hazard）のときだけAI提案を出す。対策/評価欄では出さない。
  const riskMeta = parseRiskFieldKey(fieldKey);
  const showAi = ai !== undefined && riskMeta?.part === "hazard";

  // 開く直前にフォーカスがあった要素（タップしたセル）を記憶し、シートが閉じたら復帰。
  // 「次の欄へ」でfieldKeyが変わってもシート自体は閉じないため、マウント/アンマウント時のみ実行。
  // 下の初期フォーカス処理より先に宣言し、記憶がフォーカス移動より先に走るようにする。
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    return () => {
      previouslyFocused?.focus();
    };
  }, []);

  // 開いたら最初の入力へフォーカス（キーボード/音声にすぐ入れる）。
  // 参加者エディタはチップ選択が主操作でフォーカス移動が邪魔になるため対象外。
  useEffect(() => {
    if (def.type === "participants") return;
    const first = sheetRef.current?.querySelector<HTMLElement>("input, select");
    first?.focus();
  }, [fieldKey, def.type]);

  // Escape で閉じる（既存の「…」シートと同じ作法）＋ Tabキーをシート内に閉じ込める（フォーカストラップ）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = sheetRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const years = yearOptions();
  const days = dayOptions(Number(record.workDateYear) || new Date().getFullYear(), Number(record.workDateMonth) || 1);
  const temps = temperatureOptions();

  return (
    <>
      {/* 背面タップで閉じる（用紙の見え方は変えないよう薄め） */}
      <div className="fixed inset-0 z-40 bg-black/20" aria-hidden onClick={onClose} />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${def.label}の入力`}
        data-testid="field-editor-sheet"
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[26rem] sm:rounded-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-base font-bold text-slate-900">{def.label}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="min-h-[44px] min-w-[44px] rounded-full text-slate-500 hover:bg-slate-100"
          >
            ×
          </button>
        </div>

        {def.type === "text" && (
          <InputWithVoice
            value={def.get?.(record) ?? ""}
            onChange={(e) => patch(def.set?.(record, e.target.value) ?? {})}
            placeholder={def.placeholder}
            className="min-h-[44px] text-base"
          />
        )}

        {def.type === "textarea" && (
          <TextareaWithVoice
            rows={3}
            value={def.get?.(record) ?? ""}
            onChange={(e) => patch(def.set?.(record, e.target.value) ?? {})}
            placeholder={def.placeholder}
            className="min-h-[88px] text-base"
          />
        )}

        {/* O10（第四弾）: 危険のポイント欄でのAI提案。従来UI（クラシック表示）と同じ /api/ky/suggest を共有。 */}
        {showAi && ai && (
          <div className="mt-2">
            <button
              type="button"
              onClick={ai.onSuggest}
              disabled={ai.busy}
              className="min-h-[44px] w-full rounded-lg border border-indigo-300 bg-indigo-50 px-3 text-xs font-bold text-indigo-800 hover:bg-indigo-100 disabled:opacity-50"
            >
              {ai.busy ? "AIが分析中…" : "🤖 AIに危険箇所を提案させる"}
            </button>
            {ai.source && ai.suggestions.length > 0 && (
              <div className="mt-2 space-y-1.5 rounded-lg border border-indigo-200 bg-indigo-50/40 p-2">
                <p className="text-[11px] font-semibold text-indigo-900">
                  {ai.source === "gemini" ? "本物のAI（Gemini）の提案" : "定型提案（AI未設定/応答不可のフォールバック）"}
                  ：気になる項目を「反映」でこの欄へ取り込めます
                </p>
                {ai.suggestions.map((s, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 rounded border border-indigo-200 bg-white p-1.5">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800">
                        {s.hazard}
                        <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] text-slate-600">評価値{s.evaluation}（{s.riskLabel}）</span>
                        {!s.grounded && <StatusBadge tone="warning" size="sm" className="ml-1">要確認</StatusBadge>}
                      </p>
                      <p className="text-[11px] text-slate-600">対策: {s.reduction || "—"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => ai.onApply(s, riskMeta!.index)}
                      className="min-h-[44px] shrink-0 rounded border border-indigo-300 bg-white px-2 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50"
                    >
                      反映
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {def.type === "date3" && (
          <div className="flex flex-wrap items-center gap-1.5">
            <select
              aria-label="年"
              value={record.workDateYear}
              onChange={(e) => patch({ workDateYear: e.target.value })}
              className={selectCls}
            >
              {years.map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
            <span className="text-sm">年</span>
            <select
              aria-label="月"
              value={record.workDateMonth}
              onChange={(e) => patch({ workDateMonth: e.target.value })}
              className={selectCls}
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m} value={String(m)}>{m}</option>
              ))}
            </select>
            <span className="text-sm">月</span>
            <select
              aria-label="日"
              value={record.workDateDay}
              onChange={(e) => patch({ workDateDay: e.target.value })}
              className={selectCls}
            >
              {days.map((d) => (
                <option key={d} value={String(d)}>{d}</option>
              ))}
            </select>
            <span className="text-sm">日</span>
          </div>
        )}

        {def.type === "riskEval" && def.riskIndex !== undefined && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-sm text-slate-700">
              可能性
              <select
                aria-label="可能性"
                value={String(record.riskRows[def.riskIndex]?.likelihood ?? 1)}
                onChange={(e) => {
                  const idx = def.riskIndex!;
                  const v = Number(e.target.value) as 1 | 2 | 3;
                  patch({ riskRows: record.riskRows.map((row, i) => (i === idx ? { ...row, likelihood: v } : row)) });
                }}
                className={selectCls}
              >
                {LIKELIHOOD_OPTIONS.map((o) => (
                  <option key={o.value} value={String(o.value)}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-sm text-slate-700">
              重大性
              <select
                aria-label="重大性"
                value={String(record.riskRows[def.riskIndex]?.severity ?? 1)}
                onChange={(e) => {
                  const idx = def.riskIndex!;
                  const v = Number(e.target.value) as 1 | 2 | 3;
                  patch({ riskRows: record.riskRows.map((row, i) => (i === idx ? { ...row, severity: v } : row)) });
                }}
                className={selectCls}
              >
                {SEVERITY_OPTIONS.map((o) => (
                  <option key={o.value} value={String(o.value)}>{o.label}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        {def.type === "weatherTemp" && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <select
                aria-label="地域"
                value={weather.region}
                onChange={(e) => weather.setRegion(e.target.value)}
                className={selectCls}
              >
                {WEATHER_REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={weather.fetchWeather}
                disabled={weather.busy}
                className="min-h-[44px] rounded-lg border border-sky-300 bg-sky-50 px-3 text-sm font-bold text-sky-800 hover:bg-sky-100 disabled:opacity-50"
              >
                {weather.busy ? "取得中…" : "自動取得"}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                value={record.weather}
                onChange={(e) => patch({ weather: e.target.value })}
                placeholder="天気（例: 晴れ）"
                className="min-h-[44px] w-32 rounded-lg border border-slate-300 px-2 text-base"
              />
              <select
                aria-label="気温"
                value={record.temperature}
                onChange={(e) => patch({ temperature: e.target.value })}
                className={selectCls}
              >
                <option value="">—</option>
                {temps.map((t) => (
                  <option key={t} value={String(t)}>{t}</option>
                ))}
              </select>
              <span className="text-sm">℃</span>
            </div>
          </div>
        )}

        {def.type === "participants" && (
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            <p className="text-xs font-semibold text-slate-500">
              選択中 {participants.selectedNames.size}名
            </p>
            {participants.workers.length === 0 ? (
              <p className="text-sm text-slate-500">
                <Link href="/ky/workers" className="font-semibold text-emerald-700 underline">
                  作業員マスター
                </Link>
                に登録すると、ここでタップするだけで参加者を選べます。
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-1.5">
                  {participants.regularWorkers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => participants.addWorkers(participants.regularWorkers)}
                      title="常用（毎日来る）作業員をまとめて参加者に追加します"
                      className="min-h-[44px] rounded-full border border-amber-400 bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100"
                    >
                      ⭐ 常用{participants.regularWorkers.length}名をまとめて選ぶ
                    </button>
                  )}
                  {participants.workerGroups.length > 1 &&
                    participants.workerGroups.map((g) => (
                      <button
                        key={g.affiliation}
                        type="button"
                        onClick={() => participants.addWorkers(g.members)}
                        title={`${g.label}の作業員${g.members.length}名をまとめて追加`}
                        className="min-h-[44px] rounded-full border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                      >
                        {g.label}全員
                      </button>
                    ))}
                  {participants.selectedNames.size > 0 && (
                    <button
                      type="button"
                      onClick={participants.clearMasterWorkers}
                      title="選択した作業員をすべて外す"
                      className="min-h-[44px] rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                    >
                      クリア
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {participants.workerGroups.map((g) => (
                    <div key={g.affiliation} className="flex flex-wrap items-center gap-1.5">
                      {participants.workerGroups.length > 1 && (
                        <span className="w-full text-[11px] font-semibold text-slate-400 sm:w-auto sm:pr-1">
                          {g.label}
                        </span>
                      )}
                      {g.members.map((w) => {
                        const checked = participants.selectedNames.has(w.name);
                        return (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => participants.toggleWorker(w, !checked)}
                            className={`min-h-[44px] rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                              checked
                                ? "border-emerald-600 bg-emerald-600 text-white"
                                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {checked ? "✓ " : ""}
                            {w.name}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* 閉じるは右上×・背面タップ・Escape で担う（フッターは前進操作のみ＝
            同名「閉じる」ボタンの重複と読み上げの二重を避ける）。 */}
        <div className="mt-4 flex items-center justify-end gap-2">
          {next ? (
            <button
              type="button"
              onClick={() => onSelectField(next)}
              className="min-h-[44px] rounded-lg bg-sky-600 px-4 text-sm font-bold text-white hover:bg-sky-700"
            >
              次の欄へ →
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700"
            >
              完了
            </button>
          )}
        </div>
      </div>
    </>
  );
}
