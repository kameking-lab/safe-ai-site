"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Save, Loader2, Trash2, ArrowRight, FolderOpen } from "lucide-react";
import {
  saveChemicalRaRecord,
  listChemicalRaRecords,
  deleteChemicalRaRecord,
  isChemicalRaCloudEnabled,
  type ChemicalRaSavedRecord,
} from "@/lib/chemical/ra-cloud";
import { TransientChemicalLink } from "@/components/home-safety-cockpit/transient-chemical-link";

/**
 * P1-5 RAクラウド保管 UI（既存RAパネルに非干渉の追加コンポーネント）。
 * - ChemicalRaSaveButton: RA結果の保存ボタン（localStorage即時＋クラウド背景同期）。
 * - SavedRaList: 保存済みRA一覧（クラウド＋ローカルマージ）。再実施時の物質名は同一タブの一時メモリで渡す。
 */
export function ChemicalRaSaveButton(props: {
  chemicalName: string;
  cas: string;
  workContent: string;
  exposureBand: string;
  payload: unknown;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [cloudConsent, setCloudConsent] = useState(false);

  const onSave = useCallback(async () => {
    setBusy(true);
    setMsg(null);
    try {
      const result = await saveChemicalRaRecord({
        substance: props.chemicalName,
        cas: props.cas,
        workContent: props.workContent,
        exposureBand: props.exposureBand,
        payload: props.payload,
        cloudConsent,
      });
      if (result.localStatus === "failed") {
        setMsg("端末内への保存に失敗しました。空き容量とブラウザ設定を確認してください。");
      } else if (result.cloudStatus === "synced") {
        setMsg("この端末に保存し、認証済みクラウドとの同期も完了しました。共有はされていません。");
      } else if (result.cloudStatus === "failed") {
        setMsg("この端末には保存しましたが、クラウド同期は失敗しました。再接続後に再度保存してください。");
      } else if (result.cloudStatus === "not-configured") {
        setMsg("この端末に保存しました。クラウドは運営側で未設定のため送信していません。");
      } else {
        setMsg("この端末に保存しました。クラウドへは送信していません。");
      }
      // 同一ページ内の台帳一覧(SavedRaList)へ即時反映を通知
      try { window.dispatchEvent(new Event("chemical-ra:saved")); } catch { /* SSR等 */ }
    } catch {
      setMsg("保存に失敗しました。");
    } finally {
      setBusy(false);
    }
  }, [props, cloudConsent]);

  return (
    <span className="inline-flex flex-col items-end gap-1 print:hidden">
      <label className="flex min-h-[44px] items-center gap-2 text-[11px] font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={cloudConsent}
          onChange={(event) => setCloudConsent(event.target.checked)}
          disabled={!isChemicalRaCloudEnabled()}
          className="h-5 w-5"
        />
        認証済みクラウドへの送信を希望する（未認証・失敗時は同期済みにしません）
      </label>
      <button
        type="button"
        onClick={() => void onSave()}
        disabled={busy}
        className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-700 shadow-sm hover:bg-emerald-50 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
        {busy ? "保存中…" : "この結果を保存"}
      </button>
      <span aria-live="polite" className="text-[10px] text-emerald-800">
        {busy
          ? cloudConsent
            ? "端末内へ保存し、クラウド同期の応答を確認中です。"
            : "端末内へ保存中です。"
          : msg ?? "未保存のローカル下書きです。クラウド同期・共有は行われていません。"}
      </span>
    </span>
  );
}

export function SavedRaList() {
  const [list, setList] = useState<ChemicalRaSavedRecord[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [cloudConsent, setCloudConsent] = useState(false);

  const reload = useCallback(() => {
    void listChemicalRaRecords(cloudConsent).then(setList);
  }, [cloudConsent]);

  useEffect(() => {
    reload();
    const onSaved = () => reload();
    window.addEventListener("chemical-ra:saved", onSaved);
    return () => window.removeEventListener("chemical-ra:saved", onSaved);
  }, [reload]);

  const onDelete = useCallback(
    (r: ChemicalRaSavedRecord) => {
      const ok = window.confirm(
        `「${r.substance || "この記録"}」の実施記録を削除します。よろしいですか？（元に戻せません）`
      );
      if (!ok) return;
      setDeleteError(null);
      setDeletingId(r.raId);
      void deleteChemicalRaRecord(r.raId, cloudConsent)
        .then(() => reload())
        .catch(() => setDeleteError("削除に失敗しました。通信状況を確認してもう一度お試しください。"))
        .finally(() => setDeletingId(null));
    },
    [cloudConsent, reload]
  );

  if (list === null) return null;
  if (list.length === 0) return null;

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 print:hidden">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
        <FolderOpen className="h-5 w-5 text-emerald-700" aria-hidden="true" />
        実施記録の台帳（{list.length}）
      </h2>
      <p className="mt-1 text-[11px] text-slate-500">
        安衛法第57条の3の自律的管理では、リスクアセスメントの<strong className="font-semibold">記録の作成・保管</strong>が求められます。
        各記録は「記録を開く」から<strong className="font-semibold">実施当時の実施日のまま再印刷</strong>でき、監督署対応や年次見直しに使えます。
        （この一覧はこの端末の保存記録です。クラウド同期済みとは限りません）
      </p>
      <label className="mt-3 flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800">
        <input
          type="checkbox"
          checked={cloudConsent}
          onChange={(event) => setCloudConsent(event.target.checked)}
          disabled={!isChemicalRaCloudEnabled()}
          className="h-5 w-5"
        />
        認証済みクラウドとの照合・未完了同期の再試行に同意する
      </label>
      {deleteError && (
        <p role="alert" className="mt-2 text-[11px] font-semibold text-rose-600">
          {deleteError}
        </p>
      )}
      <ul className="mt-3 space-y-2">
        {list.map((r) => (
          <li
            key={r.raId}
            className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3"
          >
            <span className="flex-1">
              <span className="block text-sm font-semibold text-slate-900">
                {r.substance || "（物質名なし）"}
                {r.cas && <span className="ml-2 text-xs font-normal text-slate-500">CAS: {r.cas}</span>}
              </span>
              <span className="mt-0.5 block text-[11px] text-slate-500">
                {r.exposureBand && `判定: ${r.exposureBand} ／ `}
                {r.workContent && `${r.workContent} ／ `}
                {new Date(r.savedAt).toLocaleString("ja-JP")}
              </span>
              <span className="mt-1 block text-[11px] font-semibold text-slate-700">
                {r.syncState === "synced" && "保存状態: クラウド同期済み（共有はしていません）"}
                {r.syncState === "sync-pending" && "保存状態: 端末保存済み・同期確認待ち"}
                {r.syncState === "failed" && "保存状態: 端末保存済み・クラウド同期失敗"}
                {r.syncState === "shared" && "保存状態: 共有済み"}
                {r.syncState === "saved-locally" && "保存状態: この端末だけに保存"}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <Link
                href={`/chemical-ra?raId=${encodeURIComponent(r.raId)}`}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-emerald-700 bg-emerald-700 px-3 py-2 text-[11px] font-bold text-white hover:bg-emerald-800"
              >
                記録を開く（印刷）
                <FolderOpen className="h-3 w-3" aria-hidden="true" />
              </Link>
              {r.substance && (
                <TransientChemicalLink
                  query={r.cas || r.substance}
                  className="inline-flex min-h-[44px] items-center gap-1 px-2 text-[10px] font-semibold text-slate-600 hover:text-emerald-700 hover:underline"
                >
                  同じ物質で再実施
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </TransientChemicalLink>
              )}
              <button
                type="button"
                onClick={() => onDelete(r)}
                disabled={deletingId === r.raId}
                aria-label="削除"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
              >
                {deletingId === r.raId ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                )}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
