"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Upload, ShieldCheck } from "lucide-react";
import {
  collectSafeAiData,
  serializeBackup,
  parseBackup,
  applyBackup,
  countSafeAiKeys,
} from "@/lib/site-records/backup";

export function RecordsBackup() {
  const [keyCount, setKeyCount] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorageは描画後にのみ参照可
    setKeyCount(countSafeAiKeys());
  }, []);

  function handleExport() {
    if (typeof window === "undefined") return;
    const data = collectSafeAiData();
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const json = serializeBackup(data, now.toISOString());
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `anzen-records-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setMsg(`${Object.keys(data).length}件のデータを書き出しました。`);
  }

  function handleImportClick() {
    fileRef.current?.click();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const bundle = parseBackup(String(reader.result ?? ""));
      if (!bundle) {
        setMsg("読み込めませんでした。正しいバックアップJSONを選んでください。");
        return;
      }
      const n = Object.keys(bundle.data).length;
      if (!window.confirm(`バックアップ（${n}件）をこの端末に取り込みます。同じ項目は上書きされます。よろしいですか？`)) {
        return;
      }
      const applied = applyBackup(bundle);
      setMsg(`${applied}件を取り込みました。画面を更新します…`);
      setTimeout(() => window.location.reload(), 800);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 print:hidden">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-700">
        <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        データのバックアップ（この端末↔ファイル）
      </h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        各ツールの記録はこの端末（ブラウザ）に保存されています。端末の故障・買い替え・初期化に備えて、JSONファイルへ書き出し（バックアップ）／取り込み（復元・別端末への移行）ができます。
        {keyCount !== null && <span className="ml-1 font-semibold text-slate-600">保存中: {keyCount}件</span>}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={handleExport} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">
          <Download className="h-3.5 w-3.5" aria-hidden="true" /> バックアップを書き出す
        </button>
        <button type="button" onClick={handleImportClick} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
          <Upload className="h-3.5 w-3.5" aria-hidden="true" /> バックアップを取り込む
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleFile} className="hidden" />
        {msg && <span className="text-xs font-semibold text-emerald-700">{msg}</span>}
      </div>
    </section>
  );
}
