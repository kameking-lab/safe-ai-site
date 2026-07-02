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
import { InputWithVoice, TextareaWithVoice } from "@/components/voice-input-field";
import type { KyInstructionRecordState } from "@/lib/types/operations";
import { getKyPaperFieldDef, nextKyPaperFieldKey, type KyPaperFieldKey } from "@/lib/ky/paper-fields";
import {
  MONTH_OPTIONS,
  dayOptions,
  temperatureOptions,
  yearOptions,
  LIKELIHOOD_OPTIONS,
  SEVERITY_OPTIONS,
} from "@/lib/ky/pulldown-options";
import { WEATHER_REGIONS } from "@/lib/ky/weather-autofill";

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
}: FieldEditorSheetProps) {
  const def = getKyPaperFieldDef(fieldKey);
  const next = nextKyPaperFieldKey(fieldKey, record);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  // 開いたら最初の入力へフォーカス（キーボード/音声にすぐ入れる）
  useEffect(() => {
    const first = sheetRef.current?.querySelector<HTMLElement>("input, select");
    first?.focus();
  }, [fieldKey]);

  // Escape で閉じる（既存の「…」シートと同じ作法）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
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
