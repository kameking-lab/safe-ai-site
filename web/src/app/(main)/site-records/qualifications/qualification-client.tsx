"use client";

import { useEffect, useState } from "react";
import { Printer, Download, Save, FilePlus2, FolderOpen, Plus, Trash2, Search, BadgeCheck } from "lucide-react";
import {
  getWorkerQualList,
  getWorkerQualById,
  getAllWorkerQualFull,
  saveWorkerQual,
  deleteWorkerQual,
  qualRosterToCsv,
  groupByQualification,
  filterQualGroups,
  newWorkerId,
  newQualId,
  PRESET_QUALIFICATIONS,
  type QualHeld,
  type QualGroup,
  type WorkerQual,
  type WorkerQualSummary,
} from "@/lib/site-records/qualification-store";

export function QualificationClient() {
  const [recId, setRecId] = useState("");
  const [workerName, setWorkerName] = useState("");
  const [company, setCompany] = useState("");
  const [trade, setTrade] = useState("");
  const [quals, setQuals] = useState<QualHeld[]>([]);
  const [note, setNote] = useState("");
  const [list, setList] = useState<WorkerQualSummary[]>([]);
  const [savedNote, setSavedNote] = useState("");
  const [presetPick, setPresetPick] = useState("");
  const [groups, setGroups] = useState<QualGroup[]>([]);
  const [qualQuery, setQualQuery] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初回マウントの既定値
    setRecId(newWorkerId());
    setList(getWorkerQualList());
    setGroups(groupByQualification(getAllWorkerQualFull()));
  }, []);

  // 逆引き名簿（資格→有資格者）を保存データから再計算する。保存・削除のたびに呼ぶ。
  function refreshGroups() {
    setGroups(groupByQualification(getAllWorkerQualFull()));
  }

  function addQual(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setQuals((arr) => [...arr, { id: newQualId(), name: trimmed, date: "" }]);
    setSavedNote("");
  }
  function updateQual(id: string, patch: Partial<QualHeld>) {
    setQuals((arr) => arr.map((q) => (q.id === id ? { ...q, ...patch } : q)));
    setSavedNote("");
  }
  function removeQual(id: string) {
    setQuals((arr) => arr.filter((q) => q.id !== id));
  }

  function build(): WorkerQual {
    return {
      id: recId,
      workerName: workerName.trim(),
      company: company.trim(),
      trade: trade.trim(),
      quals,
      note: note.trim(),
      savedAt: new Date().toISOString(),
    };
  }

  function handleSave() {
    if (!workerName.trim()) {
      setSavedNote("氏名を入力してください。");
      return;
    }
    setList(saveWorkerQual(build()));
    refreshGroups();
    setSavedNote("この端末に保存しました。");
  }
  function handleNew() {
    setRecId(newWorkerId());
    setWorkerName("");
    setCompany("");
    setTrade("");
    setQuals([]);
    setNote("");
    setSavedNote("");
  }
  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }
  function handleRosterCsv() {
    if (typeof window === "undefined") return;
    const all = getAllWorkerQualFull();
    if (all.length === 0) {
      setSavedNote("CSV出力する保存済みデータがありません。先に保存してください。");
      return;
    }
    const csv = qualRosterToCsv(all);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qualifications-roster.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  function openSaved(id: string) {
    const r = getWorkerQualById(id);
    if (!r) return;
    setRecId(r.id);
    setWorkerName(r.workerName);
    setCompany(r.company);
    setTrade(r.trade);
    setQuals(r.quals);
    setNote(r.note);
    setSavedNote("保存済みのデータを開きました。");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function deleteSaved(id: string) {
    if (typeof window !== "undefined" && !window.confirm("このデータを削除します。よろしいですか？")) return;
    setList(deleteWorkerQual(id));
    refreshGroups();
  }

  const visibleGroups = filterQualGroups(groups, qualQuery);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="氏名"><Inp value={workerName} onChange={setWorkerName} placeholder="例: 作業 太郎" /></Field>
          <Field label="所属"><Inp value={company} onChange={setCompany} placeholder="例: △△工業(株)" /></Field>
          <Field label="職種"><Inp value={trade} onChange={setTrade} placeholder="例: とび工" /></Field>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">保有する資格・修了した教育</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2 print:hidden">
          <select value={presetPick} onChange={(e) => setPresetPick(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">候補から選ぶ…</option>
            {PRESET_QUALIFICATIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <button type="button" onClick={() => { addQual(presetPick); setPresetPick(""); }} className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 px-2 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> 候補を追加
          </button>
          <button type="button" onClick={() => addQual("（自由入力）")} className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">
            ＋ 自由入力で追加
          </button>
        </div>
        {quals.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-6 text-center text-sm text-slate-400">候補から選ぶか自由入力で、保有資格・修了教育を追加してください。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {quals.map((q) => (
              <li key={q.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-2">
                <input type="text" value={q.name} onChange={(e) => updateQual(q.id, { name: e.target.value })} className="min-w-[12rem] flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm" autoComplete="off" />
                <label className="flex items-center gap-1 text-xs text-slate-500">取得日 <input type="date" value={q.date} onChange={(e) => updateQual(q.id, { date: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1 text-xs" /></label>
                <button type="button" onClick={() => removeQual(q.id)} className="rounded p-1 text-rose-500 hover:bg-rose-50 print:hidden" aria-label="削除"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <Field label="備考"><Inp value={note} onChange={setNote} placeholder="例: 健康診断 異常なし／免許番号 等" /></Field>
        </div>

        <p className="mt-3 text-[11px] leading-5 text-slate-500">
          危険・有害業務には特別教育（安衛則36条）・技能講習・免許が必要です。有資格者を適正に配置し、無資格者に該当作業をさせないことが重要です。必要な資格の逆引きは「必要資格・特別教育の判定」をご利用ください。
        </p>

        <div className="mt-4 flex flex-wrap gap-2 print:hidden">
          <button type="button" onClick={handleSave} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"><Save className="h-3.5 w-3.5" aria-hidden="true" /> この端末に保存</button>
          <button type="button" onClick={handlePrint} className="inline-flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"><Printer className="h-3.5 w-3.5" aria-hidden="true" /> 印刷</button>
          <button type="button" onClick={handleRosterCsv} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"><Download className="h-3.5 w-3.5" aria-hidden="true" /> 名簿CSV（全員）</button>
          <button type="button" onClick={handleNew} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"><FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" /> 新規</button>
          {savedNote && <span className="self-center text-xs font-semibold text-emerald-700">{savedNote}</span>}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><FolderOpen className="h-5 w-5 text-emerald-600" aria-hidden="true" /> 登録した作業者（この端末）</h2>
        {list.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">まだ登録がありません。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {list.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{s.workerName || "（氏名なし）"}<span className="ml-2 text-xs font-normal text-slate-500">{s.company}</span></p>
                  <p className="mt-0.5 text-xs text-slate-500">保有資格・教育 {s.qualCount} 件</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => openSaved(s.id)} className="rounded-lg border border-sky-300 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-50">開く</button>
                  <button type="button" onClick={() => deleteSaved(s.id)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">削除</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <BadgeCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" /> 資格から有資格者を探す（逆引き名簿）
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          「玉掛け作業に有資格者を充てたい」など、登録済みの作業者を資格・教育から逆引きできます。適正配置の確認にどうぞ。
        </p>
        {groups.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-6 text-center text-sm text-slate-400">
            まだ有資格者の登録がありません。上で作業者の保有資格を登録・保存すると、ここに資格別の有資格者一覧が表示されます。
          </p>
        ) : (
          <>
            <label className="mt-3 flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <input
                type="text"
                value={qualQuery}
                onChange={(e) => setQualQuery(e.target.value)}
                placeholder="資格・教育名で絞り込む（例: 玉掛け、フォークリフト）"
                autoComplete="off"
                className="w-full text-sm focus:outline-none"
              />
            </label>
            {visibleGroups.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">「{qualQuery.trim()}」に一致する資格はありません。</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {visibleGroups.map((g) => (
                  <li key={g.name} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{g.name}</h3>
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                        {g.holders.length}名
                      </span>
                    </div>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {g.holders.map((h) => (
                        <li key={`${g.name}-${h.workerId}`}>
                          <button
                            type="button"
                            onClick={() => openSaved(h.workerId)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-xs hover:border-emerald-300 hover:bg-emerald-50"
                            title="この作業者の記録を開く"
                          >
                            <span className="font-semibold text-slate-900">{h.workerName}</span>
                            {h.company && <span className="text-slate-500">{h.company}</span>}
                            {h.date && <span className="text-slate-400">取得 {h.date}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </>
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
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
  );
}
