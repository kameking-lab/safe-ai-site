"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { getEntryById } from "@/lib/safety-diary/store";
import type { SafetyDiaryEntry } from "@/lib/safety-diary/schema";

export function DiaryPrintClient({ id }: { id: string }) {
  const [entry, setEntry] = useState<SafetyDiaryEntry | undefined>();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // localStorage はクライアント専用のため useEffect で読み込む必要がある
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntry(getEntryById(id));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded(true);
  }, [id]);

  if (!loaded) return <div className="p-6">読み込み中…</div>;
  if (!entry) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p>該当する日誌がありません。</p>
        <Link href="/safety-diary" className="text-emerald-700 underline">
          一覧へ戻る
        </Link>
      </div>
    );
  }
  const r = entry.required;
  const o = entry.optional;

  return (
    <div className="bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-8 print:py-4">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Link href={`/safety-diary/${id}`} className="text-xs font-semibold text-slate-500 hover:underline">
            ← 詳細へ戻る
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-emerald-700"
          >
            <Printer className="h-4 w-4" />
            印刷／PDF保存
          </button>
        </div>

        <header className="border-b border-slate-300 pb-2">
          <h1 className="text-xl font-bold">安全衛生日誌</h1>
          <p className="text-sm">
            {r.date}（{r.weather}） / {r.siteName}
          </p>
        </header>

        <table className="mt-4 w-full border-collapse text-sm">
          <tbody>
            <Row label="作業内容" value={r.workContent} />
            <Row label="KY結果" value={r.kyResult} />
            <Row
              label="ヒヤリハット"
              value={r.nearMissOccurred ? `有り${r.nearMissDetail ? `: ${r.nearMissDetail}` : ""}` : "無し"}
            />
            {o.contractorWorks.length > 0 && (
              <Row
                label="業者別作業"
                value={o.contractorWorks.map((c) => `${c.name}: ${c.work}`).join("\n")}
              />
            )}
            {o.requiredQualifications.length > 0 && (
              <Row label="必要資格" value={o.requiredQualifications.join("、")} />
            )}
            {o.plannedPeopleCount !== undefined && (
              <Row label="予定人数" value={`${o.plannedPeopleCount} 人`} />
            )}
            {o.predictedDisasters.length > 0 && (
              <Row label="予想災害" value={o.predictedDisasters.join("、")} />
            )}
            {o.riskAssessment && (
              <Row
                label="リスク評価"
                value={`重大性 ${o.riskAssessment.severity} × 発生可能性 ${o.riskAssessment.likelihood}${
                  o.riskAssessment.summary ? ` / ${o.riskAssessment.summary}` : ""
                }`}
              />
            )}
            {o.safetyInstructions && <Row label="安全指示" value={o.safetyInstructions} />}
            {o.patrolRecord && <Row label="巡視記録" value={o.patrolRecord} />}
            {o.nextDayPlan && <Row label="翌日予定" value={o.nextDayPlan} />}
          </tbody>
        </table>

        <footer className="mt-6 grid grid-cols-3 gap-3 text-xs">
          <Sign label="作業責任者" />
          <Sign label="安全担当者" />
          <Sign label="現場代理人" />
        </footer>

        <p className="mt-4 text-[10px] text-slate-500">
          ANZEN AI / 出力日時 {new Date().toLocaleString("ja-JP")}
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr className="align-top">
      <th className="w-32 border border-slate-300 bg-slate-50 px-2 py-1.5 text-left">{label}</th>
      <td className="border border-slate-300 px-2 py-1.5 whitespace-pre-wrap">{value}</td>
    </tr>
  );
}

function Sign({ label }: { label: string }) {
  return (
    <div className="rounded border border-slate-300 px-3 py-6 text-center">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="mt-2 text-[10px]">サイン</p>
    </div>
  );
}
