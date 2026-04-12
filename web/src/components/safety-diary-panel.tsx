"use client";

import { useCallback, useState } from "react";
import { Plus, Trash2, Save, FileText, Download } from "lucide-react";
import { InputWithVoice, TextareaWithVoice } from "@/components/voice-input-field";

// ────────────────────────────────────────────────────────────
// 型定義
// ────────────────────────────────────────────────────────────

type DiaryCell = {
  id: string;
  value: string;
};

type DiaryRow = {
  id: string;
  cells: DiaryCell[];
};

type DiaryTable = {
  id: string;
  name: string;
  columns: string[];   // カラムヘッダー
  rows: DiaryRow[];
};

type DiaryEntry = {
  id: string;
  date: string;
  siteName: string;
  weather: string;
  supervisor: string;
  workContent: string;
  tables: DiaryTable[];
  notes: string;
  savedAt?: string;
};

// ────────────────────────────────────────────────────────────
// 定数
// ────────────────────────────────────────────────────────────

const STORAGE_KEY = "anzen-safety-diary-v1";

const DEFAULT_TABLES: DiaryTable[] = [
  {
    id: "safety-checks",
    name: "安全確認項目",
    columns: ["確認項目", "担当", "確認結果", "備考"],
    rows: [
      { id: "r1", cells: [{ id: "c1", value: "作業前点検（機械・工具）" }, { id: "c2", value: "" }, { id: "c3", value: "" }, { id: "c4", value: "" }] },
      { id: "r2", cells: [{ id: "c1", value: "保護具着用確認" }, { id: "c2", value: "" }, { id: "c3", value: "" }, { id: "c4", value: "" }] },
      { id: "r3", cells: [{ id: "c1", value: "KY活動の実施" }, { id: "c2", value: "" }, { id: "c3", value: "" }, { id: "c4", value: "" }] },
      { id: "r4", cells: [{ id: "c1", value: "作業区画・バリケード確認" }, { id: "c2", value: "" }, { id: "c3", value: "" }, { id: "c4", value: "" }] },
    ],
  },
  {
    id: "workers",
    name: "作業員一覧",
    columns: ["氏名", "所属", "作業内容", "入退場時刻", "備考"],
    rows: [
      { id: "r1", cells: [{ id: "c1", value: "" }, { id: "c2", value: "" }, { id: "c3", value: "" }, { id: "c4", value: "" }, { id: "c5", value: "" }] },
      { id: "r2", cells: [{ id: "c1", value: "" }, { id: "c2", value: "" }, { id: "c3", value: "" }, { id: "c4", value: "" }, { id: "c5", value: "" }] },
    ],
  },
  {
    id: "hazards",
    name: "危険・ヒヤリハット",
    columns: ["時刻", "発生場所", "内容", "対応処置", "報告先"],
    rows: [
      { id: "r1", cells: [{ id: "c1", value: "" }, { id: "c2", value: "" }, { id: "c3", value: "" }, { id: "c4", value: "" }, { id: "c5", value: "" }] },
    ],
  },
];

function createEntry(): DiaryEntry {
  const today = new Date().toISOString().split("T")[0];
  return {
    id: Date.now().toString(),
    date: today,
    siteName: "",
    weather: "",
    supervisor: "",
    workContent: "",
    tables: structuredClone(DEFAULT_TABLES),
    notes: "",
  };
}

function uid() {
  return Math.random().toString(36).slice(2, 8);
}

// ────────────────────────────────────────────────────────────
// ローカルストレージ
// ────────────────────────────────────────────────────────────

function loadEntries(): DiaryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DiaryEntry[];
  } catch {
    return [];
  }
}

function saveEntries(entries: DiaryEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// ────────────────────────────────────────────────────────────
// テーブル編集コンポーネント
// ────────────────────────────────────────────────────────────

function DiaryTableEditor({
  table,
  onChange,
  onDelete,
}: {
  table: DiaryTable;
  onChange: (next: DiaryTable) => void;
  onDelete: () => void;
}) {
  const updateColumnName = (colIdx: number, value: string) => {
    const columns = [...table.columns];
    columns[colIdx] = value;
    onChange({ ...table, columns });
  };

  const addColumn = () => {
    const columns = [...table.columns, "項目"];
    const rows = table.rows.map((row) => ({
      ...row,
      cells: [...row.cells, { id: uid(), value: "" }],
    }));
    onChange({ ...table, columns, rows });
  };

  const deleteColumn = (colIdx: number) => {
    if (table.columns.length <= 1) return;
    const columns = table.columns.filter((_, i) => i !== colIdx);
    const rows = table.rows.map((row) => ({
      ...row,
      cells: row.cells.filter((_, i) => i !== colIdx),
    }));
    onChange({ ...table, columns, rows });
  };

  const addRow = () => {
    const newRow: DiaryRow = {
      id: uid(),
      cells: table.columns.map(() => ({ id: uid(), value: "" })),
    };
    onChange({ ...table, rows: [...table.rows, newRow] });
  };

  const deleteRow = (rowIdx: number) => {
    const rows = table.rows.filter((_, i) => i !== rowIdx);
    onChange({ ...table, rows });
  };

  const updateCell = (rowIdx: number, cellIdx: number, value: string) => {
    const rows = table.rows.map((row, ri) => {
      if (ri !== rowIdx) return row;
      const cells = row.cells.map((cell, ci) => (ci === cellIdx ? { ...cell, value } : cell));
      return { ...row, cells };
    });
    onChange({ ...table, rows });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* テーブルヘッダー */}
      <div className="flex items-center justify-between rounded-t-xl border-b border-slate-200 bg-slate-50 px-4 py-2">
        <input
          className="flex-1 bg-transparent text-sm font-bold text-slate-900 outline-none"
          value={table.name}
          onChange={(e) => onChange({ ...table, name: e.target.value })}
          placeholder="テーブル名"
        />
        <button
          type="button"
          onClick={onDelete}
          className="ml-2 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
          title="テーブルを削除"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* スクロール可能なテーブル */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-xs">
          <thead>
            <tr className="bg-slate-50">
              {table.columns.map((col, colIdx) => (
                <th
                  key={colIdx}
                  className="border-b border-r border-slate-200 px-2 py-1 text-left font-semibold text-slate-700 last:border-r-0"
                >
                  <div className="flex items-center gap-1">
                    <input
                      className="min-w-0 flex-1 bg-transparent font-semibold outline-none"
                      value={col}
                      onChange={(e) => updateColumnName(colIdx, e.target.value)}
                    />
                    {table.columns.length > 1 && (
                      <button
                        type="button"
                        onClick={() => deleteColumn(colIdx)}
                        className="shrink-0 text-slate-300 hover:text-red-400"
                        title="列を削除"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </th>
              ))}
              {/* 列追加ボタン */}
              <th className="border-b border-slate-200 px-2 py-1">
                <button
                  type="button"
                  onClick={addColumn}
                  className="rounded px-1 py-0.5 text-emerald-600 hover:bg-emerald-50"
                  title="列を追加"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIdx) => (
              <tr key={row.id} className="group border-b border-slate-100 last:border-0 hover:bg-slate-50">
                {row.cells.map((cell, cellIdx) => (
                  <td key={cell.id} className="border-r border-slate-100 px-2 py-1 last:border-r-0">
                    <input
                      className="w-full bg-transparent text-slate-800 outline-none"
                      value={cell.value}
                      onChange={(e) => updateCell(rowIdx, cellIdx, e.target.value)}
                    />
                  </td>
                ))}
                {/* 行削除ボタン */}
                <td className="px-1 py-1">
                  <button
                    type="button"
                    onClick={() => deleteRow(rowIdx)}
                    className="invisible rounded p-0.5 text-slate-300 hover:text-red-400 group-hover:visible"
                    title="行を削除"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 行追加ボタン */}
      <div className="px-4 py-2">
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50"
        >
          <Plus className="h-3 w-3" />
          行を追加
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// メインパネル
// ────────────────────────────────────────────────────────────

export function SafetyDiaryPanel() {
  const [entries, setEntries] = useState<DiaryEntry[]>(loadEntries);
  const [current, setCurrent] = useState<DiaryEntry>(createEntry);
  const [savedLabel, setSavedLabel] = useState("");
  const [activeTab, setActiveTab] = useState<"edit" | "list">("edit");

  const updateEntry = useCallback((patch: Partial<DiaryEntry>) => {
    setCurrent((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleSave = () => {
    const entry: DiaryEntry = { ...current, savedAt: new Date().toISOString() };
    setEntries((prev) => {
      const exists = prev.findIndex((e) => e.id === entry.id);
      const next = exists >= 0 ? prev.map((e) => (e.id === entry.id ? entry : e)) : [entry, ...prev];
      saveEntries(next);
      return next;
    });
    setSavedLabel("保存しました ✓");
    setTimeout(() => setSavedLabel(""), 2000);
  };

  const handleNew = () => {
    setCurrent(createEntry());
    setActiveTab("edit");
  };

  const handleLoad = (entry: DiaryEntry) => {
    setCurrent(structuredClone(entry));
    setActiveTab("edit");
  };

  const handleDelete = (id: string) => {
    if (!confirm("この日誌を削除しますか？")) return;
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveEntries(next);
      return next;
    });
  };

  const addTable = () => {
    const newTable: DiaryTable = {
      id: uid(),
      name: "新しいテーブル",
      columns: ["項目", "内容"],
      rows: [{ id: uid(), cells: [{ id: uid(), value: "" }, { id: uid(), value: "" }] }],
    };
    updateEntry({ tables: [...current.tables, newTable] });
  };

  const updateTable = (idx: number, next: DiaryTable) => {
    const tables = current.tables.map((t, i) => (i === idx ? next : t));
    updateEntry({ tables });
  };

  const deleteTable = (idx: number) => {
    if (!confirm("このテーブルを削除しますか？")) return;
    const tables = current.tables.filter((_, i) => i !== idx);
    updateEntry({ tables });
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(current, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `安全衛生日誌_${current.date || "draft"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const WEATHER_OPTIONS = ["晴れ", "曇り", "雨", "雪", "強風", "暴風雨", "霧"];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      {/* ページヘッダー */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 lg:text-2xl">安全衛生日誌</h1>
          <p className="mt-1 text-sm text-slate-600">
            現場の安全活動を記録。テーブルの行・列・項目を自由に編集できます。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleNew}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <FileText className="h-4 w-4" />
            新規作成
          </button>
        </div>
      </div>

      {/* タブ */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {[
          { key: "edit", label: "日誌を記入" },
          { key: "list", label: `保存済み（${entries.length}件）` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as "edit" | "list")}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              activeTab === tab.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 記入フォーム */}
      {activeTab === "edit" && (
        <div className="space-y-6">
          {/* 基本情報 */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">基本情報</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block text-xs font-semibold text-slate-700">
                日付
                <InputWithVoice
                  type="date"
                  className="mt-1 w-full"
                  value={current.date}
                  onChange={(e) => updateEntry({ date: e.target.value })}
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                現場名・工事名
                <InputWithVoice
                  className="mt-1 w-full"
                  value={current.siteName}
                  onChange={(e) => updateEntry({ siteName: e.target.value })}
                  placeholder="○○ビル新築工事"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                天気
                <div className="mt-1 flex gap-1">
                  <InputWithVoice
                    className="flex-1"
                    value={current.weather}
                    onChange={(e) => updateEntry({ weather: e.target.value })}
                    placeholder="晴れ"
                  />
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {WEATHER_OPTIONS.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => updateEntry({ weather: w })}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
                        current.weather === w
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                安全衛生責任者
                <InputWithVoice
                  className="mt-1 w-full"
                  value={current.supervisor}
                  onChange={(e) => updateEntry({ supervisor: e.target.value })}
                  placeholder="氏名"
                />
              </label>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700">
                本日の作業内容（概要）
                <TextareaWithVoice
                  className="mt-1 min-h-20"
                  value={current.workContent}
                  onChange={(e) => updateEntry({ workContent: e.target.value })}
                  placeholder="型枠組立・コンクリート打設・配筋作業など"
                />
              </label>
            </div>
          </div>

          {/* テーブルセクション */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">記録テーブル</h2>
              <button
                type="button"
                onClick={addTable}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                <Plus className="h-3.5 w-3.5" />
                テーブルを追加
              </button>
            </div>
            {current.tables.map((table, idx) => (
              <DiaryTableEditor
                key={table.id}
                table={table}
                onChange={(next) => updateTable(idx, next)}
                onDelete={() => deleteTable(idx)}
              />
            ))}
          </div>

          {/* 備考 */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="block text-xs font-semibold text-slate-700">
              備考・特記事項
              <TextareaWithVoice
                className="mt-1 min-h-24"
                value={current.notes}
                onChange={(e) => updateEntry({ notes: e.target.value })}
                placeholder="明日の作業予定、残留リスク、連絡事項など"
              />
            </label>
          </div>

          {/* 保存ボタン */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-800"
            >
              <Save className="h-4 w-4" />
              日誌を保存
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              JSONで出力
            </button>
            {savedLabel && (
              <p className="text-sm font-semibold text-emerald-700">{savedLabel}</p>
            )}
          </div>
        </div>
      )}

      {/* 保存済み一覧 */}
      {activeTab === "list" && (
        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-12 text-center">
              <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">保存された日誌はありません。</p>
              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                日誌を記入する
              </button>
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">
                    {entry.date || "日付未設定"}
                    {entry.siteName && (
                      <span className="ml-2 font-normal text-slate-600">— {entry.siteName}</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {entry.weather && `天気: ${entry.weather} / `}
                    テーブル {entry.tables.length}件
                    {entry.savedAt && ` / 保存: ${new Date(entry.savedAt).toLocaleString("ja-JP")}`}
                  </p>
                  {entry.workContent && (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600">{entry.workContent}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => handleLoad(entry)}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    開く
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-500"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
