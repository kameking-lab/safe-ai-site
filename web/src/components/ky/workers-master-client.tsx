"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  loadWorkers,
  saveWorkers,
  addWorker,
  updateWorker,
  removeWorker,
  setWorkerHidden,
  visibleWorkers,
  WORKER_AFFILIATION_LABELS,
  type Worker,
  type WorkerAffiliation,
} from "@/lib/ky/workers-master";
import {
  isKyCloudEnabled,
  cloudPullWorkers,
  cloudPushWorkers,
  flushKyCloudQueue,
} from "@/lib/ky/storage-adapter";
import { ConclusionCard } from "@/components/ui/conclusion-card";

const AFFILIATIONS: WorkerAffiliation[] = ["self", "coop1", "coop2", "coop3"];

export function WorkersMasterClient() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftAff, setDraftAff] = useState<WorkerAffiliation>("self");
  const [draftCompany, setDraftCompany] = useState("");
  const [draftQual, setDraftQual] = useState("");
  const [draftRegular, setDraftRegular] = useState(true);

  useEffect(() => {
    const local = loadWorkers();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- マウント時の一度きりのlocalStorage読み込み
    setWorkers(local);
    // Phase 4: クラウド同期（背景・任意）。ローカルが空のときだけ別端末の登録を引き継ぐ。
    if (!isKyCloudEnabled()) return;
    let cancelled = false;
    void (async () => {
      await flushKyCloudQueue();
      if (local.length > 0) return;
      const cloud = await cloudPullWorkers();
      if (!cancelled && cloud && cloud.length > 0) {
        saveWorkers(cloud);
        setWorkers(cloud);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = (next: Worker[]) => {
    setWorkers(next);
    saveWorkers(next);
    // Phase 4: 背景でクラウド同期（失敗時はキューに退避し次回再送）。
    void cloudPushWorkers(next);
  };

  const handleAdd = () => {
    if (!draftName.trim()) return;
    commit(
      addWorker(workers, {
        name: draftName,
        affiliation: draftAff,
        company: draftCompany,
        qualNo: draftQual,
        isRegular: draftRegular,
      })
    );
    setDraftName("");
    setDraftCompany("");
    setDraftQual("");
  };

  const shown = useMemo(
    () => (showHidden ? workers : visibleWorkers(workers)),
    [workers, showHidden]
  );
  const hiddenCount = useMemo(() => workers.filter((w) => w.hidden).length, [workers]);
  const registeredCount = useMemo(() => visibleWorkers(workers).length, [workers]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">作業員マスター</h1>
          <p className="mt-1 text-sm text-slate-600">
            一度登録すれば、KY用紙の参加者を「選ぶだけ」。氏名の手入力をなくします。
          </p>
        </div>
        <Link
          href="/ky/paper"
          className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
        >
          ← KY用紙に戻る
        </Link>
      </div>

      {/* 結論カード（柱0）: いまの状態＝登録人数を3秒で。0名は登録へ誘導。 */}
      <div className="mt-4">
        {registeredCount === 0 ? (
          <ConclusionCard
            tone="info"
            title="登録なし"
            description="作業員を登録すると、KY用紙の参加者を「選ぶだけ」になります。下のフォームから追加してください。"
          />
        ) : (
          <ConclusionCard
            tone="info"
            value={registeredCount}
            unit="名"
            title="登録済み"
            description="KY用紙の参加者は、この一覧からチェックで選べます。氏名の手入力は不要です。"
          />
        )}
      </div>

      <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
        ※ データはこの端末に保存され、クラウド設定時は自動でバックアップ・別端末同期されます（未設定でも端末内で完結して動作）。
      </p>

      {/* 新規追加 */}
      <section className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-slate-900">作業員を追加</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-600">氏名（必須）</span>
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              placeholder="例: 山田 太郎"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-600">所属</span>
            <select
              value={draftAff}
              onChange={(e) => setDraftAff(e.target.value as WorkerAffiliation)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {AFFILIATIONS.map((a) => (
                <option key={a} value={a}>
                  {WORKER_AFFILIATION_LABELS[a]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-600">会社名（協力会社の場合）</span>
            <input
              type="text"
              value={draftCompany}
              onChange={(e) => setDraftCompany(e.target.value)}
              placeholder="会社名"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-600">必要資格No.</span>
            <input
              type="text"
              value={draftQual}
              onChange={(e) => setDraftQual(e.target.value)}
              placeholder="例: 1,10"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={draftRegular}
              onChange={(e) => setDraftRegular(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            常用作業員（毎日来る）
          </label>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!draftName.trim()}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-40"
          >
            ＋ 追加
          </button>
        </div>
      </section>

      {/* 一覧 */}
      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900">
            登録済み作業員
            <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
              {visibleWorkers(workers).length}名
            </span>
          </h2>
          {hiddenCount > 0 && (
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={showHidden}
                onChange={(e) => setShowHidden(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              退職者も表示（{hiddenCount}名）
            </label>
          )}
        </div>

        {shown.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            まだ登録がありません。上のフォームから追加してください。
          </p>
        ) : (
          <ul className="space-y-2">
            {shown.map((w) => (
              <li
                key={w.id}
                className={`rounded-xl border p-3 ${
                  w.hidden ? "border-slate-200 bg-slate-50 opacity-60" : "border-slate-200 bg-white"
                }`}
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-500">氏名</span>
                    <input
                      type="text"
                      value={w.name}
                      onChange={(e) => commit(updateWorker(workers, w.id, { name: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-500">所属</span>
                    <select
                      value={w.affiliation}
                      onChange={(e) =>
                        commit(updateWorker(workers, w.id, { affiliation: e.target.value as WorkerAffiliation }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
                    >
                      {AFFILIATIONS.map((a) => (
                        <option key={a} value={a}>
                          {WORKER_AFFILIATION_LABELS[a]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-500">会社名</span>
                    <input
                      type="text"
                      value={w.company}
                      onChange={(e) => commit(updateWorker(workers, w.id, { company: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-500">必要資格No.</span>
                    <input
                      type="text"
                      value={w.qualNo}
                      onChange={(e) => commit(updateWorker(workers, w.id, { qualNo: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
                    />
                  </label>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={w.isRegular}
                      onChange={(e) => commit(updateWorker(workers, w.id, { isRegular: e.target.checked }))}
                      className="h-4 w-4 rounded"
                    />
                    常用
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => commit(setWorkerHidden(workers, w.id, !w.hidden))}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      {w.hidden ? "再表示" : "退職（非表示）"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`${w.name} を完全に削除します。よろしいですか？`)) {
                          commit(removeWorker(workers, w.id));
                        }
                      }}
                      className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
