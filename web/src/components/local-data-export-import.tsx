"use client";

import { useState } from "react";
import { AlertTriangle, Download, Upload, Trash2 } from "lucide-react";

/**
 * 端末内（localStorage）保存データのエクスポート / インポート / 全削除パネル。
 *
 * 当サイトの大半の状態（KY記録・自社プロファイル・サイネージ設定・チャット履歴・
 * 言語/フォントサイズ等）は端末の localStorage に保存される。サーバ同期は無い。
 * 端末を変える・ブラウザデータを消すとデータは失われる。利用者にその仕様を明示し、
 * 自分でバックアップ取得・他端末へ移行できる導線を提供する。
 */

const APP_KEY_PREFIXES = [
  "ky-",
  "chemical-ra:",
  "chatbot_",
  "anzen-",
  "elearning",
  "company-profile",
  "language",
  "easy-japanese",
  "furigana",
  "first-visit-",
  "high-contrast",
  "large-font",
  "onboarding",
  "signage",
  "company_profile_skip",
];

type Snapshot = {
  exported_at: string;
  source: "anzen-ai-localstorage";
  schema_version: 1;
  data: Record<string, string>;
};

function collectKeys(): string[] {
  const out: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (!k) continue;
    if (APP_KEY_PREFIXES.some((p) => k.startsWith(p))) out.push(k);
  }
  return out;
}

export function LocalDataExportImport() {
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    setError(null);
    setInfo(null);
    try {
      const keys = collectKeys();
      const data: Record<string, string> = {};
      for (const k of keys) {
        const v = window.localStorage.getItem(k);
        if (v !== null) data[k] = v;
      }
      const snapshot: Snapshot = {
        exported_at: new Date().toISOString(),
        source: "anzen-ai-localstorage",
        schema_version: 1,
        data,
      };
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.download = `anzen-ai-backup_${ts}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      setInfo(`${keys.length} 件のキーをエクスポートしました。`);
    } catch (e) {
      setError(`エクスポート失敗: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleImport(file: File) {
    setError(null);
    setInfo(null);
    try {
      const txt = await file.text();
      const parsed = JSON.parse(txt) as Partial<Snapshot>;
      if (parsed.source !== "anzen-ai-localstorage" || !parsed.data) {
        setError("ANZEN AI のバックアップファイルではありません。source 不一致。");
        return;
      }
      const entries = Object.entries(parsed.data).filter(
        ([k]) => APP_KEY_PREFIXES.some((p) => k.startsWith(p))
      );
      if (entries.length === 0) {
        setError("インポート可能なキーが見つかりませんでした。");
        return;
      }
      const ok = window.confirm(
        `${entries.length} 件のキーを上書きインポートします。よろしいですか？`
      );
      if (!ok) return;
      for (const [k, v] of entries) {
        if (typeof v === "string") window.localStorage.setItem(k, v);
      }
      setInfo(`${entries.length} 件のキーをインポートしました。ページを再読み込みしてください。`);
    } catch (e) {
      setError(`インポート失敗: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function handleClearAll() {
    setError(null);
    setInfo(null);
    const ok = window.confirm(
      "この端末に保存されている ANZEN AI のデータをすべて削除します。元に戻せません。よろしいですか？"
    );
    if (!ok) return;
    const keys = collectKeys();
    for (const k of keys) window.localStorage.removeItem(k);
    setInfo(`${keys.length} 件のキーを削除しました。ページを再読み込みしてください。`);
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <p className="flex items-start gap-1.5 font-semibold">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>このサイトのデータは「この端末」のブラウザにのみ保存されます</span>
        </p>
        <ul className="ml-5 mt-1 list-disc space-y-0.5 leading-5">
          <li>サーバー同期はありません。端末を変える・シークレットモードで開く・ブラウザデータを消すと失われます。</li>
          <li>他端末へ持ち出す場合や万一に備え、定期的にエクスポートしてください。</li>
          <li>対象: KY記録・自社プロファイル・サイネージ設定・チャット履歴・言語/フォントなど</li>
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800 hover:bg-blue-100"
        >
          <Download className="h-3.5 w-3.5" />
          エクスポート（JSONダウンロード）
        </button>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100">
          <Upload className="h-3.5 w-3.5" />
          インポート（JSONを選ぶ）
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImport(f);
              e.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          onClick={handleClearAll}
          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
          すべて削除
        </button>
      </div>

      {info && (
        <p className="rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
          {info}
        </p>
      )}
      {error && (
        <p className="rounded border border-rose-300 bg-rose-50 px-3 py-2 text-[11px] text-rose-800">
          {error}
        </p>
      )}
    </div>
  );
}
