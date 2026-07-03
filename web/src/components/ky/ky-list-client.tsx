"use client";

/**
 * KY全面再設計 P0-A: 過去KY一覧・再編集UI。
 * ローカル(端末内)の保存KYを一覧し、開く(再編集)/今日用に複製/削除。現場名・期間・キーワードで絞り、並べ替え。
 * ローカルを主、クラウドは「ローカルが空のとき別端末の履歴を引き継ぐ」フォールバック（local-first 一貫）。
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createOperationsService } from "@/lib/services/operations-service";
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";
import { copyKyForToday } from "@/lib/ky/copy-latest";
import {
  isKyCloudEnabled,
  cloudPullKyRecords,
  cloudGetKyRecordById,
  cloudDeleteKyRecord,
  flushKyCloudQueue,
} from "@/lib/ky/storage-adapter";
import {
  filterAndSortKyList,
  type KyListEntry,
  type ListPeriod,
  type ListSort,
} from "@/lib/ky/record-list-filter";
import { ConclusionCard } from "@/components/ui/conclusion-card";

const AUTOSAVE_KEY = "ky-record";

const PERIOD_LABELS: Record<ListPeriod, string> = { "7d": "直近7日", "30d": "直近30日", all: "全期間" };
const SORT_LABELS: Record<ListSort, string> = { newest: "新しい順", oldest: "古い順", site: "現場名順" };

export function KyListClient() {
  const router = useRouter();
  const ops = useMemo(() => createOperationsService(), []);
  const [entries, setEntries] = useState<KyListEntry[]>([]);
  const [keyword, setKeyword] = useState("");
  const [period, setPeriod] = useState<ListPeriod>("all");
  const [sort, setSort] = useState<ListSort>("newest");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [usingCloud, setUsingCloud] = useState(false);

  const loadList = useCallback(async () => {
    const localRes = await ops.getKyRecordList();
    const local = localRes.ok ? localRes.data : [];
    if (local.length > 0 || !isKyCloudEnabled()) {
      setEntries(local.map((s) => ({ ...s, source: "local" as const })));
      setUsingCloud(false);
      return;
    }
    // ローカルが空 → 別端末のクラウド履歴を引き継ぐ
    await flushKyCloudQueue();
    const pulled = await cloudPullKyRecords();
    if (pulled && pulled.list.length > 0) {
      setEntries(pulled.list.map((s) => ({ ...s, source: "cloud" as const })));
      setUsingCloud(true);
    } else {
      setEntries([]);
      setUsingCloud(false);
    }
  }, [ops]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const filtered = useMemo(
    () => filterAndSortKyList(entries, { keyword, period, sort }),
    [entries, keyword, period, sort]
  );

  const isFiltering = keyword.trim() !== "" || period !== "all";

  const loadFull = useCallback(
    async (entry: KyListEntry) => {
      if (entry.source === "cloud") return cloudGetKyRecordById(entry.id);
      const res = await ops.getKyRecordById(entry.id);
      return res.ok ? res.data : null;
    },
    [ops]
  );

  const handleOpen = async (entry: KyListEntry) => {
    setBusy(true);
    try {
      const full = await loadFull(entry);
      if (!full) {
        setNotice("この記録の本体を読み込めませんでした（端末を移行した場合は元の端末に残っています）。");
        return;
      }
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(normalizeKyInstructionRecord(full)));
      router.push("/ky/paper");
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async (entry: KyListEntry) => {
    setBusy(true);
    try {
      const full = await loadFull(entry);
      if (!full) {
        setNotice("複製元の本体を読み込めませんでした。");
        return;
      }
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(copyKyForToday(normalizeKyInstructionRecord(full))));
      router.push("/ky/paper");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (entry: KyListEntry) => {
    if (!window.confirm(`${entry.siteName || entry.workDate} のKYを削除します。よろしいですか？`)) return;
    setBusy(true);
    try {
      if (entry.source === "cloud") {
        await cloudDeleteKyRecord(entry.id);
      } else {
        await ops.deleteKyRecord(entry.id);
      }
      await loadList();
      setNotice("削除しました。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">保存したKY一覧</h1>
          <p className="mt-1 text-sm text-slate-600">
            過去のKYを開いて再編集・今日用に複製できます。{usingCloud ? "（クラウドの履歴を表示中）" : "（この端末の履歴）"}
          </p>
        </div>
        <Link
          href="/ky/paper"
          className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
        >
          ＋ 新規KY作成
        </Link>
      </div>

      {/* 結論カード（柱0）: いまの状態＝保存件数を3秒で。保存ゼロは新規作成へ誘導。 */}
      <div className="mt-4">
        {entries.length === 0 ? (
          <ConclusionCard
            tone="info"
            title="保存KYなし"
            description="まずは新規KYを作成・保存しましょう。次から開いて再編集・複製できます。"
            action={{ href: "/ky/paper", label: "新規KY作成" }}
          />
        ) : filtered.length === 0 ? (
          <ConclusionCard
            tone="neutral"
            value={0}
            unit="件"
            title="該当なし"
            description={`保存${entries.length}件のうち、いまの絞り込み条件に一致するKYはありません。条件を変えてください。`}
          />
        ) : (
          <ConclusionCard
            tone="info"
            value={filtered.length}
            unit="件"
            title="保存KY"
            description={isFiltering ? `全${entries.length}件のうち、いまの絞り込みに一致する分です。` : undefined}
            action={{ href: "/ky/paper", label: "新規KY作成" }}
          />
        )}
      </div>

      {notice && (
        <div className="mt-3 flex items-start justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5">
          <p className="text-sm font-semibold text-emerald-900">{notice}</p>
          <button type="button" onClick={() => setNotice(null)} aria-label="閉じる" className="rounded px-1.5 text-emerald-700 hover:bg-emerald-100">×</button>
        </div>
      )}

      {/* 絞り込み・並べ替え */}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-600">キーワード（現場名・作業など）</span>
          <input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="例: ○○ビル / 鉄骨"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-600">期間</span>
          <select value={period} onChange={(e) => setPeriod(e.target.value as ListPeriod)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {(["7d", "30d", "all"] as ListPeriod[]).map((p) => (
              <option key={p} value={p}>{PERIOD_LABELS[p]}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-600">並べ替え</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as ListSort)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {(["newest", "oldest", "site"] as ListSort[]).map((s) => (
              <option key={s} value={s}>{SORT_LABELS[s]}</option>
            ))}
          </select>
        </label>
      </div>

      {/* 一覧 */}
      <div className="mt-4">
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-400">
            {entries.length === 0
              ? "保存されたKYがありません。まずは新規KYを作成・保存してください。"
              : "条件に一致するKYがありません。"}
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((e) => (
              <li key={`${e.source}:${e.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-bold text-slate-900">
                      {e.siteName || "（現場名未入力）"}
                      {e.projectName && <span className="ml-2 text-sm font-normal text-slate-500">{e.projectName}</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {e.workDate}（{e.weather || "—"}）／職長: {e.foremanName || "—"}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-700">作業: {e.workDetail || "（未入力）"}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={() => void handleOpen(e)} className="min-h-[44px] rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-50 disabled:opacity-50">開く（再編集）</button>
                    <button type="button" disabled={busy} onClick={() => void handleCopy(e)} className="min-h-[44px] rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50">今日用に複製</button>
                    <button type="button" disabled={busy} onClick={() => void handleDelete(e)} className="min-h-[44px] rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50">削除</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
