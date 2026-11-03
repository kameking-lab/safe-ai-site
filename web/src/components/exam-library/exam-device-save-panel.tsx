"use client";

import { HardDrive } from "lucide-react";

interface ExamDeviceSavePanelProps {
  enabled: boolean;
  status: string;
  onToggle: (enabled: boolean) => void;
}

/** 端末内保存の明示的なオプトイン。初期値は常にオフ。 */
export function ExamDeviceSavePanel({ enabled, status, onToggle }: ExamDeviceSavePanelProps) {
  return (
    <section
      aria-labelledby="exam-save-title"
      className="rounded-2xl border-2 border-slate-300 bg-slate-50 p-4 text-slate-950 dark:border-slate-600 dark:bg-slate-900 dark:text-white forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]"
    >
      <h2 id="exam-save-title" className="flex items-center gap-2 font-black">
        <HardDrive className="h-5 w-5" aria-hidden="true" />
        進捗の保存（任意）
      </h2>
      <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 font-bold">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onToggle(event.target.checked)}
          aria-describedby="exam-save-help"
          className="h-5 w-5 shrink-0 accent-emerald-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 forced-colors:accent-[Highlight]"
        />
        この端末に保存する
      </label>
      <p id="exam-save-help" className="mt-1 text-xs leading-5 text-slate-700 dark:text-slate-200">
        初期設定では保存しません。オンにした場合だけ、このブラウザ内に選んだ番号とメモを保存します。サーバーへは送信しません。オフにすると、この回の保存データを削除します。
      </p>
      <p role="status" aria-live="polite" className="mt-2 text-xs font-bold leading-5">
        {status}
      </p>
    </section>
  );
}
