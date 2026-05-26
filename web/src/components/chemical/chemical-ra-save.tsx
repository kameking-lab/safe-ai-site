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

/**
 * P1-5 RAクラウド保管 UI（既存RAパネルに非干渉の追加コンポーネント）。
 * - ChemicalRaSaveButton: RA結果の保存ボタン（localStorage即時＋クラウド背景同期）。
 * - SavedRaList: 保存済みRA一覧（クラウド＋ローカルマージ）。再実施は /chemical-ra?name= で再現。
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

  const onSave = useCallback(async () => {
    setBusy(true);
    setMsg(null);
    try {
      await saveChemicalRaRecord({
        substance: props.chemicalName,
        cas: props.cas,
        workContent: props.workContent,
        exposureBand: props.exposureBand,
        payload: props.payload,
      });
      setMsg(
        isChemicalRaCloudEnabled()
          ? "保存しました（この端末＋クラウド）。下部「保存したRA」から開けます。"
          : "保存しました（この端末）。下部「保存したRA」から開けます。"
      );
    } catch {
      setMsg("保存に失敗しました。");
    } finally {
      setBusy(false);
    }
  }, [props]);

  return (
    <span className="inline-flex flex-col items-end gap-1 print:hidden">
      <button
        type="button"
        onClick={() => void onSave()}
        disabled={busy}
        className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm hover:bg-emerald-50 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
        この結果を保存
      </button>
      {msg && <span className="text-[10px] text-emerald-700">{msg}</span>}
    </span>
  );
}

export function SavedRaList() {
  const [list, setList] = useState<ChemicalRaSavedRecord[] | null>(null);

  const reload = useCallback(() => {
    void listChemicalRaRecords().then(setList);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  if (list === null) return null;
  if (list.length === 0) return null;

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 print:hidden">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
        <FolderOpen className="h-5 w-5 text-emerald-600" aria-hidden="true" />
        保存したRA（{list.length}）
      </h2>
      <p className="mt-1 text-[11px] text-slate-500">
        {isChemicalRaCloudEnabled()
          ? "この端末とクラウドに保存。別端末でも同じ端末IDで参照できます。"
          : "この端末に保存（クラウド未設定）。"}
      </p>
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
            </span>
            <span className="flex shrink-0 items-center gap-1">
              {r.substance && (
                <Link
                  href={`/chemical-ra?name=${encodeURIComponent(r.substance)}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
                >
                  再実施
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  void deleteChemicalRaRecord(r.raId).then(reload);
                }}
                aria-label="削除"
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-2 py-1 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
