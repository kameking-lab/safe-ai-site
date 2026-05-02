"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Printer, Edit, AlertTriangle } from "lucide-react";
import { deleteEntry, getEntryById } from "@/lib/safety-diary/store";
import type { SafetyDiaryEntry } from "@/lib/safety-diary/schema";

export function DiaryDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [entry, setEntry] = useState<SafetyDiaryEntry | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // localStorage はクライアント専用のため useEffect で読み込む必要がある
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntry(getEntryById(id));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded(true);
  }, [id]);

  if (!loaded) {
    return <div className="p-6 text-sm text-slate-500">読み込み中…</div>;
  }
  if (!entry) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-slate-700">該当する日誌が見つかりません。</p>
        <Link href="/safety-diary" className="mt-3 inline-block text-sm font-semibold text-emerald-700 underline">
          一覧へ戻る
        </Link>
      </div>
    );
  }

  const r = entry.required;
  const o = entry.optional;

  function handleDelete() {
    if (!confirm("この日誌を削除します。よろしいですか？")) return;
    deleteEntry(id);
    router.push("/safety-diary");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/safety-diary" className="text-xs font-semibold text-slate-500 hover:underline">
            ← 一覧へ戻る
          </Link>
          <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
            📓 {r.date}（{r.weather}）{r.siteName}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/safety-diary/${id}/print`}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5" />
            印刷
          </Link>
          <Link
            href="/safety-diary/new/detail"
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            <Edit className="h-3.5 w-3.5" />
            複製して新規作成
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            削除
          </button>
        </div>
      </header>

      {/* 必須項目 */}
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <Field label="作業内容" value={r.workContent} />
        <Field label="KY結果" value={r.kyResult} />
        <Field
          label="ヒヤリハット"
          value={
            r.nearMissOccurred ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                <AlertTriangle className="h-3 w-3" />
                有り {r.nearMissDetail ? `: ${r.nearMissDetail}` : ""}
              </span>
            ) : (
              <span className="text-emerald-700">無し</span>
            )
          }
        />
      </section>

      {/* 任意項目（あるもののみ） */}
      <section className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">詳細記録</p>
        {o.contractorWorks.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-700">業者別作業</p>
            <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
              {o.contractorWorks.map((c, i) => (
                <li key={i}>
                  ・<strong>{c.name}</strong>: {c.work}
                </li>
              ))}
            </ul>
          </div>
        )}
        {o.requiredQualifications.length > 0 && (
          <Field label="必要資格" value={o.requiredQualifications.join("、")} />
        )}
        {o.plannedPeopleCount !== undefined && (
          <Field label="予定人数" value={`${o.plannedPeopleCount} 人`} />
        )}
        {o.predictedDisasters.length > 0 && (
          <Field label="予想災害" value={o.predictedDisasters.join("、")} />
        )}
        {o.riskAssessment && (
          <Field
            label="リスク評価"
            value={`重大性 ${o.riskAssessment.severity} × 発生可能性 ${o.riskAssessment.likelihood} = ${
              o.riskAssessment.severity * o.riskAssessment.likelihood
            }${o.riskAssessment.summary ? ` / ${o.riskAssessment.summary}` : ""}`}
          />
        )}
        {o.safetyInstructions && <Field label="安全指示" value={o.safetyInstructions} />}
        {o.patrolRecord && <Field label="巡視記録" value={o.patrolRecord} />}
        {o.nextDayPlan && <Field label="翌日予定" value={o.nextDayPlan} />}
      </section>

      {/* 関連リンク */}
      <section className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
        <p className="text-xs font-bold text-emerald-800">関連機能</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            href="/ky"
            className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            KY用紙を作成 →
          </Link>
          <Link
            href="/accidents"
            className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            類似事故を検索 →
          </Link>
          <Link
            href="/laws"
            className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            法改正を確認 →
          </Link>
          <Link
            href="/signage"
            className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            気象警報を確認 →
          </Link>
        </div>
      </section>

      <p className="mt-3 text-[10px] text-slate-400">
        作成: {entry.createdAt.slice(0, 16).replace("T", " ")} / 更新: {entry.updatedAt.slice(0, 16).replace("T", " ")}
      </p>
    </main>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <div className="mt-0.5 whitespace-pre-wrap text-sm text-slate-800">{value}</div>
    </div>
  );
}
