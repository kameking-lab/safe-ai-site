"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  Printer,
  Download,
  Save,
  FilePlus2,
  FolderOpen,
  Trash2,
  RefreshCw,
} from "lucide-react";
import {
  getAcclimList,
  getAcclimById,
  saveAcclim,
  deleteAcclim,
  generatePlanDays,
  planProgress,
  planToCsv,
  newAcclimId,
  CATEGORY_JA,
  type AcclimatizationCategory,
  type AcclimatizationCondition,
  type AcclimatizationDay,
  type AcclimatizationPlan,
  type AcclimatizationSummary,
} from "@/lib/heat-illness/acclimatization-store";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { CollapsibleDetail } from "@/components/ui/collapsible-detail";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

const CONDITION_STYLE: Record<AcclimatizationCondition, string> = {
  "": "text-slate-500",
  ok: "text-emerald-700",
  caution: "text-amber-700",
  stop: "text-rose-700",
};

export function AcclimatizationClient() {
  const [planId, setPlanId] = useState<string>("");
  const [workerName, setWorkerName] = useState<string>("");
  const [category, setCategory] = useState<AcclimatizationCategory>("new");
  const [siteName, setSiteName] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [days, setDays] = useState<AcclimatizationDay[]>([]);
  const [list, setList] = useState<AcclimatizationSummary[]>([]);
  const [savedNote, setSavedNote] = useState<string>("");

  useEffect(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初回マウントの既定値（SSRハイドレーション差異回避のためeffectで実行）
    setPlanId(newAcclimId());
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 同上
    setStartDate(today);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 同上
    setDays(generatePlanDays(today));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 保存一覧の読込
    setList(getAcclimList());
  }, []);

  const progress = useMemo(() => planProgress({ days }), [days]);

  function regenerate() {
    if (!startDate) return;
    setDays(generatePlanDays(startDate, days.length || 7));
    setSavedNote("");
  }

  function addExtraDay() {
    setDays((ds) => generatePlanDays(startDate || ds[0]?.date || "2026-07-01", ds.length + 1).map((nd, i) => ds[i] ? { ...nd, targetPercent: ds[i]!.targetPercent, done: ds[i]!.done, condition: ds[i]!.condition, note: ds[i]!.note } : nd));
  }

  function updateDay(idx: number, patch: Partial<AcclimatizationDay>) {
    setDays((ds) => ds.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
    setSavedNote("");
  }

  function buildPlan(): AcclimatizationPlan {
    return {
      id: planId,
      workerName: workerName.trim(),
      category,
      siteName: siteName.trim(),
      startDate,
      days,
      savedAt: new Date().toISOString(),
    };
  }

  function handleSave() {
    if (!workerName.trim()) {
      setSavedNote("作業者名を入力してください。");
      return;
    }
    setList(saveAcclim(buildPlan()));
    setSavedNote("この端末に保存しました。");
  }

  function handleNew() {
    const now = new Date();
    const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    setPlanId(newAcclimId());
    setWorkerName("");
    setCategory("new");
    setSiteName("");
    setStartDate(today);
    setDays(generatePlanDays(today));
    setSavedNote("");
  }

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  function handleCsv() {
    if (typeof window === "undefined") return;
    const csv = planToCsv(buildPlan());
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `acclimatization-${workerName.trim() || "plan"}-${startDate || ""}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function openSaved(id: string) {
    const p = getAcclimById(id);
    if (!p) return;
    setPlanId(p.id);
    setWorkerName(p.workerName);
    setCategory(p.category);
    setSiteName(p.siteName);
    setStartDate(p.startDate);
    setDays(p.days);
    setSavedNote("保存済みの計画を開きました。");
  }

  function deleteSaved(id: string) {
    if (typeof window !== "undefined" && !window.confirm("この計画を削除します。よろしいですか？")) return;
    setList(deleteAcclim(id));
  }

  const anyStop = days.some((d) => d.condition === "stop");

  return (
    <div className="space-y-6">
      {/* 結論ファースト: 進捗デカ数字＋色で「いまどこまで順化したか」（柱0・画面表示のみ） */}
      {progress.complete ? (
        <ConclusionCard
          tone="safe"
          title="順化完了"
          description={`${progress.total}日間の計画をすべて実施しました。中断（おおむね4日以上）したら再順化が必要です。`}
          className="print:hidden"
        />
      ) : (
        <ConclusionCard
          tone={anyStop ? "warning" : "info"}
          value={`${progress.doneCount}/${progress.total}`}
          unit="日"
          title={anyStop ? "体調注意" : "順化進行中"}
          description={
            anyStop
              ? "体調「作業中止」の日があります。無理に負荷を上げず、回復を待って計画を見直してください。"
              : "実施した日は下の表で「実施」にチェック。7日以上かけて段階的に負荷を上げます。"
          }
          className="print:hidden"
        />
      )}

      {/* 対象者・開始日 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="作業者名">
            <input
              type="text"
              value={workerName}
              onChange={(e) => setWorkerName(e.target.value)}
              placeholder="例: 新人 一郎"
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              autoComplete="off"
            />
          </Field>
          <Field label="区分">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as AcclimatizationCategory)}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="new">新規入場者</option>
              <option value="returning">長期休み明け・復帰者</option>
              <option value="season-first">今季初めての暑熱作業</option>
            </select>
          </Field>
          <Field label="現場名">
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="例: ○○ビル新築工事"
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              autoComplete="off"
            />
          </Field>
          <Field label="順化開始日">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 print:hidden">
          <button type="button" onClick={regenerate} className="inline-flex items-center gap-1 rounded-lg border border-amber-500 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> 開始日から計画を作り直す
          </button>
          <button type="button" onClick={addExtraDay} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            ＋ 日数を追加
          </button>
        </div>
        {/* 画面では折りたたみ・印刷では帳票どおり全文（正確性は不可侵） */}
        <CollapsibleDetail summary="計画の根拠（厚労省「職場における熱中症予防」）" className="mt-2 print:hidden">
          <p>
            厚生労働省「職場における熱中症予防」は、暑熱作業に新たに従事する者・長期の中断から復帰する者について、
            <strong className="font-semibold">7日以上かけて作業（ばく露）を漸増させる計画的な暑熱順化</strong>を求めています。
            下表の「目安(%)」は現場で調整するための<strong className="font-semibold">編集可能な初期値</strong>であり、特定の公的数値ではありません。
          </p>
        </CollapsibleDetail>
        <p className="mt-2 hidden text-[11px] leading-5 text-slate-500 print:block">
          厚生労働省「職場における熱中症予防」は、暑熱作業に新たに従事する者・長期の中断から復帰する者について、
          <strong className="font-semibold">7日以上かけて作業（ばく露）を漸増させる計画的な暑熱順化</strong>を求めています。
          下表の「目安(%)」は現場で調整するための<strong className="font-semibold">編集可能な初期値</strong>であり、特定の公的数値ではありません。
        </p>
      </section>

      {/* 進捗 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">暑熱順化 計画・記録書</h2>
            <p className="mt-0.5 text-xs text-slate-600">
              {workerName || "（作業者未入力）"}（{CATEGORY_JA[category]}）　{siteName || "（現場名未設定）"}　開始 {startDate || "—"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-lg px-2 py-1 text-xs font-bold ${progress.complete ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"}`}>
              {progress.complete ? "順化完了" : `進捗 ${progress.doneCount}/${progress.total} 日`}
            </span>
          </div>
        </div>
        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${progress.complete ? "bg-emerald-500" : "bg-amber-500"}`}
            style={{ width: `${progress.total ? Math.round((progress.doneCount / progress.total) * 100) : 0}%` }}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300 text-left text-xs text-slate-500">
                <th className="py-2 pr-2">日</th>
                <th className="py-2 pr-2">日付</th>
                <th className="py-2 pr-2">目安(%)</th>
                <th className="py-2 pr-2">実施</th>
                <th className="py-2 pr-2">体調</th>
                <th className="py-2 pr-2">メモ</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d, idx) => (
                <tr key={d.day} className={`border-b border-slate-200 align-top ${d.done ? "bg-emerald-50/40" : ""}`}>
                  <td className="whitespace-nowrap py-2 pr-2 font-bold text-slate-800">{d.day}日目</td>
                  <td className="whitespace-nowrap py-2 pr-2 text-slate-700">{d.date}</td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={5}
                      value={d.targetPercent}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (Number.isFinite(v)) updateDay(idx, { targetPercent: v });
                      }}
                      className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm print:border-none"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="checkbox"
                      checked={d.done}
                      onChange={(e) => updateDay(idx, { done: e.target.checked })}
                      className="h-4 w-4 accent-emerald-600"
                      aria-label={`${d.day}日目を実施済みにする`}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      value={d.condition}
                      onChange={(e) => updateDay(idx, { condition: e.target.value as AcclimatizationCondition })}
                      className={`rounded-md border border-slate-300 px-1.5 py-1 text-xs ${CONDITION_STYLE[d.condition]} print:border-none`}
                    >
                      <option value="">—</option>
                      <option value="ok">異常なし</option>
                      <option value="caution">要注意</option>
                      <option value="stop">作業中止</option>
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      value={d.note}
                      onChange={(e) => updateDay(idx, { note: e.target.value })}
                      placeholder="—"
                      className="w-full min-w-[8rem] rounded-md border border-slate-300 px-2 py-1 text-xs print:border-none"
                      autoComplete="off"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 画面では折りたたみ・印刷では帳票どおり全文（正確性は不可侵） */}
        <CollapsibleDetail summary="運用上の注意（中断時の再順化など）" className="mt-3 print:hidden">
          <p>
            順化が中断（おおむね4日以上）した場合は再度の順化が必要です。体調に「要注意」「作業中止」が出た日は無理に負荷を上げないでください。最終判断は事業者・職長・産業医が行ってください。出典：厚生労働省「職場における熱中症予防」。
          </p>
        </CollapsibleDetail>
        <p className="mt-3 hidden text-[11px] leading-5 text-slate-500 print:block">
          順化が中断（おおむね4日以上）した場合は再度の順化が必要です。体調に「要注意」「作業中止」が出た日は無理に負荷を上げないでください。最終判断は事業者・職長・産業医が行ってください。出典：厚生労働省「職場における熱中症予防」。
        </p>

        <div className="mt-4 flex flex-wrap gap-2 print:hidden">
          <button type="button" onClick={handleSave} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">
            <Save className="h-3.5 w-3.5" aria-hidden="true" /> この端末に保存
          </button>
          <button type="button" onClick={handlePrint} className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700">
            <Printer className="h-3.5 w-3.5" aria-hidden="true" /> 印刷／PDF
          </button>
          <button type="button" onClick={handleCsv} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            <Download className="h-3.5 w-3.5" aria-hidden="true" /> CSV出力
          </button>
          <button type="button" onClick={handleNew} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            <FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" /> 新規
          </button>
          {savedNote && <span className="self-center text-xs font-semibold text-emerald-700">{savedNote}</span>}
        </div>
      </section>

      {/* 保存済み一覧 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <FolderOpen className="h-5 w-5 text-amber-600" aria-hidden="true" />
          保存した順化計画（この端末）
        </h2>
        {list.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">まだ保存された計画はありません。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {list.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">
                    {s.workerName || "（作業者名なし）"}
                    <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-500">{CATEGORY_JA[s.category]}</span>
                    {s.complete && <span className="ml-2 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">完了</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    開始 {s.startDate}／{s.siteName || "現場名なし"}／進捗 {s.doneCount}/{s.total}日
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => openSaved(s.id)} className="rounded-lg border border-sky-300 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-50">
                    開く
                  </button>
                  <button type="button" onClick={() => deleteSaved(s.id)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 関連 */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 print:hidden">
        <CalendarCheck className="mb-1 inline h-4 w-4 text-amber-600" aria-hidden="true" />{" "}
        日々のWBGT測定と実施対策は{" "}
        <a href="/heat-illness-prevention/log" className="font-semibold text-amber-700 hover:underline">
          WBGT日次記録簿
        </a>
        {" "}に記録できます。順化期間中は特に未順化者の閾値が下がる点に注意してください。
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
