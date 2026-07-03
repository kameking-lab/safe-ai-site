"use client";

import { useEffect, useMemo, useState } from "react";
import { Printer, Download, Save, FilePlus2, FolderOpen, Plus, Trash2 } from "lucide-react";
import {
  getProcedureList,
  getProcedureById,
  saveProcedure,
  deleteProcedure,
  defaultSteps,
  newProcedureId,
  newStepId,
  procedureToCsv,
  type ProcedureSummary,
  type WorkProcedure,
  type WorkStep,
} from "@/lib/site-records/procedure-store";
import { countProcedureRemaining, procedureConclusion } from "@/lib/site-records/record-conclusions";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { SAFETY_TONE, type SafetyTone } from "@/lib/design/safety-tone";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function ProcedureClient() {
  const [recId, setRecId] = useState("");
  const [title, setTitle] = useState("");
  const [site, setSite] = useState("");
  const [author, setAuthor] = useState("");
  const [date, setDate] = useState("");
  const [equipment, setEquipment] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [steps, setSteps] = useState<WorkStep[]>([]);
  const [notes, setNotes] = useState("");
  const [list, setList] = useState<ProcedureSummary[]>([]);
  const [savedNote, setSavedNote] = useState("");
  const [savedTone, setSavedTone] = useState<SafetyTone>("safe");

  useEffect(() => {
    const now = new Date();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初回マウントの既定値（SSRハイドレーション差異回避）
    setRecId(newProcedureId());
    setDate(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`);
    setSteps(defaultSteps());
    setList(getProcedureList());
  }, []);

  // 記入のこり（KY用紙と同じ文法）: 作業名＋書きかけ手順行の空欄
  const remaining = useMemo(() => countProcedureRemaining({ title, steps }), [title, steps]);

  function updateStep(id: string, patch: Partial<WorkStep>) {
    setSteps((arr) => arr.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    setSavedNote("");
  }
  function addStep() {
    setSteps((arr) => [...arr, { id: newStepId(), step: "", hazard: "", measure: "" }]);
  }
  function removeStep(id: string) {
    setSteps((arr) => arr.filter((s) => s.id !== id));
  }

  function build(): WorkProcedure {
    return {
      id: recId,
      title: title.trim(),
      site: site.trim(),
      author: author.trim(),
      date,
      equipment: equipment.trim(),
      qualifications: qualifications.trim(),
      steps,
      notes: notes.trim(),
      savedAt: new Date().toISOString(),
    };
  }

  function handleSave() {
    if (!title.trim()) {
      setSavedTone("danger");
      setSavedNote("作業名を入力してください。");
      return;
    }
    setList(saveProcedure(build()));
    setSavedTone("safe");
    setSavedNote("この端末に保存しました。");
  }
  function handleNew() {
    const now = new Date();
    setRecId(newProcedureId());
    setTitle("");
    setSite("");
    setAuthor("");
    setDate(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`);
    setEquipment("");
    setQualifications("");
    setSteps(defaultSteps());
    setNotes("");
    setSavedNote("");
  }
  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }
  function handleCsv() {
    if (typeof window === "undefined") return;
    const csv = procedureToCsv(build());
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `procedure-${title.trim() || "record"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  function openSaved(id: string) {
    const r = getProcedureById(id);
    if (!r) return;
    setRecId(r.id);
    setTitle(r.title);
    setSite(r.site);
    setAuthor(r.author);
    setDate(r.date);
    setEquipment(r.equipment);
    setQualifications(r.qualifications);
    setSteps(r.steps);
    setNotes(r.notes);
    setSavedTone("safe");
    setSavedNote("保存済みの手順書を開きました。");
  }
  function deleteSaved(id: string) {
    if (typeof window !== "undefined" && !window.confirm("この手順書を削除します。よろしいですか？")) return;
    setList(deleteProcedure(id));
  }

  return (
    <div className="space-y-6">
      {/* 結論カード（柱0）: KY用紙と同じ「記入のこりN（青）→ 記入完了（緑）」。
          A4印刷帳票（正式書式）には載せない。SSR初期値の偽表示防止に当日確定後のみ描画 */}
      {date !== "" && (
        <ConclusionCard {...procedureConclusion(remaining)} className="print:hidden" />
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="作業名"><Inp value={title} onChange={setTitle} placeholder="例: 移動式クレーンによる鉄骨建方" /></Field></div>
          <Field label="現場名"><Inp value={site} onChange={setSite} placeholder="例: ○○新築工事" /></Field>
          <Field label="作成者"><Inp value={author} onChange={setAuthor} placeholder="例: 職長 山田" /></Field>
          <Field label="作成日"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
          <Field label="使用する機械・工具"><Inp value={equipment} onChange={setEquipment} placeholder="例: 25tラフター、玉掛用具" /></Field>
          <div className="sm:col-span-2"><Field label="必要な資格・特別教育"><Inp value={qualifications} onChange={setQualifications} placeholder="例: 移動式クレーン運転士、玉掛技能講習" /></Field></div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">作業手順（手順 × 危険・急所 × 対策）</h2>
          <button type="button" onClick={addStep} className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-blue-300 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 print:hidden">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> 手順を追加
          </button>
        </div>
        <div className="space-y-2">
          {steps.map((s, idx) => (
            <div key={s.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-start gap-2">
                <span className="mt-2 shrink-0 text-sm font-bold text-slate-400">{idx + 1}</span>
                <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
                  <textarea value={s.step} onChange={(e) => updateStep(s.id, { step: e.target.value })} rows={2} placeholder="作業手順" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                  <textarea value={s.hazard} onChange={(e) => updateStep(s.id, { hazard: e.target.value })} rows={2} placeholder="危険・急所" className="rounded-md border border-rose-200 bg-rose-50/40 px-2 py-1.5 text-sm" />
                  <textarea value={s.measure} onChange={(e) => updateStep(s.id, { measure: e.target.value })} rows={2} placeholder="対策" className="rounded-md border border-emerald-200 bg-emerald-50/40 px-2 py-1.5 text-sm" />
                </div>
                <button type="button" onClick={() => removeStep(s.id)} className="mt-1 flex min-h-[44px] shrink-0 items-center rounded p-1 text-rose-500 hover:bg-rose-50 print:hidden" aria-label={`手順${idx + 1}を削除`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <Field label="その他・注意事項"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" placeholder="例: 強風時（10分間平均10m/s以上）は作業中止" /></Field>
        </div>

        <p className="mt-3 text-[11px] leading-5 text-slate-500">
          作業手順書は雇入れ時等教育（安衛則35条の「作業手順に関すること」）やKY・新規入場者教育の土台となる基本文書です。実際の手順は現場・機械・取扱説明書に応じて作成し、関係者へ周知してください。
        </p>

        <div className="mt-4 flex flex-wrap gap-2 print:hidden">
          <button type="button" onClick={handleSave} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 min-h-[44px] px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"><Save className="h-3.5 w-3.5" aria-hidden="true" /> この端末に保存</button>
          <button type="button" onClick={handlePrint} className="inline-flex items-center gap-1 rounded-lg bg-slate-700 min-h-[44px] px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"><Printer className="h-3.5 w-3.5" aria-hidden="true" /> 手順書を印刷</button>
          <button type="button" onClick={handleCsv} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 min-h-[44px] px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"><Download className="h-3.5 w-3.5" aria-hidden="true" /> CSV出力</button>
          <button type="button" onClick={handleNew} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 min-h-[44px] px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"><FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" /> 新規</button>
          {savedNote && <span role="status" className={`self-center text-xs font-semibold ${SAFETY_TONE[savedTone].text}`}>{savedNote}</span>}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><FolderOpen className="h-5 w-5 text-blue-600" aria-hidden="true" /> 保存した作業手順書（この端末）</h2>
        {list.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">まだ保存された手順書はありません。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {list.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{s.title || "（作業名なし）"}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{s.date}／{s.site || "現場なし"}／{s.stepCount}手順</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => openSaved(s.id)} className="min-h-[44px] rounded-lg border border-sky-300 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-50">開く</button>
                  <button type="button" onClick={() => deleteSaved(s.id)} className="min-h-[44px] rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">削除</button>
                </div>
              </li>
            ))}
          </ul>
        )}
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

function Inp({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400" />
  );
}
