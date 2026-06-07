"use client";

import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { aggregateMonth, recentMonths, type MonthlyInputs, type MonthlyReport } from "@/lib/site-records/monthly-report";
import { getPatrolList } from "@/lib/site-records/patrol-store";
import { getNearMissReports } from "@/lib/site-records/nearmiss-store";
import { getInspectionList } from "@/lib/site-records/inspection-store";
import { getInductionList } from "@/lib/site-records/induction-store";
import { getCommitteeList } from "@/lib/site-records/committee-store";
import { getHeatLogList } from "@/lib/heat-illness/log-store";

export function MonthlyReportClient() {
  const [months, setMonths] = useState<string[]>([]);
  const [month, setMonth] = useState<string>("");
  const [inputs, setInputs] = useState<MonthlyInputs | null>(null);
  const [site, setSite] = useState("");
  const [author, setAuthor] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    const now = new Date();
    const ms = recentMonths(now.getFullYear(), now.getMonth() + 1, 12);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初回マウントの既定（SSRハイドレーション差異回避）
    setMonths(ms);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 既定は当月
    setMonth(ms[0] ?? "");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 各ストア(localStorage)を読み込み集計入力に
    setInputs({
      patrol: getPatrolList(),
      nearmiss: getNearMissReports(),
      inspection: getInspectionList(),
      induction: getInductionList(),
      committee: getCommitteeList(),
      heatlog: getHeatLogList(),
    });
  }, []);

  const report: MonthlyReport | null = useMemo(
    () => (inputs && month ? aggregateMonth(month, inputs) : null),
    [inputs, month],
  );

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="対象月">
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              {months.map((m) => <option key={m} value={m}>{m.replace("-", "年")}月</option>)}
            </select>
          </Field>
          <Field label="事業場・現場名"><input type="text" value={site} onChange={(e) => setSite(e.target.value)} placeholder="例: ○○作業所" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" autoComplete="off" /></Field>
          <Field label="作成者"><input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="例: 安全衛生責任者 ○○" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" autoComplete="off" /></Field>
        </div>
        <p className="mt-2 text-xs text-slate-500">この端末に保存された記録キットのデータから当月分を自動集計します（サーバーには送信されません）。</p>
      </section>

      {/* レポート本体（印刷対象） */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="border-b-2 border-slate-800 pb-2 text-center">
          <h2 className="text-xl font-bold text-slate-900">月次 安全衛生報告書</h2>
          <p className="mt-1 text-sm text-slate-600">
            {month ? month.replace("-", "年") + "月" : "—"}　／　{site || "（事業場名）"}　／　作成: {author || "—"}
          </p>
        </header>

        {!report ? (
          <p className="py-10 text-center text-sm text-slate-400">読み込み中…</p>
        ) : !report.hasAny ? (
          <p className="py-10 text-center text-sm text-slate-500">
            この月の記録がありません。各ツール（パトロール・ヒヤリハット・点検・受入教育・委員会・WBGT記録）で記録を保存すると、ここに自動集計されます。
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Stat title="安全パトロール" lines={[`実施 ${report.patrol.count} 回`, `指摘 ${report.patrol.findings} 件（未是正 ${report.patrol.open}）`]} alert={report.patrol.open > 0} />
            <Stat title="ヒヤリハット" lines={[`報告 ${report.nearMiss.count} 件（対応中 ${report.nearMiss.open}）`, report.nearMiss.topType ? `最多: ${report.nearMiss.topType}` : "—"]} alert={report.nearMiss.open > 0} />
            <Stat title="作業開始前点検" lines={[`記録 ${report.inspection.count} 件`, `使用不可 ${report.inspection.unusable} 件`]} alert={report.inspection.unusable > 0} />
            <Stat title="新規入場者 受入教育" lines={[`実施 ${report.induction.count} 名`]} />
            <Stat title="安全衛生委員会" lines={[report.committee.held ? `開催 ${report.committee.count} 回` : "未開催"]} alert={!report.committee.held} />
            <Stat title="WBGT（熱中症）記録" lines={[`記録 ${report.heat.days} 日`, report.heat.maxWbgt === null ? "—" : `最高WBGT ${report.heat.maxWbgt.toFixed(1)}℃`]} alert={report.heat.maxWbgt !== null && report.heat.maxWbgt >= 31} />
          </div>
        )}

        <div className="mt-5">
          <p className="text-xs font-bold text-slate-600">総括・next month の重点</p>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="例: 開口部の手すり是正を完了。来月は熱中症対策（WBGT測定・休憩計画）を重点。" className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
        </div>

        <p className="mt-3 text-[11px] leading-5 text-slate-500">
          本レポートはこの端末に保存された各記録の当月分を自動集計したものです。数値は記録の入力状況に依存します。委員会資料・元請提出等にご活用ください。
        </p>

        <div className="mt-4 print:hidden">
          <button type="button" onClick={handlePrint} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
            <Printer className="h-4 w-4" aria-hidden="true" /> レポートを印刷／PDF
          </button>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Stat({ title, lines, alert }: { title: string; lines: string[]; alert?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${alert ? "border-rose-300 bg-rose-50/40" : "border-slate-200 bg-slate-50"}`}>
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <ul className="mt-1 space-y-0.5">
        {lines.map((l, i) => (
          <li key={i} className={`text-sm ${alert ? "text-rose-800" : "text-slate-700"}`}>{l}</li>
        ))}
      </ul>
    </div>
  );
}
