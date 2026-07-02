"use client";

/** Phase 8+7: 過去の打合せ書 一覧（開く/翌日複製/削除・検索・並べ替え）。ローカル主・クラウド空時フォールバック。 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getMeetingList,
  getMeetingById,
  deleteMeeting,
  duplicateForNextDay,
  saveCurrentMeeting,
  type MeetingSummary,
} from "@/lib/meeting/store";
import {
  isMeetingCloudEnabled,
  cloudPullMeetings,
  cloudGetMeetingById,
  cloudDeleteMeeting,
} from "@/lib/meeting/cloud";
import { ConclusionCard } from "@/components/ui/conclusion-card";

type Row = MeetingSummary & { source: "local" | "cloud" };

export function MeetingListClient() {
  const router = useRouter();
  const [list, setList] = useState<Row[]>([]);
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "site">("newest");
  const [busy, setBusy] = useState(false);
  const [usingCloud, setUsingCloud] = useState(false);

  const reload = useCallback(async () => {
    const local = getMeetingList();
    if (local.length > 0 || !isMeetingCloudEnabled()) {
      setList(local.map((s) => ({ ...s, source: "local" as const })));
      setUsingCloud(false);
      return;
    }
    const cloud = await cloudPullMeetings();
    if (cloud && cloud.length > 0) {
      setList(cloud.map((s) => ({ ...s, source: "cloud" as const })));
      setUsingCloud(true);
    } else {
      setList([]);
      setUsingCloud(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    let out = list.slice();
    if (kw) out = out.filter((s) => [s.siteName, s.author, s.workDate].join(" ").toLowerCase().includes(kw));
    out.sort((a, b) => {
      if (sort === "site") return (a.siteName || "").localeCompare(b.siteName || "", "ja") || (Date.parse(b.savedAt) || 0) - (Date.parse(a.savedAt) || 0);
      const ta = Date.parse(a.savedAt) || 0;
      const tb = Date.parse(b.savedAt) || 0;
      return sort === "oldest" ? ta - tb : tb - ta;
    });
    return out;
  }, [list, keyword, sort]);

  const isFiltering = keyword.trim() !== "";

  const loadFull = async (row: Row) => (row.source === "cloud" ? cloudGetMeetingById(row.id) : getMeetingById(row.id));

  const open = async (row: Row) => {
    setBusy(true);
    try {
      const rec = await loadFull(row);
      if (!rec) return;
      saveCurrentMeeting(rec);
      router.push("/safety-diary");
    } finally {
      setBusy(false);
    }
  };

  const copyNext = async (row: Row) => {
    setBusy(true);
    try {
      const rec = await loadFull(row);
      if (!rec) return;
      saveCurrentMeeting(duplicateForNextDay(rec));
      router.push("/safety-diary");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: Row) => {
    if (!window.confirm(`${row.siteName || row.workDate} の打合せ書を削除します。よろしいですか？`)) return;
    setBusy(true);
    try {
      if (row.source === "cloud") await cloudDeleteMeeting(row.id);
      else deleteMeeting(row.id);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">保存した打合せ書</h1>
          <p className="mt-1 text-sm text-slate-600">過去の打合せ書を開いて再編集・翌日用に複製できます。{usingCloud ? "（クラウドの履歴を表示中）" : "（この端末の履歴）"}</p>
        </div>
        <Link href="/safety-diary" className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">＋ 新規作成</Link>
      </div>

      {/* 結論カード（柱0）: いまの状態＝保存件数を3秒で。保存ゼロは新規作成へ誘導。 */}
      <div className="mt-4">
        {list.length === 0 ? (
          <ConclusionCard
            tone="info"
            title="打合せ書なし"
            description="まずは新規に打合せ書を作成・保存しましょう。次から開いて再編集・翌日用に複製できます。"
            action={{ href: "/safety-diary", label: "新規作成" }}
          />
        ) : filtered.length === 0 ? (
          <ConclusionCard
            tone="neutral"
            value={0}
            unit="件"
            title="該当なし"
            description={`保存${list.length}件のうち、いまの検索条件に一致する打合せ書はありません。条件を変えてください。`}
          />
        ) : (
          <ConclusionCard
            tone="info"
            value={filtered.length}
            unit="件"
            title="保存打合せ書"
            description={isFiltering ? `全${list.length}件のうち、いまの検索条件に一致する分です。` : undefined}
            action={{ href: "/safety-diary", label: "新規作成" }}
          />
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input type="search" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="現場名・作成者で検索" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="newest">新しい順</option>
          <option value="oldest">古い順</option>
          <option value="site">現場名順</option>
        </select>
      </div>

      <div className="mt-4">
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-400">
            {list.length === 0 ? "保存された打合せ書がありません。まずは新規作成・保存してください。" : "条件に一致する打合せ書がありません。"}
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((s) => (
              <li key={`${s.source}:${s.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-bold text-slate-900">{s.siteName || "（現場名未入力）"}</p>
                    <p className="mt-0.5 text-xs text-slate-500">作業日 {s.workDate}／作成 {s.author || "—"}／{s.contractorCount}社</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={() => void open(s)} className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-50 disabled:opacity-50">開く（再編集）</button>
                    <button type="button" disabled={busy} onClick={() => void copyNext(s)} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50">翌日用に複製</button>
                    <button type="button" disabled={busy} onClick={() => void remove(s)} className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50">削除</button>
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
