"use client";

import { Trash2 } from "lucide-react";
import type { KyRecordSummary } from "@/lib/types/operations";

type Props = {
  records: KyRecordSummary[];
  onDelete: (id: string) => void;
};

function formatSavedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString("ja-JP", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function KyRecordList({ records, onDelete }: Props) {
  if (records.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-bold text-slate-900 sm:text-lg">保存済みKY記録</h2>
        <p className="mt-3 text-center text-sm text-slate-400">
          まだ保存された記録がありません。<br />
          フォームに入力して「保存」ボタンを押すと、ここに一覧表示されます。
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 sm:text-lg">保存済みKY記録</h2>
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
          {records.length}件
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        最大30件を保持。古い記録は自動削除されます。
      </p>
      <ul className="mt-3 space-y-2">
        {records.map((rec) => (
          <li
            key={rec.id}
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 hover:border-emerald-200 hover:bg-emerald-50/40 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-900">{rec.workDate}</span>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600">
                  {rec.weather}
                </span>
              </div>
              <p className="mt-0.5 text-xs font-semibold text-emerald-800 truncate">
                {rec.companyName}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-600 truncate">{rec.workDetail}</p>
              <p className="mt-1 text-[10px] text-slate-400">保存: {formatSavedAt(rec.savedAt)}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`${rec.companyName} ${rec.workDate} の記録を削除します。よろしいですか？`)) {
                  onDelete(rec.id);
                }
              }}
              className="shrink-0 min-h-[44px] min-w-[44px] rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
              aria-label={`${rec.companyName} ${rec.workDate} の記録を削除`}
              title="削除"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
