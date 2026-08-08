"use client";

import { useState } from "react";
import { AlertTriangle, Download, Upload, Trash2 } from "lucide-react";
import {
  collectAppLocalStorageKeys,
  isAppLocalStorageKey,
} from "@/lib/local-data-registry";
import { sanitizeImportedLocalDataValue } from "@/lib/local-data-import-safety";
import { removeGoogleOptionalCookies } from "@/lib/google-cookie-privacy";

/**
 * 端末内（localStorage）保存データのエクスポート / インポート / 全削除パネル。
 *
 * 当サイトの大半の状態（KY記録・自社プロファイル・サイネージ設定・チャット履歴・
 * 言語/フォントサイズ等）は端末の localStorage に保存される。構成済み機能では
 * Supabase 等へクラウド同期される場合があるため、端末削除とクラウド削除は区別する。
 * 自分でバックアップ取得・他端末へ移行できる導線を提供する。
 */

type Snapshot = {
  exported_at: string;
  source: "anzen-ai-localstorage";
  schema_version: 1;
  data: Record<string, string>;
};

function collectKeys(): string[] {
  return collectAppLocalStorageKeys(window.localStorage);
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
      if (txt.length > 5_000_000) {
        setError("バックアップファイルが大きすぎます（上限5MB）。");
        return;
      }
      const parsed = JSON.parse(txt) as Partial<Snapshot>;
      if (parsed.source !== "anzen-ai-localstorage" || parsed.schema_version !== 1 || !parsed.data) {
        setError("安全AIポータル のバックアップファイルではありません。source 不一致。");
        return;
      }
      const entries = Object.entries(parsed.data).filter(
        ([k, value]) => isAppLocalStorageKey(k) && typeof value === "string"
      );
      if (entries.length === 0) {
        setError("インポート可能なキーが見つかりませんでした。");
        return;
      }
      const ok = window.confirm(
        `${entries.length} 件のキーを上書きインポートします。よろしいですか？`
      );
      if (!ok) return;
      let removedCount = 0;
      for (const [k, v] of entries) {
        if (typeof v !== "string") continue;
        const sanitized = sanitizeImportedLocalDataValue(k, v);
        removedCount += sanitized.removedCount;
        if (sanitized.value === null) window.localStorage.removeItem(k);
        else window.localStorage.setItem(k, sanitized.value);
      }
      setInfo(
        `${entries.length} 件のキーをインポートしました。` +
          (removedCount > 0 ? ` 旧チャット/Copilot履歴から機微候補 ${removedCount} 件を破棄しました。` : "") +
          "ページを再読み込みしてください。",
      );
    } catch (e) {
      setError(`インポート失敗: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleClearAll() {
    setError(null);
    setInfo(null);
    const ok = window.confirm(
      "この端末のローカルデータ、任意Cookie、キャッシュ、プッシュ購読、Service Workerを削除します。クラウド保存とHttpOnly認証Cookieは別操作です。元に戻せません。続けますか？"
    );
    if (!ok) return;
    const keys = collectKeys();
    for (const k of keys) window.localStorage.removeItem(k);
    let cacheCount = 0;
    if ("caches" in window) {
      const cacheKeys = await window.caches.keys();
      const ownedCaches = cacheKeys.filter((key) => key.startsWith("anzen-ai-"));
      await Promise.all(ownedCaches.map((key) => window.caches.delete(key)));
      cacheCount = ownedCaches.length;
    }
    const cookieCount = removeGoogleOptionalCookies().length;
    let pushRemoved = false;
    let workerCount = 0;
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker
        .getRegistrations()
        .catch(() => []);
      const subscription = registrations[0]
        ? await registrations[0].pushManager.getSubscription().catch(() => null)
        : null;
      if (subscription) {
        const endpoint = subscription.endpoint;
        pushRemoved = await subscription.unsubscribe().catch(() => false);
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint }),
        }).catch(() => undefined);
      }
      const unregistered = await Promise.all(
        registrations.map((registration) =>
          registration.unregister().catch(() => false),
        ),
      );
      workerCount = unregistered.filter(Boolean).length;
    }
    setInfo(
      `${keys.length}件のローカルキー、${cacheCount}件のキャッシュ、${cookieCount}件の任意Cookie、` +
        `${workerCount}件のService Workerを削除しました。プッシュ購読: ${pushRemoved ? "解除" : "購読なし／解除未確認"}。` +
        "クラウド保存データとHttpOnly認証Cookieは削除していません。ページを再読み込みしてください。",
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <p className="flex items-start gap-1.5 font-semibold">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>このサイトのデータは「この端末」のブラウザにのみ保存されます</span>
        </p>
        <ul className="ml-5 mt-1 list-disc space-y-0.5 leading-5">
          <li>この操作は端末内データ、任意Cookie、キャッシュ、プッシュ購読、Service Workerが対象です。</li>
          <li>クラウド上の記録とHttpOnly認証Cookieは対象外です。クラウド記録の削除は各一覧またはお問い合わせ、認証Cookieはログアウトを利用してください。</li>
          <li>他端末へ持ち出す場合や万一に備え、定期的にエクスポートしてください。</li>
          <li>エクスポートJSONは暗号化されません。個人名・健康・事故情報を含み得るため、安全な場所で保管してください。</li>
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
          onClick={() => void handleClearAll()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
          端末内データを削除
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
