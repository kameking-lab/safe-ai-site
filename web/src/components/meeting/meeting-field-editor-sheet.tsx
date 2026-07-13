"use client";

/**
 * S1（打合せ用紙 直接操作UI・第一弾〜第六弾）: 欄タップで開く入力エディタ。
 * KYの FieldEditorSheet と同型（欄タップ＝タップ標的／入力は専用UIで行う／
 * 「次の欄へ」で紙の記入順を辿る／入力フォントは16px以上）。
 * 第三弾で各社マトリクス7部位のうち会社名/階層・作業内容・使用機械・リスク（重大性/可能性）・
 * 安全衛生指示事項・協力会社責任者・実績人員を追加。第四弾で残り3部位（必要資格・予想災害＝
 * タグ選択、予定人員＝固定プルダウン）を追加し7部位すべてに対応。第六弾で点検項目8カテゴリ
 * （カテゴリ内の各項目を44px四方のtri-state（○/×/－）ボタンで直接タップ切替。テキスト入力が
 * 無いためタッチ操作のみで完結し、他の型と異なりオートフォーカス対象外）を追加。
 */

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { InputWithVoice, TextareaWithVoice } from "@/components/voice-input-field";
import { MeetingTagField } from "@/components/meeting/meeting-tag-field";
import { STATUS_MARK } from "@/components/meeting/meeting-print-sheet";
import {
  CONTRACTOR_TYPES,
  MEETING_COUNT_OPTIONS,
  MEETING_WEATHER_OPTIONS,
  PRIORITY_LABEL,
  type ChecklistStatus,
  type ContractorType,
  type MeetingContractorRow,
  type MeetingRecord,
} from "@/lib/meeting/schema";
import {
  getMeetingPaperFieldDef,
  nextMeetingPaperFieldKey,
  parseContractorFieldKey,
  setChecklistItemStatus,
  setContractorCompanyField,
  setContractorPlannedCountField,
  setContractorRiskField,
  setContractorTagsField,
  type MeetingPaperFieldKey,
} from "@/lib/meeting/paper-fields";
import { MONTH_OPTIONS, dayOptions, yearOptions } from "@/lib/ky/pulldown-options";

const CHECKLIST_STATUS_OPTIONS: { status: ChecklistStatus; label: string; on: string }[] = [
  { status: "ok", label: "該当・実施", on: "bg-emerald-600 text-white" },
  { status: "ng", label: "要是正", on: "bg-rose-600 text-white" },
  { status: "na", label: "該当無", on: "bg-slate-400 text-white" },
];

export type MeetingFieldEditorSheetProps = {
  fieldKey: MeetingPaperFieldKey;
  record: MeetingRecord;
  patch: (p: Partial<MeetingRecord>) => void;
  onClose: () => void;
  /** 「次の欄へ」（次が無い欄では「完了」になる） */
  onSelectField: (key: MeetingPaperFieldKey) => void;
  /** S1（続き・第七弾）: 作業内容欄でのAI提案（従来UIと同じ /api/meeting/suggest を共有・その行に直接反映）。 */
  onSuggestRow?: (id: string) => void;
  /** AI提案が実行中の行id（従来UIのbusyRowと同じstate） */
  suggestBusyId?: string | null;
  /** S1（第九弾）: 会社名エディタ内の行操作（クラシックの＋下位/削除/KYを作成と同じ挙動） */
  onAddChildRow?: (row: MeetingContractorRow) => void;
  onRemoveRow?: (id: string) => void;
  kyHrefForRow?: (row: MeetingContractorRow) => string;
};

const selectCls = "min-h-[44px] rounded-lg border border-slate-300 bg-white px-2 text-base text-slate-900";

export function MeetingFieldEditorSheet({ fieldKey, record, patch, onClose, onSelectField, onSuggestRow, suggestBusyId, onAddChildRow, onRemoveRow, kyHrefForRow }: MeetingFieldEditorSheetProps) {
  const def = getMeetingPaperFieldDef(fieldKey);
  const next = nextMeetingPaperFieldKey(fieldKey, record);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const contractorRow = def.contractorId ? record.contractors.find((c) => c.id === def.contractorId) : undefined;
  const checklistCategory = def.checklistCategoryKey ? record.checklist.find((c) => c.key === def.checklistCategoryKey) : undefined;
  // 作業内容欄のときだけAI提案ボタンを出す（予想災害・指示・必要資格・リスクの入力元のため）。
  // workContentのフィールド定義はcontractorIdを持たない（get/setがcontractorTextGet/Setで完結するため）ので、
  // キー自体から行idを取り出す。
  const workContentContractorId = parseContractorFieldKey(def.key)?.part === "workContent" ? parseContractorFieldKey(def.key)!.id : null;

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
  useEffect(() => {
    const first = sheetRef.current?.querySelector<HTMLElement>("input, select, textarea");
    first?.focus();
  }, [fieldKey]);

  // Escape で閉じる（KY版・「…」シートと同じ作法）＋ Tabキーをシート内に閉じ込める（フォーカストラップ）
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

  return (
    <>
      {/* 背面タップで閉じる（用紙の見え方は変えないよう薄め） */}
      <div className="fixed inset-0 z-40 bg-black/20" aria-hidden onClick={onClose} />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${def.label}の入力`}
        data-testid="meeting-field-editor-sheet"
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
            list={def.historyList}
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

        {/* S1（続き・第七弾）: 作業内容欄でのAI提案。従来UI（クラシック表示）と同じ /api/meeting/suggest を共有し、
            編集中のその行に直接反映（予想災害・安全衛生指示事項・必要資格・リスクをまとめて自動入力）。 */}
        {workContentContractorId && onSuggestRow && (
          <button
            type="button"
            disabled={suggestBusyId === workContentContractorId}
            onClick={() => onSuggestRow(workContentContractorId)}
            className="mt-2 min-h-[44px] w-full rounded-lg border border-indigo-300 bg-indigo-50 px-3 text-sm font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
          >
            {suggestBusyId === workContentContractorId ? "AI提案中…" : <><Sparkles className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />AI提案（予想災害・指示・資格・リスクを自動入力）</>}
          </button>
        )}

        {def.type === "date" && (
          <input
            type="date"
            aria-label={def.label}
            value={def.get?.(record) ?? ""}
            onChange={(e) => patch(def.set?.(record, e.target.value) ?? {})}
            className="min-h-[44px] w-full rounded-lg border border-slate-300 px-2 text-base"
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

        {def.type === "weatherTemp" && (
          <div className="flex flex-wrap items-center gap-1.5">
            <select
              aria-label="天気"
              value={record.weather}
              onChange={(e) => patch({ weather: e.target.value })}
              className={selectCls}
            >
              <option value="">―</option>
              {MEETING_WEATHER_OPTIONS.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
            <input
              aria-label="気温"
              value={record.temperature}
              onChange={(e) => patch({ temperature: e.target.value })}
              placeholder="気温（例: 25）"
              className="min-h-[44px] w-28 rounded-lg border border-slate-300 px-2 text-base"
            />
            <span className="text-sm">℃</span>
          </div>
        )}

        {def.type === "contractorCompany" && contractorRow && (
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm text-slate-700">
              階層
              <select
                aria-label="階層"
                value={contractorRow.type}
                onChange={(e) => patch(setContractorCompanyField(record, contractorRow.id, { type: e.target.value as ContractorType }))}
                className={selectCls}
              >
                {CONTRACTOR_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <InputWithVoice
              value={contractorRow.companyName}
              onChange={(e) => patch(setContractorCompanyField(record, contractorRow.id, { companyName: e.target.value }))}
              placeholder="業者名"
              list={def.historyList}
              className="min-h-[44px] text-base"
            />
            {/* S1（第九弾）: 行操作。クラシックの行ヘッダー（＋下位・KYを作成・削除）と同一挙動 */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {onAddChildRow && (
                <button
                  type="button"
                  onClick={() => onAddChildRow(contractorRow)}
                  className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  ＋下位の会社を追加
                </button>
              )}
              {kyHrefForRow && (
                <Link
                  href={kyHrefForRow(contractorRow)}
                  className="inline-flex min-h-[44px] items-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  KYを作成
                </Link>
              )}
              {onRemoveRow && (
                <button
                  type="button"
                  onClick={() => onRemoveRow(contractorRow.id)}
                  className="min-h-[44px] rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                >
                  この行を削除
                </button>
              )}
            </div>
          </div>
        )}

        {def.type === "contractorTags" && contractorRow && def.tagField && (
          <MeetingTagField
            values={contractorRow[def.tagField]}
            onChange={(v) => patch(setContractorTagsField(record, contractorRow.id, def.tagField!, v))}
          />
        )}

        {def.type === "contractorPlannedCount" && contractorRow && (
          <select
            aria-label={def.label}
            value={contractorRow.plannedCount}
            onChange={(e) => patch(setContractorPlannedCountField(record, contractorRow.id, e.target.value))}
            className={selectCls}
          >
            {MEETING_COUNT_OPTIONS.map((n) => (
              <option key={n} value={n}>{n || "―"}</option>
            ))}
          </select>
        )}

        {def.type === "contractorRisk" && contractorRow && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-sm text-slate-700">
              重大性
              <select
                aria-label="重大性"
                value={String(contractorRow.risk.severity)}
                onChange={(e) => patch(setContractorRiskField(record, contractorRow.id, "severity", Number(e.target.value)))}
                className={selectCls}
              >
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <span className="text-slate-400">×</span>
            <label className="flex items-center gap-1.5 text-sm text-slate-700">
              可能性
              <select
                aria-label="可能性"
                value={String(contractorRow.risk.likelihood)}
                onChange={(e) => patch(setContractorRiskField(record, contractorRow.id, "likelihood", Number(e.target.value)))}
                className={selectCls}
              >
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <span className="text-slate-400">→</span>
            <span className="rounded bg-slate-200 px-2 py-1 text-sm font-bold text-slate-700">{PRIORITY_LABEL[contractorRow.risk.priority]}</span>
          </div>
        )}

        {def.type === "checklist" && checklistCategory && (
          <ul className="space-y-1.5">
            {checklistCategory.items.map((it) => (
              <li key={it.key} className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 text-sm text-slate-700">{it.label}</span>
                <span className="flex shrink-0 gap-1">
                  {CHECKLIST_STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.status}
                      type="button"
                      aria-label={`${it.label}: ${opt.label}`}
                      aria-pressed={it.status === opt.status}
                      onClick={() => patch(setChecklistItemStatus(record, checklistCategory.key, it.key, opt.status))}
                      className={`min-h-[44px] min-w-[44px] rounded-lg text-base font-bold ${
                        it.status === opt.status ? opt.on : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      {STATUS_MARK[opt.status]}
                    </button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        )}

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
